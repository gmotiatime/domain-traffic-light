import { Redis } from "@upstash/redis";
import { createHash, randomBytes } from "crypto";
import { reportPostSchema, reportDeleteSchema } from "./schemas.mjs";
import { assertAdminAccess } from "../server/openrouter-proxy.mjs";

function normalizeHost(host) {
  let normalized = String(host || "").toLowerCase().trim();
  normalized = normalized.replace(/^https?:\/\//i, '');
  normalized = normalized.split('/')[0].split('?')[0].split('#')[0];
  normalized = normalized.replace(/:80$/, '').replace(/:443$/, '');
  if (normalized.startsWith('www.')) {
    normalized = normalized.substring(4);
  }
  return normalized;
}

function generateId(host) {
  const timestamp = Date.now();
  const random = randomBytes(4).toString("hex");
  const payload = `${host}-${timestamp}-${random}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-admin-token");
    res.setHeader("Content-Type", "application/json");
    
    const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
    const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
    const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
    const cacheHostPrefix = `${cachePrefix}:host`;
    const cacheRecordPrefix = `${cachePrefix}:record`;
    
    const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
    const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
    
    if (!redisRestUrl || !redisRestToken) {
      res.status(503).json({ error: "База данных недоступна." });
      return;
    }
    
    const redis = new Redis({
      url: redisRestUrl,
      token: redisRestToken,
    });
    
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    if (req.method !== "POST" && req.method !== "DELETE") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    async function getRecordAndKey(normalizedHost) {
      const hostKey = `${cacheHostPrefix}:${normalizedHost}`;
      const recordKeyOrData = await redis.get(hostKey);

      if (!recordKeyOrData) return null;

      let recordKeyStr = null;
      let recordObj = null;

      // Handle both host->key and host->full_object for backward compatibility during transition
      if (typeof recordKeyOrData === 'string' && !recordKeyOrData.includes('{')) {
        recordKeyStr = recordKeyOrData;
        const fullRecordKey = `${cacheRecordPrefix}:${recordKeyStr}`;
        recordObj = await redis.get(fullRecordKey);
      } else if (typeof recordKeyOrData === 'string' && recordKeyOrData.includes('{')) {
        try {
          recordObj = JSON.parse(recordKeyOrData);
        } catch(e) { /* ignore */ }
        recordKeyStr = recordObj?.key || null;
      } else {
        recordObj = recordKeyOrData;
        recordKeyStr = recordObj?.key || null;
      }

      if (!recordObj) return null;
      return { hostKey, recordKeyStr, recordObj };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE METHOD
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === "DELETE") {
      const authError = assertAdminAccess(req.headers);
      if (authError) {
        res.status(authError.status).json(authError.body);
        return;
      }

      const parsedQuery = reportDeleteSchema.safeParse(req.query || {});
      if (!parsedQuery.success) {
        res.status(400).json({
          error: "Ошибка валидации входных данных",
          details: parsedQuery.error.errors,
        });
        return;
      }

      const { host, reportId } = parsedQuery.data;

      const normalized = normalizeHost(host);
      const data = await getRecordAndKey(normalized);

      if (!data) {
        res.status(404).json({ error: "Запись для этого домена не найдена." });
        return;
      }

      const { recordKeyStr, recordObj } = data;

      if (!Array.isArray(recordObj.reports)) {
        res.status(404).json({ error: "Жалоба не найдена." });
        return;
      }

      const initialLength = recordObj.reports.length;
      recordObj.reports = recordObj.reports.filter(r => r.id !== reportId);

      if (recordObj.reports.length === initialLength) {
        res.status(404).json({ error: "Жалоба не найдена." });
        return;
      }

      recordObj.updatedAt = Date.now();

      // Ensure TTL
      const ttlSeconds = 7 * 24 * 60 * 60;
      const writes = [];

      if (recordKeyStr) {
        writes.push(redis.set(`${cacheRecordPrefix}:${recordKeyStr}`, recordObj, { ex: ttlSeconds }));
        // Just keep the pointer in hostKey
        writes.push(redis.set(`${cacheHostPrefix}:${normalized}`, recordKeyStr, { ex: ttlSeconds }));
      } else {
        // Fallback for old records
        writes.push(redis.set(`${cacheHostPrefix}:${normalized}`, recordObj, { ex: ttlSeconds }));
      }

      await Promise.all(writes);

      res.status(200).json({
        ok: true,
        message: "Жалоба успешно удалена.",
        host: normalized,
        reportsCount: recordObj.reports.length,
      });
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST METHOD
    // ═══════════════════════════════════════════════════════════════════════════
    let body;
    try {
      body = req.body || {};
    } catch (parseError) {
      res.status(400).json({ error: "Неверный формат JSON в теле запроса." });
      return;
    }

    const parsedBody = reportPostSchema.safeParse(body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: "Ошибка валидации входных данных",
        details: parsedBody.error.errors,
      });
      return;
    }

    const { host, verdict, score, reportText } = parsedBody.data;

    const normalized = normalizeHost(host);
    const data = await getRecordAndKey(normalized);

    if (!data) {
      res.status(404).json({ error: "Запись для этого домена не найдена. Сначала выполните анализ домена." });
      return;
    }

    const { recordKeyStr, recordObj } = data;
    const now = Date.now();

    if (!Array.isArray(recordObj.reports)) {
      recordObj.reports = [];
    }

    const newReport = {
      id: generateId(`report-${normalized}-${now}`),
      text: String(reportText || "").trim().slice(0, 500),
      verdict: verdict || "unknown",
      score: score || 0,
      createdAt: now,
      resolved: false
    };

    recordObj.reports.push(newReport);
    recordObj.updatedAt = now;

    // Ensure TTL
    const ttlSeconds = 7 * 24 * 60 * 60;
    const writes = [];

    if (recordKeyStr) {
      writes.push(redis.set(`${cacheRecordPrefix}:${recordKeyStr}`, recordObj, { ex: ttlSeconds }));
      // Just keep the pointer in hostKey
      writes.push(redis.set(`${cacheHostPrefix}:${normalized}`, recordKeyStr, { ex: ttlSeconds }));
    } else {
      // Fallback for old records
      writes.push(redis.set(`${cacheHostPrefix}:${normalized}`, recordObj, { ex: ttlSeconds }));
    }

    await Promise.all(writes);

    res.status(200).json({
      ok: true,
      message: "Жалоба успешно отправлена.",
      host: normalized,
      reportsCount: recordObj.reports.length,
    });
  } catch (error) {
    console.error("[API] Report handler error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Ошибка при обработке жалобы.",
        message: error.message
      });
    }
  }
}
