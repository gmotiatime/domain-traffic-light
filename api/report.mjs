import { Redis } from "@upstash/redis";
import { standardHeaders } from "../server/openrouter-proxy.mjs";
import { createHash } from "crypto";

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
  const random = Math.random().toString(36).substring(2, 10);
  const payload = `${host}-${timestamp}-${random}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export default async function handler(req, res) {
  console.log("[API] Report handler started");
  
  try {
    const headers = standardHeaders();
    console.log("[API] Headers created");

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    console.log("[API] Method check passed");
    
    // На Vercel req.body уже распарсен
    const body = req.body || {};
    console.log("[API] Body parsed:", Object.keys(body));

    const { host, verdict, score, reportText } = body;

    if (!host || !reportText) {
      console.log("[API] Missing required fields");
      res.status(400).json({ error: "Поля host и reportText обязательны." });
      return;
    }

    const normalized = normalizeHost(host);
    console.log("[API] Host normalized:", normalized);
    
    // Подключение к Redis
    const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
    const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
    
    console.log("[API] Redis config check:", { hasUrl: !!redisRestUrl, hasToken: !!redisRestToken });
    
    if (!redisRestUrl || !redisRestToken) {
      console.error("[API] Redis not configured");
      res.status(503).json({ error: "База данных недоступна." });
      return;
    }

    console.log("[API] Creating Redis client");
    const redis = new Redis({
      url: redisRestUrl,
      token: redisRestToken,
    });

    const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
    const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
    const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
    const cacheHostPrefix = `${cachePrefix}:host`;
    const hostKey = `${cacheHostPrefix}:${normalized}`;
    
    console.log("[API] Cache key:", hostKey);

    // Получаем существующую запись
    console.log("[API] Fetching record from Redis");
    let record = await redis.get(hostKey);
    console.log("[API] Record fetched:", !!record);
    
    if (!record) {
      console.log("[API] No record found");
      res.status(404).json({ error: "Запись для этого домена не найдена. Сначала выполните анализ домена." });
      return;
    }

    // Добавляем жалобу
    const now = Date.now();
    if (!Array.isArray(record.reports)) {
      record.reports = [];
    }

    const report = {
      id: generateId(`report-${normalized}-${now}`),
      text: String(reportText || "").trim().slice(0, 500),
      verdict: verdict || record.data?.aiAdjustedResult?.verdict || record.data?.enrichedLocalResult?.verdict || "unknown",
      score: score || record.data?.aiAdjustedResult?.score || record.data?.enrichedLocalResult?.score || 0,
      createdAt: now,
      resolved: false
    };

    record.reports.push(report);
    record.updatedAt = now;
    
    console.log("[API] Saving to Redis, reports count:", record.reports.length);

    // Сохраняем обратно в Redis
    await redis.set(hostKey, record);
    console.log("[API] Saved successfully");

    res.status(200).json({
      ok: true,
      message: "Жалоба успешно отправлена.",
      host: normalized,
      reportsCount: record.reports.length,
    });
  } catch (error) {
    console.error("[API] Report error:", error);
    console.error("[API] Error name:", error.name);
    console.error("[API] Error message:", error.message);
    console.error("[API] Error stack:", error.stack);
    res.status(500).json({ 
      error: "Ошибка при сохранении жалобы.",
      message: error.message
    });
  }
}
