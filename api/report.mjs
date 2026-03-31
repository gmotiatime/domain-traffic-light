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
    
    // На Vercel req.body может быть getter, который парсит JSON
    let body;
    try {
      body = req.body || {};
    } catch (parseError) {
      console.error("[API] Body parse error:", parseError.message);
      res.status(400).json({ error: "Неверный формат JSON в теле запроса." });
      return;
    }
    
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

    const now = Date.now();

    // Используем Lua скрипт для атомарного добавления жалобы (предотвращает race condition)
    console.log("[API] Adding report atomically with Lua script");
    
    const luaScript = `
      local hostKey = KEYS[1]
      local reportJson = ARGV[1]
      local now = ARGV[2]
      
      local record = redis.call('GET', hostKey)
      if not record then
        return nil
      end
      
      local recordData = cjson.decode(record)
      if not recordData.reports then
        recordData.reports = {}
      end
      
      local newReport = cjson.decode(reportJson)
      table.insert(recordData.reports, newReport)
      recordData.updatedAt = tonumber(now)
      
      redis.call('SET', hostKey, cjson.encode(recordData))
      return #recordData.reports
    `;

    const report = {
      id: generateId(`report-${normalized}-${now}`),
      text: String(reportText || "").trim().slice(0, 500),
      verdict: verdict || "unknown",
      score: score || 0,
      createdAt: now,
      resolved: false
    };

    try {
      const reportsCount = await redis.eval(
        luaScript,
        [hostKey],
        [JSON.stringify(report), now.toString()]
      );
      
      if (reportsCount === null) {
        console.log("[API] No record found");
        res.status(404).json({ error: "Запись для этого домена не найдена. Сначала выполните анализ домена." });
        return;
      }
      
      console.log("[API] Report saved atomically, total reports:", reportsCount);

      res.status(200).json({
        ok: true,
        message: "Жалоба успешно отправлена.",
        host: normalized,
        reportsCount: reportsCount,
      });
    } catch (evalError) {
      console.error("[API] Lua script error:", evalError);
      // Fallback к старому методу если Lua не поддерживается
      console.log("[API] Falling back to non-atomic method");
      
      let record = await redis.get(hostKey);
      
      if (!record) {
        console.log("[API] No record found");
        res.status(404).json({ error: "Запись для этого домена не найдена. Сначала выполните анализ домена." });
        return;
      }

      if (!Array.isArray(record.reports)) {
        record.reports = [];
      }

      record.reports.push(report);
      record.updatedAt = now;
      
      console.log("[API] Saving to Redis, reports count:", record.reports.length);
      await redis.set(hostKey, record);
      console.log("[API] Saved successfully");

      res.status(200).json({
        ok: true,
        message: "Жалоба успешно отправлена.",
        host: normalized,
        reportsCount: record.reports.length,
      });
    }
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
