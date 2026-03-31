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
  console.log("[API] Request method:", req.method);
  console.log("[API] Request URL:", req.url);
  
  try {
    // Устанавливаем заголовки в самом начале
    try {
      const headers = standardHeaders();
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      console.log("[API] Headers set successfully");
    } catch (headerError) {
      console.error("[API] Error setting headers:", headerError.message);
    }
    
    // Определяем переменные в начале для доступа во всех блоках
    const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
    const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
    const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
    const cacheHostPrefix = `${cachePrefix}:host`;
    
    console.log("[API] Cache prefix:", cachePrefix);
    
    // Подключение к Redis (вынесено из try для доступа в catch)
    const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
    const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
    
    console.log("[API] Redis configured:", { hasUrl: !!redisRestUrl, hasToken: !!redisRestToken });
    
    if (!redisRestUrl || !redisRestToken) {
      console.error("[API] Redis not configured");
      res.status(503).json({ error: "База данных недоступна." });
      return;
    }
    
    const redis = new Redis({
      url: redisRestUrl,
      token: redisRestToken,
    });
    
    console.log("[API] Redis client created");
  
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    if (req.method !== "POST" && req.method !== "DELETE") {
      res.status(405).json({ error: "Method Not Allowed" });
      return;
    }

    console.log("[API] Method check passed");

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE METHOD - Удаление жалобы
    // ═══════════════════════════════════════════════════════════════════════════
    if (req.method === "DELETE") {
      const host = String(req.query?.host || "").trim();
      const reportId = String(req.query?.reportId || "").trim();

      if (!host || !reportId) {
        console.log("[API] Missing required query params");
        res.status(400).json({ error: "Параметры host и reportId обязательны." });
        return;
      }

      const normalized = normalizeHost(host);
      const hostKey = `${cacheHostPrefix}:${normalized}`;
      
      console.log("[API] Deleting report:", { host: normalized, reportId });

      // Lua скрипт для атомарного удаления жалобы из обоих ключей
      const luaDeleteScript = `
        local hostKey = KEYS[1]
        local recordKey = KEYS[2]
        local reportId = ARGV[1]
        local now = ARGV[2]
        
        local record = redis.call('GET', hostKey)
        if not record then
          return nil
        end
        
        local recordData = cjson.decode(record)
        if not recordData.reports or #recordData.reports == 0 then
          return 0
        end
        
        local newReports = {}
        local deleted = false
        for i, report in ipairs(recordData.reports) do
          if report.id ~= reportId then
            table.insert(newReports, report)
          else
            deleted = true
          end
        end
        
        if not deleted then
          return -1
        end
        
        recordData.reports = newReports
        recordData.updatedAt = tonumber(now)
        
        -- Обновляем оба ключа
        redis.call('SET', hostKey, cjson.encode(recordData))
        if recordKey ~= "" then
          redis.call('SET', recordKey, cjson.encode(recordData))
        end
        
        return #newReports
      `;

      try {
        const now = Date.now();
        
        // Получаем record key из host записи
        const hostRecord = await redis.get(hostKey);
        const recordKey = hostRecord?.key ? `${cachePrefix}:record:${hostRecord.key}` : "";
        
        const result = await redis.eval(
          luaDeleteScript,
          [hostKey, recordKey],
          [reportId, now.toString()]
        );
        
        if (result === null) {
          console.log("[API] No record found");
          res.status(404).json({ error: "Запись для этого домена не найдена." });
          return;
        }
        
        if (result === -1) {
          console.log("[API] Report not found");
          res.status(404).json({ error: "Жалоба не найдена." });
          return;
        }
        
        console.log("[API] Report deleted, remaining reports:", result);

        res.status(200).json({
          ok: true,
          message: "Жалоба успешно удалена.",
          host: normalized,
          reportsCount: result,
        });
      } catch (evalError) {
        console.error("[API] Lua script error:", evalError);
        // Fallback к старому методу
        console.log("[API] Falling back to non-atomic method");
        
        let record = await redis.get(hostKey);
        
        if (!record) {
          console.log("[API] No record found");
          res.status(404).json({ error: "Запись для этого домена не найдена." });
          return;
        }

        if (!Array.isArray(record.reports)) {
          record.reports = [];
        }

        const reportIndex = record.reports.findIndex(r => r.id === reportId);
        if (reportIndex === -1) {
          console.log("[API] Report not found");
          res.status(404).json({ error: "Жалоба не найдена." });
          return;
        }

        record.reports.splice(reportIndex, 1);
        record.updatedAt = Date.now();
        
        console.log("[API] Saving to Redis, reports count:", record.reports.length);
        
        // Обновляем оба ключа
        await redis.set(hostKey, record);
        
        if (record.key) {
          const recordKey = `${cachePrefix}:record:${record.key}`;
          await redis.set(recordKey, record);
        }
        
        console.log("[API] Deleted successfully");

        res.status(200).json({
          ok: true,
          message: "Жалоба успешно удалена.",
          host: normalized,
          reportsCount: record.reports.length,
        });
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // POST METHOD - Добавление жалобы
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    const hostKey = `${cacheHostPrefix}:${normalized}`;
    
    console.log("[API] Host normalized:", normalized);
    console.log("[API] Cache key:", hostKey);

    const now = Date.now();

    // Используем Lua скрипт для атомарного добавления жалобы в оба ключа
    console.log("[API] Adding report atomically with Lua script");
    
    const luaScript = `
      local hostKey = KEYS[1]
      local recordKey = KEYS[2]
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
      
      -- Обновляем оба ключа
      redis.call('SET', hostKey, cjson.encode(recordData))
      if recordKey ~= "" then
        redis.call('SET', recordKey, cjson.encode(recordData))
      end
      
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
      // Получаем record key из host записи
      const hostRecord = await redis.get(hostKey);
      const recordKey = hostRecord?.key ? `${cachePrefix}:record:${hostRecord.key}` : "";
      
      const reportsCount = await redis.eval(
        luaScript,
        [hostKey, recordKey],
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
      
      // Обновляем оба ключа
      await redis.set(hostKey, record);
      
      if (record.key) {
        const recordKey = `${cachePrefix}:record:${record.key}`;
        await redis.set(recordKey, record);
      }
      
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
    
    // Добавляем детали запроса для отладки
    console.error("[API] Request method:", req.method);
    console.error("[API] Request body:", JSON.stringify(req.body));
    console.error("[API] Request query:", JSON.stringify(req.query));
    
    res.status(500).json({ 
      error: "Ошибка при обработке жалобы.",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
