import fs from "node:fs";
import path from "node:path";
import dns from "node:dns/promises";
import tls from "node:tls";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const indexFile = path.join(distDir, "index.html");
const envLocalFile = path.join(rootDir, ".env.local");
const envFile = path.join(rootDir, ".env");

import dotenv from "dotenv";
import express from "express";
import { Redis } from "@upstash/redis";

dotenv.config({ path: envLocalFile });
dotenv.config({ path: envFile });

const corsOrigin = process.env.CORS_ORIGIN || "*";
const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Rate Limiter (простой in-memory) ────────────────────────────────────────
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 30;
const rateBuckets = new Map();

function consumeRateLimit(key) {
  const now = Date.now();
  const normalizedKey = key || "unknown";
  let bucket = rateBuckets.get(normalizedKey);

  if (!bucket || now - bucket.windowStart > rateLimitWindowMs) {
    bucket = { windowStart: now, count: 0 };
    rateBuckets.set(normalizedKey, bucket);
  }

  bucket.count += 1;

  if (bucket.count > rateLimitMax) {
    return {
      error: "Слишком много запросов. Подождите минуту.",
      retryAfterMs: rateLimitWindowMs - (now - bucket.windowStart),
    };
  }

  return null;
}

function rateLimit(req, res, next) {
  const limited = consumeRateLimit(req.ip || req.connection.remoteAddress || "unknown");
  if (limited) {
    res.status(429).json(limited);
    return;
  }
  next();
}

// Периодическая очистка старых записей rate limiter
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart > rateLimitWindowMs * 2) {
      rateBuckets.delete(key);
    }
  }
}, rateLimitWindowMs * 3);

// ─── Кэш ответов AI (Redis only) ────────────────────────────────────────────
const cacheEnabled = process.env.CACHE_ENABLED !== "false";
const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
const cacheRecordPrefix = `${cachePrefix}:record`;
const cacheHostPrefix = `${cachePrefix}:host`;
const cacheIndexKey = `${cachePrefix}:keys`;
const cacheStatsKey = `${cachePrefix}:stats`;
const legacyCachePrefixes = String(
  process.env.THREAT_CACHE_LEGACY_PREFIXES || "threat-cache:v7,threat-cache:v6",
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .filter((value) => value !== cachePrefix);
const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const redisRestToken =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const hasRedisCache = Boolean(cacheEnabled && redisRestUrl && redisRestToken);
const cacheStorage = hasRedisCache ? "redis" : "memory";
const adminToken = process.env.ADMIN_TOKEN || "";
const responseCache = new Map();
const redisCache = hasRedisCache
  ? new Redis({
      url: redisRestUrl,
      token: redisRestToken,
    })
  : null;

if (hasRedisCache) {
  console.log("[threat-db] Using Redis cache.");
} else {
  console.log("[threat-db] Using memory cache only (Redis not configured).");
}
const openPhishFeedUrl =
  process.env.OPENPHISH_FEED_URL ||
  "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
const openPhishRefreshMs =
  Number(process.env.OPENPHISH_REFRESH_MS) || 30 * 60_000;
const urlAbuseApiUrl =
  process.env.URLABUSE_API_URL || "https://urlabuse.com/get_record_by_rowid";
const urlAbuseEmail = process.env.URLABUSE_EMAIL || "";
const urlAbuseToken = process.env.URLABUSE_TOKEN || "";
const urlAbuseAcl = process.env.URLABUSE_ACL || "ALL";
const urlAbuseRefreshMs = Number(process.env.URLABUSE_REFRESH_MS) || 5 * 60_000;
const urlAbuseMaxPages = Number(process.env.URLABUSE_MAX_PAGES) || 1;
const networkSignalTimeoutMs =
  Number(process.env.NETWORK_SIGNAL_TIMEOUT_MS) || 3_000;

const openPhishState = {
  urls: new Set(),
  hosts: new Map(),
  fetchedAt: 0,
  loadingPromise: null,
  lastError: null,
};
const urlAbuseState = {
  urls: new Set(),
  hosts: new Map(),
  fetchedAt: 0,
  loadingPromise: null,
  lastError: null,
  lastRowId: 0,
};

function sanitizeCacheInput(input, normalized) {
  if (normalized?.url instanceof URL) {
    const url = new URL(normalized.url.toString());
    url.username = "";
    url.password = "";
    url.pathname = "/"; // Убираем путь - кэш только по домену
    url.search = "";
    url.hash = "";

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    // Убираем www. для единообразия
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
      url.hostname = hostname;
    }

    return url.toString().toLowerCase();
  }

  return String(input || "").trim().toLowerCase();
}

function getCacheKey(input, localAnalysis, normalized) {
  const payload = JSON.stringify({
    version: cacheVersion,
    input: sanitizeCacheInput(input, normalized),
    verdict: localAnalysis?.verdict,
    score: localAnalysis?.score,
    summary: String(localAnalysis?.summary || "").trim().slice(0, 180),
    reasons: Array.isArray(localAnalysis?.reasons)
      ? localAnalysis.reasons
          .slice(0, 4)
          .map((reason) => [reason.title, reason.scoreDelta, reason.tone])
      : [],
    actions: Array.isArray(localAnalysis?.actions)
      ? localAnalysis.actions.slice(0, 3)
      : [],
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function getCacheRecordKey(key) {
  return `${cacheRecordPrefix}:${key}`;
}

function getCacheHostKey(host) {
  return `${cacheHostPrefix}:${String(host || "unknown").toLowerCase()}`;
}

function getCacheRecordKeyForPrefix(prefix, key) {
  return `${prefix}:record:${key}`;
}

function getCacheHostKeyForPrefix(prefix, host) {
  return `${prefix}:host:${String(host || "unknown").toLowerCase()}`;
}

function buildCacheRecord(key, data, existingRecord = null) {
  const host =
    data?.aiAdjustedResult?.host ||
    data?.enrichedLocalResult?.host ||
    data?.analysis?.host ||
    null;

  const now = Date.now();
  
  // Извлекаем финальный результат для новой структуры
  const result = data?.aiAdjustedResult || data?.enrichedLocalResult || data?.analysis;
  
  return {
    key,
    host,
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
    data,
    // Дополнительные поля для новой БД
    verdict: result?.verdict || "low",
    score: Number(result?.score) || 0,
    summary: result?.summary || "",
    reasons: result?.reasons || [],
    actions: result?.actions || [],
    breakdown: result?.breakdown || {},
    signals: {
      threat: data?.threatIntel || null,
      urlAbuse: data?.urlAbuseIntel || null,
      network: data?.networkSignals || null,
      ai: {
        model: data?.model || null,
        source: data?.source || null,
        latencyMs: data?.latencyMs || null
      }
    }
  };
}

async function getCachedResponse(key, normalized = null) {
  if (!cacheEnabled) return null;
  
  // Retry helper для надежности
  async function retryOperation(operation, maxRetries = 3, delayMs = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`[Cache] Attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  // Попытка загрузки из Redis
  if (redisCache) {
    try {
      const entry = await retryOperation(async () => {
        let result = await redisCache.get(getCacheRecordKey(key));
        if (!result?.data) {
          for (const prefix of legacyCachePrefixes) {
            result = await redisCache.get(getCacheRecordKeyForPrefix(prefix, key));
            if (result?.data) {
              console.log(`[Cache] Found in legacy prefix: ${prefix}`);
              break;
            }
          }
        }
        return result;
      });
      
      if (entry?.data) {
        console.log(`[Cache] Redis hit for key: ${key}`);
        return {
          ...entry.data,
          cached: true,
          cacheStorage,
          cachedAt: entry.createdAt || null,
        };
      }
      console.log(`[Cache] Redis miss for key: ${key}`);
    } catch (error) {
      console.error(`[Cache] Redis error, falling back to memory:`, error.message);
    }
  }

  // Fallback на responseCache (memory)
  try {
    const entry = responseCache.get(key);
    if (entry) {
      console.log(`[Cache] Memory hit for key: ${key}`);
      return {
        ...entry.data,
        cached: true,
        cacheStorage: 'memory',
        cachedAt: entry.createdAt || null,
      };
    }
    console.log(`[Cache] Memory miss for key: ${key}`);
  } catch (error) {
    console.error(`[Cache] Memory cache error:`, error.message);
  }
  
  return null;
}

async function setCachedResponse(key, data, telemetryConsent = false) {
  if (!cacheEnabled || !telemetryConsent) return;
  
  let host = data?.aiAdjustedResult?.host || data?.enrichedLocalResult?.host || data?.analysis?.host;
  if (!host) {
    console.warn('[Cache] Cannot save: no host found in data');
    return;
  }
  
  // Нормализуем host: убираем www.
  if (host.startsWith('www.')) {
    host = host.substring(4);
  }
  
  // Retry helper для надежности записи
  async function retryWrite(operation, maxRetries = 3, delayMs = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`[Cache] Write attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  // Проверяем, есть ли уже запись для этого хоста
  let existingRecord = null;
  try {
    if (redisCache) {
      existingRecord = await retryWrite(() => redisCache.get(getCacheHostKey(host)));
    } else {
      for (const [existingKey, record] of responseCache.entries()) {
        if (record?.host === host) {
          existingRecord = record;
          break;
        }
      }
    }
  } catch (error) {
    console.error('[Cache] Error checking existing record:', error.message);
  }
  
  const record = buildCacheRecord(key, data, existingRecord);
  record.host = host;

  // Сохранение в Redis
  if (redisCache) {
    try {
      await retryWrite(async () => {
        const ttlSeconds = 7 * 24 * 60 * 60; // 7 дней
        
        // Используем оптимизированную структуру:
        // 1. Полная запись по key с TTL
        // 2. Индекс host -> key (вместо дублирования полной записи)
        
        const writes = [
          // Сохраняем полную запись с TTL
          redisCache.set(getCacheRecordKey(key), record, { ex: ttlSeconds }),
          // Добавляем в индекс
          redisCache.sadd(cacheIndexKey, getCacheRecordKey(key)),
        ];

        if (record.host) {
          // Сохраняем только ссылку на key, а не полную запись (экономим память)
          writes.push(redisCache.set(getCacheHostKey(record.host), key, { ex: ttlSeconds }));
        }

        // Update stats hash atomically
        const verdict = record.verdict || data?.aiAdjustedResult?.verdict || data?.analysis?.verdict || 'low';
        writes.push(
          redisCache.hincrby(cacheStatsKey, 'total', 1),
          redisCache.hincrby(cacheStatsKey, `verdict:${verdict}`, 1),
          redisCache.hset(cacheStatsKey, { newestRecord: String(record.updatedAt || Date.now()) }),
        );

        await Promise.all(writes);
      });
      console.log(`[Cache] Saved to Redis: ${host} (with TTL)`);
      return;
    } catch (error) {
      console.error(`[Cache] Redis save failed, falling back to memory:`, error.message);
    }
  }

  // Fallback: сохранение в memory cache
  try {
    // Удалить все старые записи для этого хоста
    if (record.host) {
      const keysToDelete = [];
      for (const [existingKey, existingRecord] of responseCache.entries()) {
        if (existingRecord?.host === record.host && existingKey !== key) {
          keysToDelete.push(existingKey);
        }
      }
      for (const keyToDelete of keysToDelete) {
        responseCache.delete(keyToDelete);
      }
    }

    responseCache.set(key, record);
    console.log(`[Cache] Saved to memory: ${host}`);
  } catch (error) {
    console.error(`[Cache] Memory save failed:`, error.message);
  }
}

function getAdminTokenFromHeaders(headers = {}) {
  const direct = headers["x-admin-token"] || headers["X-Admin-Token"];
  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  if (Array.isArray(direct) && typeof direct[0] === "string" && direct[0].trim()) {
    return direct[0].trim();
  }

  const auth = headers.authorization || headers.Authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }

  return "";
}

function assertAdminAccess(headers = {}) {
  if (!adminToken) {
    return {
      status: 503,
      body: { error: "ADMIN_TOKEN не настроен." },
    };
  }

  const providedToken = getAdminTokenFromHeaders(headers);
  if (!providedToken || providedToken !== adminToken) {
    return {
      status: 401,
      body: { error: "Недостаточно прав." },
    };
  }

  return null;
}

function normalizeCacheHostInput(input) {
  const normalized = normalizeInput(String(input || "").trim());
  if ("error" in normalized) {
    return normalized;
  }

  // Убираем www. для единообразия
  let host = normalized.host;
  if (host.startsWith('www.')) {
    host = host.substring(4);
  }

  return { host };
}

function serializeAdminEntry(record) {
  if (!record?.data) return null;

  const current =
    record.data.aiAdjustedResult ||
    record.data.enrichedLocalResult ||
    record.data.analysis ||
    null;

  return {
    key: record.key || null,
    host: record.host || current?.host || null,
    createdAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    model: record.data.model || null,
    moderated: Boolean(record.data?.moderation?.moderated),
    moderation: record.data?.moderation || null,
    data: record.data,
    reports: record.reports || [],
    preview: current
      ? {
          verdict: current.verdict || null,
          score: Number.isFinite(Number(current.score)) ? Number(current.score) : null,
          summary: current.summary || "",
        }
      : null,
  };
}

async function getRawCacheRecordByHost(hostInput) {
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) {
    console.warn(`[Cache] Invalid host input: ${hostInput}`);
    return null;
  }

  // Retry helper для надежности
  async function retryOperation(operation, maxRetries = 2, delayMs = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.error(`[Cache] getRawCacheRecordByHost attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  // Попытка загрузки из Redis
  if (redisCache) {
    try {
      // Теперь host -> key (ссылка), а не host -> record (полная запись)
      const recordKey = await retryOperation(async () => {
        let key = await redisCache.get(getCacheHostKey(normalized.host));
        if (!key) {
          // Проверяем legacy префиксы
          for (const prefix of legacyCachePrefixes) {
            key = await redisCache.get(getCacheHostKeyForPrefix(prefix, normalized.host));
            if (key) {
              console.log(`[Cache] Found host in legacy prefix: ${prefix}`);
              break;
            }
          }
        }
        return key;
      });
      
      if (recordKey) {
        // Получаем полную запись по ключу
        const record = await retryOperation(() => 
          redisCache.get(typeof recordKey === 'string' ? getCacheRecordKey(recordKey) : getCacheHostKey(normalized.host))
        );
        
        if (record?.data) {
          console.log(`[Cache] Redis hit for host: ${normalized.host}`);
          return record;
        }
      }
      console.log(`[Cache] Redis miss for host: ${normalized.host}`);
    } catch (error) {
      console.error(`[Cache] Redis error in getRawCacheRecordByHost, falling back to memory:`, error.message);
    }
  }

  // Fallback: поиск в memory cache
  try {
    let matchingRecords = [];
    for (const record of responseCache.values()) {
      if (record?.host === normalized.host) {
        matchingRecords.push(record);
      }
    }

    if (matchingRecords.length === 0) {
      console.log(`[Cache] Memory miss for host: ${normalized.host}`);
      return null;
    }

    // Вернуть запись с максимальным updatedAt или createdAt
    const latest = matchingRecords.reduce((latest, current) => {
      const latestTime = Number(latest?.updatedAt || latest?.createdAt || 0);
      const currentTime = Number(current?.updatedAt || current?.createdAt || 0);
      return currentTime > latestTime ? current : latest;
    });
    
    console.log(`[Cache] Memory hit for host: ${normalized.host}`);
    return latest;
  } catch (error) {
    console.error(`[Cache] Memory cache error in getRawCacheRecordByHost:`, error.message);
    return null;
  }
}

async function saveRawCacheRecord(record) {
  if (!record?.key) return;

  const normalizedHost = record.host || record?.data?.aiAdjustedResult?.host || record?.data?.analysis?.host;
  const nextRecord = {
    ...record,
    host: normalizedHost || record.host || null,
    updatedAt: Date.now(),
  };

  if (redisCache) {
    // Для Redis: удалить старую запись для этого хоста, если она есть
    if (nextRecord.host) {
      const oldRecord = await redisCache.get(getCacheHostKey(nextRecord.host));
      if (oldRecord?.key && oldRecord.key !== nextRecord.key) {
        // Удалить старую запись из индекса и по ключу
        await Promise.all([
          redisCache.del(getCacheRecordKey(oldRecord.key)),
          redisCache.srem(cacheIndexKey, getCacheRecordKey(oldRecord.key)),
        ]);
      }
    }

    const writes = [
      redisCache.set(getCacheRecordKey(nextRecord.key), nextRecord),
      redisCache.sadd(cacheIndexKey, getCacheRecordKey(nextRecord.key)),
    ];

    if (nextRecord.host) {
      writes.push(redisCache.set(getCacheHostKey(nextRecord.host), nextRecord.key));
    }

    // Update stats atomically
    const verdict = nextRecord.data?.aiAdjustedResult?.verdict || nextRecord.data?.enrichedLocalResult?.verdict || nextRecord.data?.analysis?.verdict || 'low';
    writes.push(
      redisCache.hincrby(cacheStatsKey, 'total', 1),
      redisCache.hincrby(cacheStatsKey, `verdict:${verdict}`, 1),
      redisCache.hset(cacheStatsKey, { newestRecord: String(nextRecord.updatedAt || Date.now()) }),
    );

    await Promise.all(writes);
    return nextRecord;
  }

  // Для локального кэша: удалить все старые записи для этого хоста
  if (nextRecord.host) {
    const keysToDelete = [];
    for (const [key, existingRecord] of responseCache.entries()) {
      if (existingRecord?.host === nextRecord.host && key !== nextRecord.key) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      responseCache.delete(key);
    }
  }

  responseCache.set(nextRecord.key, nextRecord);
  return nextRecord;
}

async function deleteRawCacheRecordByHost(hostInput) {
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) return false;

  if (redisCache) {
    const hostKey = getCacheHostKey(normalized.host);
    const record = await redisCache.get(hostKey);
    if (!record) return false;

    // Handle both cases: record can be a string (key) or an object with a key property
    const recordKey = typeof record === 'string' ? record : record.key;
    if (!recordKey) return false;

    await Promise.all([
      redisCache.del(hostKey),
      redisCache.del(getCacheRecordKey(recordKey)),
      redisCache.srem(cacheIndexKey, getCacheRecordKey(recordKey)),
    ]);
    return true;
  }

  // Для локального кэша: удалить ВСЕ записи для этого хоста
  let deleted = false;
  const keysToDelete = [];
  for (const [key, record] of responseCache.entries()) {
    if (record?.host === normalized.host) {
      keysToDelete.push(key);
      deleted = true;
    }
  }

  for (const key of keysToDelete) {
    responseCache.delete(key);
  }

  return deleted;
}

async function listRecentCacheEntries(limit = 20) {
  let records = [];

  if (redisCache) {
    try {
      const keys = await redisCache.smembers(cacheIndexKey);
      const keyList = (Array.isArray(keys) ? keys : []).slice(0, 200);
      
      if (keyList.length > 0) {
        // Используем MGET для массового получения (намного быстрее чем Promise.all с GET)
        console.log(`[Cache] Fetching ${keyList.length} records with MGET`);
        const values = await redisCache.mget(...keyList);
        records = values.filter(v => v !== null && v?.data);
      }
    } catch (error) {
      console.error('[Cache] Error in listRecentCacheEntries:', error.message);
      records = [];
    }
  } else {
    records = [...responseCache.values()];
  }

  return records
    .filter((record) => record?.data)
    .sort((left, right) => {
      const rightTime = Number(right?.updatedAt || right?.createdAt || 0);
      const leftTime = Number(left?.updatedAt || left?.createdAt || 0);
      return rightTime - leftTime;
    })
    .slice(0, limit)
    .map(serializeAdminEntry)
    .filter(Boolean);
}

function normalizeThreatUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || "").trim());
    url.hash = "";

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    if (!url.pathname) {
      url.pathname = "/";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function sortReasons(reasons) {
  const toneOrder = { critical: 0, warning: 1, positive: 2 };
  return [...reasons].sort((left, right) => {
    const byTone = toneOrder[left.tone] - toneOrder[right.tone];
    if (byTone !== 0) return byTone;
    return Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta);
  });
}

function sameRegistrableDomain(hostA, hostB) {
  const left = buildBreakdown(String(hostA || "").toLowerCase()).registrableDomain;
  const right = buildBreakdown(String(hostB || "").toLowerCase()).registrableDomain;
  return Boolean(left && right && left === right);
}

function isBenignSameSiteRedirect(sourceHost, redirectHost) {
  const source = String(sourceHost || "").toLowerCase();
  const target = String(redirectHost || "").toLowerCase();
  if (!source || !target) return false;
  if (source === target) return true;
  if (!sameRegistrableDomain(source, target)) return false;

  const sourceBreakdown = buildBreakdown(source);
  const targetBreakdown = buildBreakdown(target);

  const sourceIsApex = !sourceBreakdown.subdomain;
  const targetIsApex = !targetBreakdown.subdomain;

  if (sourceIsApex && target === `www.${source}`) return true;
  if (targetIsApex && source === `www.${target}`) return true;

  return sourceIsApex !== targetIsApex;
}

function matchesTlsSubject(host, subject) {
  const normalizedHost = String(host || "").toLowerCase();
  const normalizedSubject = String(subject || "").toLowerCase().trim();
  if (!normalizedHost || !normalizedSubject) return false;
  if (normalizedHost === normalizedSubject) return true;

  // Wildcard сертификат (*.example.com)
  if (normalizedSubject.startsWith("*.")) {
    const wildcardBase = normalizedSubject.slice(2);

    if (normalizedHost.endsWith(`.${wildcardBase}`)) {
      return true;
    }

    if (
      sameRegistrableDomain(normalizedHost, wildcardBase) &&
      (normalizedHost === wildcardBase || normalizedHost === `www.${wildcardBase}`)
    ) {
      return true;
    }
  }

  // Apex домен запрошен, но сертификат выдан на www поддомен (нормальная практика)
  // Например: запрос к linkedin.com, сертификат на www.linkedin.com
  if (normalizedSubject.startsWith("www.")) {
    const apexDomain = normalizedSubject.slice(4); // убираем "www."
    if (normalizedHost === apexDomain) {
      return true; // это нормально - apex редиректит на www
    }
  }

  // Обратная ситуация: запрос к www, сертификат на apex
  if (normalizedHost.startsWith("www.")) {
    const apexDomain = normalizedHost.slice(4);
    if (normalizedSubject === apexDomain) {
      return true;
    }
  }

  return false;
}

function isBenignNetworkReason(reason, normalized) {
  const title = String(reason?.title || "").toLowerCase();
  const detail = String(reason?.detail || "").toLowerCase();
  const host = String(normalized?.host || "").toLowerCase();

  if (/redirect|редирект|перенаправ/.test(title + " " + detail)) {
    const wwwHost = `www.${host}`;
    if (
      detail.includes(wwwHost) &&
      detail.includes("нормаль")
    ) {
      return true;
    }
  }

  if (/tls|https|сертификат/.test(title + " " + detail)) {
    const registrableDomain = buildBreakdown(host).registrableDomain.toLowerCase();
    if (
      detail.includes(`*.${registrableDomain}`) &&
      (/соответств|не вызывает подозр|нормаль/.test(detail) || matchesTlsSubject(host, `*.${registrableDomain}`))
    ) {
      return true;
    }
  }

  return false;
}

async function refreshOpenPhishFeed() {
  if (
    openPhishState.loadingPromise &&
    Date.now() - openPhishState.fetchedAt < openPhishRefreshMs
  ) {
    return openPhishState.loadingPromise;
  }

  openPhishState.loadingPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch(openPhishFeedUrl, {
        headers: {
          "User-Agent": "domain-traffic-light/1.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenPhish HTTP ${response.status}`);
      }

      const text = await response.text();
      const tokens = text
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);

      const urls = new Set();
      const hosts = new Map();

      for (const token of tokens) {
        const normalizedUrl = normalizeThreatUrl(token);
        if (!normalizedUrl) continue;

        urls.add(normalizedUrl);

        try {
          const host = new URL(normalizedUrl).hostname.toLowerCase();
          hosts.set(host, (hosts.get(host) || 0) + 1);
        } catch {
          // ignore malformed feed item
        }
      }

      openPhishState.urls = urls;
      openPhishState.hosts = hosts;
      openPhishState.fetchedAt = Date.now();
      openPhishState.lastError = null;

      log("info", "OpenPhish feed refreshed", {
        urls: urls.size,
        hosts: hosts.size,
      });
    } catch (error) {
      openPhishState.lastError =
        error instanceof Error ? error.message : "OpenPhish refresh failed.";
      log("warn", "OpenPhish feed refresh failed", {
        error: openPhishState.lastError,
      });
    } finally {
      clearTimeout(timeoutId);
      const finishedPromise = openPhishState.loadingPromise;
      setTimeout(() => {
        if (openPhishState.loadingPromise === finishedPromise) {
          openPhishState.loadingPromise = null;
        }
      }, 0);
    }
  })();

  return openPhishState.loadingPromise;
}

async function ensureOpenPhishFeed() {
  const isFresh =
    openPhishState.fetchedAt > 0 &&
    Date.now() - openPhishState.fetchedAt < openPhishRefreshMs &&
    openPhishState.urls.size > 0;

  if (isFresh) {
    return;
  }

  await refreshOpenPhishFeed();
}

async function lookupThreatIntel(normalized) {
  await ensureOpenPhishFeed();

  if (openPhishState.urls.size === 0) {
    return {
      source: "openphish",
      status: "unavailable",
      note: openPhishState.lastError
        ? `OpenPhish недоступен: ${sanitizeString(openPhishState.lastError, 120)}`
        : "OpenPhish временно недоступен.",
      checkedAt: new Date().toISOString(),
    };
  }

  const exactUrl = normalizeThreatUrl(normalized.url.toString());
  const rootUrl = normalizeThreatUrl(`${normalized.url.protocol}//${normalized.host}/`);
  const host = normalized.host.toLowerCase();
  const exactMatch = openPhishState.urls.has(exactUrl);
  const rootMatch = openPhishState.urls.has(rootUrl);
  const hostMatches = openPhishState.hosts.get(host) || 0;

  if (exactMatch || rootMatch) {
    return {
      source: "openphish",
      status: "hit",
      matchType: exactMatch ? "exact-url" : "host-root",
      confidence: "high",
      note: "Точный адрес найден в базе OpenPhish.",
      checkedAt: new Date().toISOString(),
      feedFetchedAt: new Date(openPhishState.fetchedAt).toISOString(),
      hostMatches,
    };
  }

  if (hostMatches > 0) {
    return {
      source: "openphish",
      status: "hit",
      matchType: "host",
      confidence: "medium",
      note:
        hostMatches > 1
          ? `На этом хосте найдено ${hostMatches} адреса из OpenPhish.`
          : "На этом хосте найден адрес из OpenPhish.",
      checkedAt: new Date().toISOString(),
      feedFetchedAt: new Date(openPhishState.fetchedAt).toISOString(),
      hostMatches,
    };
  }

  return {
    source: "openphish",
    status: "clear",
    matchType: "none",
    confidence: "low",
    note: "Точного совпадения в OpenPhish не найдено.",
    checkedAt: new Date().toISOString(),
    feedFetchedAt: new Date(openPhishState.fetchedAt).toISOString(),
    hostMatches: 0,
  };
}

async function refreshUrlAbuseFeed() {
  if (!urlAbuseEmail || !urlAbuseToken) {
    urlAbuseState.lastError = "URLAbuse credentials are not configured.";
    return;
  }

  if (
    urlAbuseState.loadingPromise &&
    Date.now() - urlAbuseState.fetchedAt < urlAbuseRefreshMs
  ) {
    return urlAbuseState.loadingPromise;
  }

  urlAbuseState.loadingPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      let nextRowId = urlAbuseState.lastRowId;
      let pagesFetched = 0;
      let fetchedAny = false;

      while (pagesFetched < urlAbuseMaxPages) {
        const params = new URLSearchParams({
          email: urlAbuseEmail,
          token: urlAbuseToken,
          acl: urlAbuseAcl,
        });

        if (nextRowId > 0) {
          params.set("rowid", String(nextRowId));
        }

        const response = await fetch(`${urlAbuseApiUrl}?${params.toString()}`, {
          headers: {
            "User-Agent": "domain-traffic-light/1.0",
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`URLAbuse HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!payload?.success) {
          throw new Error(
            sanitizeString(payload?.msg || "URLAbuse returned unsuccessful payload.", 180),
          );
        }

        const records = Array.isArray(payload?.attr) ? payload.attr : [];
        if (records.length === 0) {
          break;
        }

        fetchedAny = true;
        pagesFetched += 1;

        for (const record of records) {
          const normalizedUrl = normalizeThreatUrl(record?.url);
          if (!normalizedUrl) continue;

          urlAbuseState.urls.add(normalizedUrl);

          try {
            const host = new URL(normalizedUrl).hostname.toLowerCase();
            urlAbuseState.hosts.set(host, (urlAbuseState.hosts.get(host) || 0) + 1);
          } catch {
            // ignore malformed record
          }

          const rowId = Number(record?.rowid);
          if (Number.isFinite(rowId) && rowId > nextRowId) {
            nextRowId = rowId;
          }
        }

        if (records.length < 100) {
          break;
        }
      }

      if (fetchedAny) {
        urlAbuseState.lastRowId = nextRowId;
      }

      urlAbuseState.fetchedAt = Date.now();
      urlAbuseState.lastError = null;

      log("info", "URLAbuse feed refreshed", {
        urls: urlAbuseState.urls.size,
        hosts: urlAbuseState.hosts.size,
        lastRowId: urlAbuseState.lastRowId,
      });
    } catch (error) {
      urlAbuseState.lastError =
        error instanceof Error ? error.message : "URLAbuse refresh failed.";
      log("warn", "URLAbuse refresh failed", {
        error: urlAbuseState.lastError,
      });
    } finally {
      clearTimeout(timeoutId);
      const finishedPromise = urlAbuseState.loadingPromise;
      setTimeout(() => {
        if (urlAbuseState.loadingPromise === finishedPromise) {
          urlAbuseState.loadingPromise = null;
        }
      }, 0);
    }
  })();

  return urlAbuseState.loadingPromise;
}

async function ensureUrlAbuseFeed() {
  if (!urlAbuseEmail || !urlAbuseToken) {
    return;
  }

  const isFresh =
    urlAbuseState.fetchedAt > 0 &&
    Date.now() - urlAbuseState.fetchedAt < urlAbuseRefreshMs &&
    (urlAbuseState.urls.size > 0 || urlAbuseState.lastRowId > 0);

  if (isFresh) {
    return;
  }

  await refreshUrlAbuseFeed();
}

async function lookupUrlAbuseIntel(normalized) {
  if (!urlAbuseEmail || !urlAbuseToken) {
    return {
      source: "urlabuse",
      status: "unavailable",
      note: "URLAbuse не настроен.",
      checkedAt: new Date().toISOString(),
    };
  }

  await ensureUrlAbuseFeed();

  if (urlAbuseState.urls.size === 0) {
    return {
      source: "urlabuse",
      status: "unavailable",
      note: urlAbuseState.lastError
        ? `URLAbuse недоступен: ${sanitizeString(urlAbuseState.lastError, 120)}`
        : "URLAbuse временно недоступен.",
      checkedAt: new Date().toISOString(),
    };
  }

  const exactUrl = normalizeThreatUrl(normalized.url.toString());
  const rootUrl = normalizeThreatUrl(`${normalized.url.protocol}//${normalized.host}/`);
  const host = normalized.host.toLowerCase();
  const exactMatch = urlAbuseState.urls.has(exactUrl);
  const rootMatch = urlAbuseState.urls.has(rootUrl);
  const hostMatches = urlAbuseState.hosts.get(host) || 0;

  if (exactMatch || rootMatch) {
    return {
      source: "urlabuse",
      status: "hit",
      matchType: exactMatch ? "exact-url" : "host-root",
      confidence: "high",
      note: "Точный адрес найден в URLAbuse.",
      checkedAt: new Date().toISOString(),
      hostMatches,
      lastRowId: urlAbuseState.lastRowId,
    };
  }

  if (hostMatches > 0) {
    return {
      source: "urlabuse",
      status: "hit",
      matchType: "host",
      confidence: "medium",
      note:
        hostMatches > 1
          ? `Для этого хоста в URLAbuse найдено ${hostMatches} записей.`
          : "Для этого хоста в URLAbuse найдена запись.",
      checkedAt: new Date().toISOString(),
      hostMatches,
      lastRowId: urlAbuseState.lastRowId,
    };
  }

  return {
    source: "urlabuse",
    status: "clear",
    matchType: "none",
    confidence: "low",
    note: "Совпадений в URLAbuse не найдено.",
    checkedAt: new Date().toISOString(),
    hostMatches: 0,
    lastRowId: urlAbuseState.lastRowId,
  };
}

setTimeout(() => {
  void refreshOpenPhishFeed();
  if (urlAbuseEmail && urlAbuseToken) {
    void refreshUrlAbuseFeed();
  }
}, 0);

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;

  const timer = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
  });

  return Promise.race([promise, timer]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function lookupDnsSignals(host) {
  const [ipv4, ipv6, cnames] = await Promise.allSettled([
    withTimeout(dns.resolve4(host), networkSignalTimeoutMs, "DNS A"),
    withTimeout(dns.resolve6(host), networkSignalTimeoutMs, "DNS AAAA"),
    withTimeout(dns.resolveCname(host), networkSignalTimeoutMs, "DNS CNAME"),
  ]);

  const ipv4List = ipv4.status === "fulfilled" ? ipv4.value : [];
  const ipv6List = ipv6.status === "fulfilled" ? ipv6.value : [];
  const cnameList = cnames.status === "fulfilled" ? cnames.value : [];
  const resolved =
    ipv4List.length > 0 || ipv6List.length > 0 || cnameList.length > 0;

  return {
    resolved,
    ipv4Count: ipv4List.length,
    ipv6Count: ipv6List.length,
    cnames: cnameList.slice(0, 2),
    note: resolved
      ? `DNS есть: A ${ipv4List.length}, AAAA ${ipv6List.length}, CNAME ${cnameList.length}.`
      : "DNS-ответ не получен.",
  };
}

async function lookupHttpSignals(normalized) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), networkSignalTimeoutMs);

  try {
    let response = await fetch(normalized.url.toString(), {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "DomainTrafficLight/1.0",
      },
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(normalized.url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "DomainTrafficLight/1.0",
        },
      });
    }

    const location = response.headers.get("location");
    let redirectHost = null;

    if (location) {
      try {
        redirectHost = new URL(location, normalized.url).hostname.toLowerCase();
      } catch {
        redirectHost = null;
      }
    }

    return {
      reachable: true,
      status: response.status,
      redirected: Boolean(redirectHost),
      redirectHost,
      note: redirectHost
        ? `HTTP ${response.status}, redirect на ${redirectHost}.`
        : `HTTP ${response.status} без внешнего redirect.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? sanitizeString(error.message, 120) : "HTTP check failed.";
    return {
      reachable: false,
      status: null,
      redirected: false,
      redirectHost: null,
      note: `HTTP недоступен: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function lookupTlsSignals(host) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    const socket = tls.connect(
      {
        host,
        servername: host,
        port: 443,
        rejectUnauthorized: false,
      },
      () => {
        const certificate = socket.getPeerCertificate();
        done({
          available: Boolean(certificate && Object.keys(certificate).length > 0),
          subject: certificate?.subject?.CN || null,
          issuer: certificate?.issuer?.CN || null,
          validTo: certificate?.valid_to || null,
          note:
            certificate && Object.keys(certificate).length > 0
              ? `TLS сертификат есть: ${certificate?.subject?.CN || "CN не указан"}.`
              : "TLS сертификат не получен.",
        });
        socket.end();
      },
    );

    socket.setTimeout(networkSignalTimeoutMs, () => {
      done({
        available: false,
        subject: null,
        issuer: null,
        validTo: null,
        note: "TLS-проверка не успела завершиться.",
      });
      socket.destroy();
    });

    socket.on("error", (error) => {
      done({
        available: false,
        subject: null,
        issuer: null,
        validTo: null,
        note: `TLS недоступен: ${sanitizeString(error.message, 120)}`,
      });
    });
  });
}

async function lookupNetworkSignals(normalized) {
  const dnsSignal = await lookupDnsSignals(normalized.host).catch((error) => ({
    resolved: false,
    ipv4Count: 0,
    ipv6Count: 0,
    cnames: [],
    note:
      error instanceof Error
        ? `DNS недоступен: ${sanitizeString(error.message, 120)}`
        : "DNS lookup failed.",
  }));

  const [httpSignal, tlsSignal] = await Promise.all([
    lookupHttpSignals(normalized),
    normalized.url.protocol === "https:"
      ? lookupTlsSignals(normalized.host)
      : Promise.resolve({
          available: false,
          subject: null,
          issuer: null,
          validTo: null,
          note: "TLS не проверялся для HTTP-ссылки.",
        }),
  ]);

  return {
    source: "network",
    checkedAt: new Date().toISOString(),
    dns: dnsSignal,
    http: httpSignal,
    tls: tlsSignal,
  };
}

function applyThreatIntelToAnalysis(localAnalysis, threatIntel, normalized) {
  if (!localAnalysis || !normalized || threatIntel?.source !== "openphish") {
    return localAnalysis;
  }

  const baseReasons = Array.isArray(localAnalysis.reasons)
    ? [...localAnalysis.reasons]
    : [];
  const baseActions = Array.isArray(localAnalysis.actions)
    ? [...localAnalysis.actions]
    : [];
  let score = Number.isFinite(Number(localAnalysis.score))
    ? Number(localAnalysis.score)
    : 0;

  if (threatIntel.status === "hit") {
    const isExact = threatIntel.matchType === "exact-url" || threatIntel.matchType === "host-root";
    const scoreDelta = isExact ? 70 : 52;

    baseReasons.unshift({
      title: isExact ? "Есть в OpenPhish" : "Хост есть в OpenPhish",
      detail: isExact
        ? "Точный URL найден в community feed OpenPhish. Это сильный сигнал реального фишинга."
        : threatIntel.hostMatches > 1
          ? `Для этого хоста в OpenPhish найдено ${threatIntel.hostMatches} phishing-URL.`
          : "Для этого хоста в OpenPhish найден phishing-URL.",
      scoreDelta,
      tone: "critical",
    });

    score = Math.min(100, score + scoreDelta);

    const actions = [
      "Не открывайте этот адрес. Не вводите данные.",
      "Откройте официальный сайт вручную через поисковик или закладки.",
      "Если ссылка пришла в сообщении, покажите её взрослому или специалисту.",
    ];

    return {
      ...localAnalysis,
      host: normalized.host,
      breakdown: buildBreakdown(normalized.host),
      analyzedAt: new Date().toISOString(),
      score,
      verdict: "high",
      verdictLabel: "Высокий риск",
      summary: isExact
        ? "Точный адрес найден в phishing-базе OpenPhish. Это сильный сигнал опасности."
        : "Этот хост уже встречается в phishing-базе OpenPhish. Переход лучше остановить.",
      reasons: sortReasons(baseReasons).slice(0, 8),
      actions,
    };
  }

  return {
    ...localAnalysis,
    host: normalized.host,
    breakdown: buildBreakdown(normalized.host),
  };
}

function applyUrlAbuseToAnalysis(localAnalysis, urlAbuseIntel, normalized) {
  if (!localAnalysis || !normalized || urlAbuseIntel?.source !== "urlabuse") {
    return localAnalysis;
  }

  if (urlAbuseIntel.status !== "hit") {
    return localAnalysis;
  }

  const baseReasons = Array.isArray(localAnalysis.reasons)
    ? [...localAnalysis.reasons]
    : [];
  const baseActions = Array.isArray(localAnalysis.actions)
    ? [...localAnalysis.actions]
    : [];
  const isExact =
    urlAbuseIntel.matchType === "exact-url" || urlAbuseIntel.matchType === "host-root";
  const scoreDelta = isExact ? 62 : 44;

  baseReasons.unshift({
    title: isExact ? "Есть в URLAbuse" : "Хост есть в URLAbuse",
    detail: isExact
      ? "Точный адрес найден в URLAbuse. Это сильный сигнал реального фишинга."
      : urlAbuseIntel.hostMatches > 1
        ? `Для этого хоста в URLAbuse найдено ${urlAbuseIntel.hostMatches} записей.`
        : "Для этого хоста в URLAbuse найдена phishing-запись.",
    scoreDelta,
    tone: "critical",
  });

  return {
    ...localAnalysis,
    host: normalized.host,
    breakdown: buildBreakdown(normalized.host),
    analyzedAt: new Date().toISOString(),
    score: Math.min(100, Math.max(Number(localAnalysis.score) || 0, scoreDelta)),
    verdict: "high",
    verdictLabel: "Высокий риск",
    summary: isExact
      ? "Адрес найден в URLAbuse. Переход и ввод данных лучше остановить."
      : "Для этого хоста есть записи в URLAbuse. Нужна жёсткая перепроверка.",
    reasons: sortReasons(baseReasons).slice(0, 8),
    actions: [
      "Не переходите по ссылке. Не вводите данные.",
      "Откройте официальный адрес вручную через поисковик или закладки.",
      "Если ссылка пришла в сообщении, покажите её взрослому или специалисту.",
      ...baseActions,
    ]
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 5),
  };
}

function applyNetworkSignalsToAnalysis(localAnalysis, networkSignals, normalized) {
  if (!localAnalysis || !networkSignals || !normalized) {
    return localAnalysis;
  }

  const baseReasons = Array.isArray(localAnalysis.reasons)
    ? [...localAnalysis.reasons]
    : [];
  let score = Number.isFinite(Number(localAnalysis.score))
    ? Number(localAnalysis.score)
    : 0;
  let changed = false;

  // DNS не резолвится — серьёзный warning
  if (networkSignals.dns && !networkSignals.dns.resolved) {
    baseReasons.push({
      title: "DNS не отвечает",
      detail: `Домен ${normalized.host} не резолвится через DNS. Это может означать свежий фишинг, мёртвый домен или блокировку.`,
      scoreDelta: 14,
      tone: "warning",
    });
    score += 14;
    changed = true;
  }

  // HTTP redirect на другой registrable domain — critical
  if (
    networkSignals.http &&
    networkSignals.http.redirected &&
    networkSignals.http.redirectHost &&
    networkSignals.http.redirectHost !== normalized.host &&
    !isBenignSameSiteRedirect(normalized.host, networkSignals.http.redirectHost) &&
    !normalized.host.endsWith(`.${networkSignals.http.redirectHost}`) &&
    !networkSignals.http.redirectHost.endsWith(`.${normalized.host}`)
  ) {
    baseReasons.push({
      title: "Redirect на другой домен",
      detail: `При переходе на ${normalized.host} происходит redirect на ${networkSignals.http.redirectHost}. Это может быть маскировка реального направления.`,
      scoreDelta: 20,
      tone: "critical",
    });
    score += 20;
    changed = true;
  }

  // TLS subject не совпадает с доменом.
  // Не штрафуем типичный apex -> www / wildcard случай внутри одного registrable domain.
  if (
    networkSignals.tls &&
    networkSignals.tls.available &&
    networkSignals.tls.subject &&
    !matchesTlsSubject(normalized.host, networkSignals.tls.subject)
  ) {
    baseReasons.push({
      title: "TLS-несоответствие",
      detail: `TLS сертификат выдан на ${networkSignals.tls.subject}, а не на ${normalized.host}. Это может быть shared hosting или подмена.`,
      scoreDelta: 10,
      tone: "warning",
    });
    score += 10;
    changed = true;
  }

  // HTTP не отвечает вообще (для не-.test/.example доменов)
  if (
    networkSignals.http &&
    !networkSignals.http.reachable &&
    !normalized.host.endsWith(".test") &&
    !normalized.host.endsWith(".example")
  ) {
    baseReasons.push({
      title: "Сайт недоступен",
      detail: `HTTP-запрос к ${normalized.host} не получил ответа. Сайт может быть нерабочим, заблокированным или временным.`,
      scoreDelta: 8,
      tone: "warning",
    });
    score += 8;
    changed = true;
  }

  if (!changed) {
    return localAnalysis;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  let verdict = localAnalysis.verdict || "low";
  if (normalizedScore >= 42 && verdict !== "high") {
    verdict = "high";
  } else if (normalizedScore >= 12 && verdict === "low") {
    verdict = "medium";
  }

  return {
    ...localAnalysis,
    host: normalized.host,
    breakdown: buildBreakdown(normalized.host),
    analyzedAt: new Date().toISOString(),
    score: normalizedScore,
    verdict,
    verdictLabel: verdict === "high" ? "Высокий риск" : verdict === "medium" ? "Нужна перепроверка" : "Низкий риск",
    summary: localAnalysis.summary,
    reasons: sortReasons(baseReasons).slice(0, 10),
    actions: localAnalysis.actions,
  };
}

// ─── Request logging ──────────────────────────────────────────────────────────
const logLevel = process.env.LOG_LEVEL || "debug";

function log(level, message, meta = {}) {
  const levels = { debug: 0, info: 1, warn: 2, error: 3 };
  if ((levels[level] ?? 1) < (levels[logLevel] ?? 1)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "256kb" }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", corsOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // Безопасность
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use((req, _res, next) => {
  log("debug", "HTTP request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ─── Models ───────────────────────────────────────────────────────────────────
const configuredModels = (
  process.env.GROQ_MODELS ||
  process.env.GROQ_MODEL ||
  "llama-3.3-70b-versatile,llama-3.1-8b-instant"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const modelCandidates = [...new Set(configuredModels)];

const compoundSuffixes = [
  "edu.gov.by",
  "gov.by",
  "mil.by",
  "com.by",
  "net.by",
  "org.by",
];

function buildGroqRequest(model, prompt) {
  return {
    model,
    temperature: 0.08,
    max_tokens: Number(process.env.AI_MAX_TOKENS) || 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Ты — строгий аналитик фишинга и доменных угроз. Ты работаешь в системе «Светофор доменов» для белорусских пользователей.

Твоя задача — на основе уже готового локального анализа (ruleset), данных threat feeds (OpenPhish, URLAbuse) и сетевых сигналов (DNS, HTTP, TLS):
1. Перепроверить вердикт и при необходимости усилить его.
2. Добавить ТОЛЬКО новые полезные наблюдения, которых нет в локальном анализе.
3. Не смягчать вердикт, если локальный анализ уже нашёл серьёзные риски (typo-squat, brand-spoof, punycode, OpenPhish hit).
4. Анализировать корреляции между сигналами (например, новый домен + подозрительные слова + нестандартный TLD = высокий риск).

Принципы:
- Каждая причина (reason) должна ссылаться на КОНКРЕТНЫЙ сигнал: фрагмент домена, TLD, результат DNS/TLS, запись в OpenPhish, redirect-цепочку.
- Не пиши общих фраз вроде «домен выглядит подозрительно» или «есть отдельный поддомен».
- Если DNS не резолвится — это серьёзный warning. Если TLS subject не совпадает с доменом — это warning. Если HTTP redirect ведёт на другой домен — это critical.
- Если данных мало, честно напиши об ограничении, но не выдумывай проверки.
- Все тексты — на русском. Формат — строго JSON.
- Заголовок reason: 1–3 слова, без нумерации, без «Сигнал 1».
- Обращай внимание на комбинации признаков: несколько слабых сигналов вместе могут указывать на высокий риск.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  };
}

// ─── Domain helpers ───────────────────────────────────────────────────────────
function buildBreakdown(host) {
  const labels = host.split(".");
  const matchedSuffix = compoundSuffixes.find(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );

  if (matchedSuffix) {
    const suffixLength = matchedSuffix.split(".").length;

    if (labels.length === suffixLength) {
      return {
        subdomain: "",
        registrableDomain: host,
        tld: matchedSuffix,
      };
    }

    return {
      subdomain:
        labels.length > suffixLength + 1
          ? labels.slice(0, -(suffixLength + 1)).join(".")
          : "",
      registrableDomain: labels.slice(-(suffixLength + 1)).join("."),
      tld: matchedSuffix,
    };
  }

  return {
    subdomain: labels.length > 2 ? labels.slice(0, -2).join(".") : "",
    registrableDomain: labels.length >= 2 ? labels.slice(-2).join(".") : host,
    tld: labels.at(-1) || "",
  };
}

function normalizeInput(input) {
  const raw = String(input || "").trim();

  if (!raw) {
    return { error: "Введите домен или ссылку." };
  }

  // Защита от слишком длинного ввода
  if (raw.length > 2048) {
    return { error: "Слишком длинный ввод. Максимум 2048 символов." };
  }

  // Отклоняем опасные URI-схемы
  const dangerousSchemes = /^(javascript|data|vbscript|file):/i;
  if (dangerousSchemes.test(raw)) {
    return { error: "Недопустимая схема URL." };
  }

  let candidate = raw;

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");

    if (!host || !host.includes(".")) {
      return { error: "Нужен домен с точкой, например `portal.example`." };
    }

    // Дополнительная валидация hostname
    if (host.length > 253) {
      return { error: "Имя хоста слишком длинное." };
    }

    const labels = host.split(".");
    if (labels.some((label) => label.length > 63 || label.length === 0)) {
      return { error: "Некорректная структура доменного имени." };
    }

    return { url, host };
  } catch {
    return {
      error: "Не удалось распознать ввод. Проверьте адрес и уберите лишние пробелы.",
    };
  }
}

// ─── JSON extraction ──────────────────────────────────────────────────────────
function extractJson(content) {
  if (!content) {
    throw new Error("Empty AI response");
  }

  const normalized = String(content)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }

  const candidate = normalized
    .slice(start, end + 1)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    // Убираем управляющие символы кроме \n \r \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try {
    return JSON.parse(candidate);
  } catch (parseError) {
    throw new Error(`JSON parse failed: ${parseError.message}`);
  }
}

// ─── Sanitizers ───────────────────────────────────────────────────────────────
function sanitizeVerdict(verdict) {
  const normalized = String(verdict || "").toLowerCase().trim();

  if (
    ["high", "malicious", "dangerous", "phishing", "critical", "scam"].includes(normalized)
  ) {
    return "high";
  }

  if (["low", "safe", "legitimate", "benign", "clean"].includes(normalized)) {
    return "low";
  }

  return "medium";
}

function sanitizeTone(tone) {
  return ["positive", "warning", "critical"].includes(tone) ? tone : "warning";
}

function verdictLabel(verdict) {
  if (verdict === "high") return "Высокий риск";
  if (verdict === "medium") return "Нужна перепроверка";
  return "Низкий риск";
}

function defaultActions(verdict) {
  if (verdict === "high") {
    return [
      "Не переходите по ссылке. Не вводите данные.",
      "Откройте официальный адрес вручную.",
      "Покажите ссылку взрослому или специалисту.",
    ];
  }

  if (verdict === "medium") {
    return [
      "Сначала сравните домен с официальным адресом.",
      "Проверьте ядро домена и поддомен.",
      "Если остаются сомнения, не продолжайте переход.",
    ];
  }

  return [
    "Сверьте адрес вручную.",
    "Убедитесь, что домен совпадает с ожидаемым сайтом.",
    "Продолжайте только при полном совпадении адреса.",
  ];
}

function sanitizeString(value, maxLength = 500) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function inferReasonTone(verdict) {
  if (verdict === "high") return "critical";
  if (verdict === "low") return "positive";
  return "warning";
}

function inferReasonScoreDelta(verdict) {
  if (verdict === "high") return 18;
  if (verdict === "low") return -8;
  return 10;
}

function inferReasonTitle(text, verdict) {
  const value = String(text || "").toLowerCase();

  if (/openphish/i.test(value)) {
    return "OpenPhish";
  }

  if (/urlabuse/i.test(value)) {
    return "URLAbuse";
  }

  if (/бренд|spoof|typo|подмен|roblox|vercel|openai|github|google|telegram/i.test(value)) {
    return "Бренд";
  }

  if (/redirect|редирект|перенаправ/i.test(value)) {
    return "Redirect";
  }

  if (/ssl|https|сертификат|шифрован/i.test(value)) {
    return "HTTPS";
  }

  if (/dns|ns\b|регистрац/i.test(value)) {
    return "DNS";
  }

  if (/фишинг.*баз|базах фишингов|blacklist|репутац/i.test(value)) {
    return "Репутация";
  }

  if (/возраст|давно|долг/i.test(value)) {
    return "Возраст домена";
  }

  if (/официаль|известн|легитим|довер/i.test(value)) {
    return verdict === "low" ? "Признак доверия" : "Известный сервис";
  }

  if (/не содержит|нет признаков|не найден/i.test(value)) {
    return verdict === "low" ? "Явных угроз не видно" : "Требует проверки";
  }

  if (/зона|tld|доменн/i.test(value)) {
    return "Доменная зона";
  }

  if (/поддомен|структур/i.test(value)) {
    return "Структура URL";
  }

  return verdict === "low"
    ? "Позитивный сигнал"
    : verdict === "high"
      ? "Сигнал риска"
      : "Сигнал проверки";
}

function isGenericReasonTitle(title) {
  return /^(сигнал|наблюдение)\s*\d*$/i.test(String(title || "").trim());
}

function inferReasonTopic(reason) {
  const value = `${String(reason?.title || "")} ${String(reason?.detail || "")}`.toLowerCase();

  if (/openphish/.test(value)) return "openphish";
  if (/urlabuse/.test(value)) return "urlabuse";
  if (/бренд|spoof|typo|подмен|roblox|vercel|openai|github|google|telegram/.test(value)) {
    return "brand";
  }
  if (/ssl|https|сертификат|шифрован|tls/.test(value)) return "https";
  if (/dns|ns\b|регистрац/.test(value)) return "dns";
  if (/redirect|редирект|перенаправ/.test(value)) return "redirect";
  if (/поддомен|структур|ядро домена/.test(value)) return "subdomain";
  if (/зона|tld|доменн/.test(value)) return "tld";
  if (/query|параметр|порт|@/.test(value)) return "url-structure";
  if (/репутац|blacklist|базах фишингов|фишинг/.test(value)) return "reputation";

  return sanitizeString(reason?.title || reason?.detail || "", 60).toLowerCase();
}

function filterNovelAiReasons(aiReasons = [], localReasons = []) {
  const localTopics = new Set(localReasons.map((reason) => inferReasonTopic(reason)));
  const seenTopics = new Set();

  return aiReasons.filter((reason) => {
    const topic = inferReasonTopic(reason);
    const detail = sanitizeString(reason?.detail || "", 220).toLowerCase();
    const hasConcretePayload =
      detail.length >= 38 ||
      /openphish|urlabuse|xn--|redirect|поддомен|зона|бренд|spoof|typo|dns|https|tls/.test(detail);

    if (seenTopics.has(topic)) {
      return false;
    }

    if (localTopics.has(topic) && !hasConcretePayload) {
      return false;
    }

    seenTopics.add(topic);
    return true;
  });
}

function reasonMentionsConcreteSignal(reason, normalized) {
  const text = `${String(reason?.title || "")} ${String(reason?.detail || "")}`.toLowerCase();
  const hostTokens = normalized.host
    .split(".")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 4);
  const pathTokens = normalized.url.pathname
    .split(/[\\/._-]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 4);

  return (
    [...hostTokens, ...pathTokens].some((token) => text.includes(token)) ||
    /openphish|urlabuse|xn--|https|dns|tls|redirect|поддомен|зона|бренд|spoof|typo/.test(text)
  );
}

function alignScoreWithVerdict(score, verdict) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));

  if (verdict === "high") {
    return Math.max(normalized, 65);
  }

  if (verdict === "medium") {
    return Math.min(64, Math.max(normalized, 30));
  }

  return Math.min(normalized, 29);
}

function isContradictorySummary(summary, verdict) {
  const value = sanitizeString(summary || "", 220).toLowerCase();

  if (!value) {
    return true;
  }

  const calmPatterns = [
    "не выявлен",
    "не обнаружен",
    "сильных тревожных признаков не найдено",
    "явных угроз не видно",
    "выглядит легитим",
    "выглядит норм",
    "всё норм",
    "все норм",
  ];

  if (verdict === "high" || verdict === "medium") {
    return calmPatterns.some((pattern) => value.includes(pattern));
  }

  return false;
}

function sanitizeAnalysis(aiPayload, input, localAnalysis) {
  const normalized = normalizeInput(input);

  if ("error" in normalized) {
    throw new Error(normalized.error);
  }

  const fallbackVerdict = sanitizeVerdict(localAnalysis?.verdict);

  // AI не может понизить verdict ниже локального без весомого обоснования
  const aiVerdict = sanitizeVerdict(aiPayload?.verdict);
  const verdictPriority = { low: 0, medium: 1, high: 2 };
  const verdict =
    verdictPriority[aiVerdict] >= verdictPriority[fallbackVerdict]
      ? aiVerdict
      : fallbackVerdict;

  const rawScore = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(Number(aiPayload?.score))
        ? Number(aiPayload.score)
        : Number.isFinite(Number(localAnalysis?.score))
          ? Number(localAnalysis.score)
          : 50,
    ),
  );
  const score = alignScoreWithVerdict(rawScore, verdict);

  const reasons = Array.isArray(aiPayload?.reasons)
    ? aiPayload.reasons.slice(0, 6).map((item, index) => {
        if (typeof item === "string") {
          const tone = inferReasonTone(verdict);
          return {
            title: inferReasonTitle(item, verdict) || `Сигнал ${index + 1}`,
            detail: sanitizeString(item),
            scoreDelta: inferReasonScoreDelta(verdict),
            tone,
          };
        }

        const fallbackTone = inferReasonTone(verdict);
        const fallbackTitle = inferReasonTitle(item?.detail || item?.title || "", verdict);
        return {
          title: sanitizeString(
            isGenericReasonTitle(item?.title) ? fallbackTitle : item?.title || fallbackTitle,
            100,
          ),
          detail: sanitizeString(
            item?.detail || "AI вернул краткое объяснение без деталей.",
          ),
          scoreDelta: Number.isFinite(Number(item?.scoreDelta))
            ? Math.max(-50, Math.min(60, Number(item.scoreDelta)))
            : inferReasonScoreDelta(verdict),
          tone: item?.tone ? sanitizeTone(item?.tone) : fallbackTone,
        };
      })
    : [];
  const filteredAiReasons = filterNovelAiReasons(
    reasons,
    Array.isArray(localAnalysis?.reasons) ? localAnalysis.reasons : [],
  ).filter((reason) => reasonMentionsConcreteSignal(reason, normalized));

  const aiReasonsAreOnlyBenignNetworkNotes =
    filteredAiReasons.length > 0 &&
    filteredAiReasons.every((reason) => isBenignNetworkReason(reason, normalized));

  const downgradedVerdict =
    fallbackVerdict === "low" && aiReasonsAreOnlyBenignNetworkNotes ? "low" : verdict;

  const actions = Array.isArray(aiPayload?.actions)
    ? aiPayload.actions
        .slice(0, 5)
        .map((item) => sanitizeString(item, 200))
        .filter(Boolean)
    : defaultActions(verdict);

  // Объединяем локальные и AI-причины (без дублей по title)
  const mergedReasons = [...filteredAiReasons];
  if (Array.isArray(localAnalysis?.reasons)) {
    const existingTitles = new Set(mergedReasons.map((r) => r.title.toLowerCase()));
    for (const lr of localAnalysis.reasons) {
      if (!existingTitles.has(lr.title.toLowerCase())) {
        mergedReasons.push(lr);
      }
    }
  }

  const safeSummary = sanitizeString(aiPayload?.summary || "", 600);
  const summary =
    !safeSummary || isContradictorySummary(safeSummary, verdict)
      ? sanitizeString(localAnalysis?.summary || safeSummary, 600)
      : safeSummary;

  return {
    host: normalized.host,
    score:
      fallbackVerdict === "low" && aiReasonsAreOnlyBenignNetworkNotes
        ? Math.min(10, alignScoreWithVerdict(rawScore, "low"))
        : score,
    verdict: downgradedVerdict,
    verdictLabel: verdictLabel(downgradedVerdict),
    summary:
      fallbackVerdict === "low" && aiReasonsAreOnlyBenignNetworkNotes
        ? sanitizeString(localAnalysis?.summary || summary, 600)
        : summary,
    reasons:
      mergedReasons.length > 0
        ? mergedReasons.slice(0, 8)
        : [
            {
              title: "AI не вернул причины",
              detail:
                "Сервер получил ответ без объяснений и использовал безопасный fallback.",
              scoreDelta: 0,
              tone: "warning",
            },
          ],
    actions:
      actions.length > 0
        ? actions
        : Array.isArray(localAnalysis?.actions) && localAnalysis.actions.length > 0
          ? localAnalysis.actions.slice(0, 5)
          : defaultActions(verdict),
    breakdown: buildBreakdown(normalized.host),
  };
}

function mergeUniqueReasons(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((reason) => {
    const key = `${String(reason?.title || "").toLowerCase()}::${String(reason?.detail || "").toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function mergeUniqueActions(primary = [], secondary = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((action) => {
    const key = sanitizeString(action, 200).toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function applyAiToAnalysis(baseAnalysis, aiAnalysis, normalized) {
  if (!baseAnalysis || !aiAnalysis) {
    return baseAnalysis;
  }

  const verdictPriority = { low: 0, medium: 1, high: 2 };
  const chosenVerdict =
    verdictPriority[aiAnalysis.verdict] >= verdictPriority[baseAnalysis.verdict]
      ? aiAnalysis.verdict
      : baseAnalysis.verdict;
  const chosenScore = alignScoreWithVerdict(
    Math.max(Number(baseAnalysis.score) || 0, Number(aiAnalysis.score) || 0),
    chosenVerdict,
  );

  return {
    ...baseAnalysis,
    host: normalized.host,
    analyzedAt: new Date().toISOString(),
    breakdown: buildBreakdown(normalized.host),
    verdict: chosenVerdict,
    verdictLabel: verdictLabel(chosenVerdict),
    score: chosenScore,
    summary: sanitizeString(aiAnalysis.summary || baseAnalysis.summary, 600),
    reasons: mergeUniqueReasons(baseAnalysis.reasons || [], aiAnalysis.reasons || []).slice(0, 8),
    actions: mergeUniqueActions(baseAnalysis.actions || [], aiAnalysis.actions || []).slice(0, 5),
  };
}

function sanitizeAdminReasons(reasons, fallbackVerdict) {
  if (!Array.isArray(reasons)) return [];

  return reasons
    .map((reason, index) => {
      if (typeof reason === "string") {
        const detail = sanitizeString(reason, 240);
        if (!detail) return null;
        return {
          title: inferReasonTitle(detail, fallbackVerdict) || `Сигнал ${index + 1}`,
          detail,
          scoreDelta: inferReasonScoreDelta(fallbackVerdict),
          tone: inferReasonTone(fallbackVerdict),
        };
      }

      const detail = sanitizeString(reason?.detail || "", 240);
      const title = sanitizeString(reason?.title || "", 100);
      if (!detail && !title) return null;

      return {
        title: title || inferReasonTitle(detail, fallbackVerdict) || `Сигнал ${index + 1}`,
        detail: detail || "Ручная правка без подробностей.",
        scoreDelta: Number.isFinite(Number(reason?.scoreDelta))
          ? Math.max(-50, Math.min(60, Number(reason.scoreDelta)))
          : inferReasonScoreDelta(fallbackVerdict),
        tone: reason?.tone ? sanitizeTone(reason.tone) : inferReasonTone(fallbackVerdict),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeAdminActions(actions, fallbackVerdict) {
  if (!Array.isArray(actions)) {
    return defaultActions(fallbackVerdict);
  }

  const nextActions = actions
    .map((item) => sanitizeString(typeof item === "string" ? item : String(item || ""), 200))
    .filter(Boolean)
    .slice(0, 5);

  return nextActions.length > 0 ? nextActions : defaultActions(fallbackVerdict);
}

function applyAdminEditsToResponseData(data, edits = {}, host) {
  const currentFinal = data?.aiAdjustedResult || data?.enrichedLocalResult || data?.analysis || {};
  const currentAnalysis = data?.analysis || currentFinal || {};
  const nextVerdict = sanitizeVerdict(edits?.verdict || currentFinal?.verdict || currentAnalysis?.verdict);
  const rawScore = Number.isFinite(Number(edits?.score))
    ? Number(edits.score)
    : Number.isFinite(Number(currentFinal?.score))
      ? Number(currentFinal.score)
      : Number.isFinite(Number(currentAnalysis?.score))
        ? Number(currentAnalysis.score)
        : 50;
  const nextScore = alignScoreWithVerdict(rawScore, nextVerdict);
  const nextSummary = sanitizeString(
    edits?.summary || currentFinal?.summary || currentAnalysis?.summary || "",
    600,
  );
  const nextReasons = sanitizeAdminReasons(
    Array.isArray(edits?.reasons) ? edits.reasons : currentFinal?.reasons || currentAnalysis?.reasons || [],
    nextVerdict,
  );
  const nextActions = sanitizeAdminActions(
    Array.isArray(edits?.actions) ? edits.actions : currentFinal?.actions || currentAnalysis?.actions || [],
    nextVerdict,
  );
  const nextBreakdown = buildBreakdown(host);
  const moderationNote = sanitizeString(edits?.note || "", 280);
  const timestamp = new Date().toISOString();

  return {
    ...data,
    analysis: {
      ...currentAnalysis,
      host,
      verdict: nextVerdict,
      verdictLabel: verdictLabel(nextVerdict),
      score: nextScore,
      summary: nextSummary,
      reasons: nextReasons,
      actions: nextActions,
      breakdown: nextBreakdown,
    },
    aiAdjustedResult: {
      ...currentFinal,
      host,
      verdict: nextVerdict,
      verdictLabel: verdictLabel(nextVerdict),
      score: nextScore,
      summary: nextSummary,
      reasons: nextReasons,
      actions: nextActions,
      analyzedAt: timestamp,
      breakdown: nextBreakdown,
    },
    source: "cache-admin",
    moderation: {
      moderated: true,
      updatedAt: timestamp,
      note: moderationNote || null,
    },
  };
}

function buildNetworkSignalSummary(networkSignals) {
  if (!networkSignals) {
    return "network: unavailable";
  }

  const dnsLine = `dns_resolved: ${networkSignals.dns?.resolved ? "yes" : "no"}, a=${networkSignals.dns?.ipv4Count || 0}, aaaa=${networkSignals.dns?.ipv6Count || 0}, cname=${Array.isArray(networkSignals.dns?.cnames) ? networkSignals.dns.cnames.join(",") || "none" : "none"}`;
  const httpLine = `http_status: ${networkSignals.http?.status ?? "n/a"}, redirected: ${networkSignals.http?.redirected ? "yes" : "no"}, redirect_host: ${networkSignals.http?.redirectHost || "none"}`;
  const tlsLine = `tls_available: ${networkSignals.tls?.available ? "yes" : "no"}, tls_subject: ${networkSignals.tls?.subject || "none"}, tls_issuer: ${networkSignals.tls?.issuer || "none"}`;

  return [dnsLine, httpLine, tlsLine].join("\n");
}

function buildThreatIntelSummary(threatIntel, urlAbuseIntel) {
  const openPhishLine = threatIntel
    ? `openphish: status=${threatIntel.status}, match=${threatIntel.matchType || "none"}, note=${sanitizeString(threatIntel.note || "", 180)}`
    : "openphish: unavailable";
  const urlAbuseLine = urlAbuseIntel
    ? `urlabuse: status=${urlAbuseIntel.status}, match=${urlAbuseIntel.matchType || "none"}, note=${sanitizeString(urlAbuseIntel.note || "", 180)}`
    : "urlabuse: unavailable";

  return [openPhishLine, urlAbuseLine].join("\n");
}

function buildLocalSignalSummary(localAnalysis) {
  if (!Array.isArray(localAnalysis?.reasons) || localAnalysis.reasons.length === 0) {
    return "none";
  }

  return localAnalysis.reasons
    .slice(0, 5)
    .map((reason) => {
      const tone = sanitizeTone(reason?.tone);
      const delta = Number.isFinite(Number(reason?.scoreDelta))
        ? Number(reason.scoreDelta)
        : 0;
      return `${reason.title} [${tone}, ${delta >= 0 ? `+${delta}` : delta}]: ${sanitizeString(reason.detail, 180)}`;
    })
    .join("\n");
}

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(
  input,
  normalized,
  localAnalysis,
  networkSignals,
  threatIntel,
  urlAbuseIntel,
) {
  const localReasons = buildLocalSignalSummary(localAnalysis);
  const networkSummary = buildNetworkSignalSummary(networkSignals);
  const threatIntelSummary = buildThreatIntelSummary(threatIntel, urlAbuseIntel);
  const breakdown = buildBreakdown(normalized.host);

  return `## КОНТЕКСТ
Ты не оцениваешь домен с нуля. У тебя уже есть локальный ruleset, данные phishing-баз и сетевые проверки.
Твоя задача: перепроверить вывод, добавить ТОЛЬКО новые конкретные наблюдения, и сформировать итог.

## ВХОДНЫЕ ДАННЫЕ
input: ${sanitizeString(input, 280)}
host: ${normalized.host}
registrable_domain: ${breakdown.registrableDomain}
subdomain: ${breakdown.subdomain || "none"}
tld: ${breakdown.tld}
path: ${normalized.url.pathname || "/"}
query: ${normalized.url.search ? sanitizeString(normalized.url.search, 200) : "none"}
local_verdict: ${localAnalysis?.verdict || "unknown"}
local_score: ${Number.isFinite(Number(localAnalysis?.score)) ? Number(localAnalysis.score) : 0}
local_summary: ${sanitizeString(localAnalysis?.summary || "", 280)}

## ЛОКАЛЬНЫЕ СИГНАЛЫ (ruleset)
${localReasons}

## THREAT FEEDS
${threatIntelSummary}

## СЕТЕВЫЕ СИГНАЛЫ (DNS / HTTP / TLS)
${networkSummary}

## ИНСТРУКЦИИ ПО АНАЛИЗУ СЕТЕВЫХ СИГНАЛОВ
- Если dns_resolved=no → домен не резолвится, это серьёзный warning (может быть новый/свежий фишинг или мёртвый домен).
- Если http redirect ведёт на ДРУГОЙ registrable domain → это critical: redirect-маскировка.
- Если apex-домен просто ведёт на \`www\` того же registrable domain — это НОРМАЛЬНО и не должно считаться риском.
- Если tls_subject — wildcard внутри того же registrable domain (\`*.example.com\` для \`www.example.com\` или \`example.com\`) — это не сигнал риска само по себе.
- Если запрос к apex домену (example.com), а TLS сертификат выдан на www поддомен (www.example.com) — это НОРМАЛЬНАЯ практика редиректа и НЕ является риском.
- Если запрос к www поддомену (www.example.com), а TLS сертификат выдан на apex домен (example.com) — это тоже НОРМАЛЬНО.
- Если tls_available=no для https-ссылки → warning: сертификат не получен.
- Если http_status=4xx или 5xx → warning: сайт может быть недействителен.

## ПРАВИЛА
1. Причин максимум 4. Действий максимум 3.
2. Заголовок причины: 1-3 слова. БЕЗ нумерации, БЕЗ "Сигнал 1".
3. В detail ОБЯЗАТЕЛЬНО упоминай конкретный фрагмент: имя хоста, токен, TLD, или источник (OpenPhish, DNS, TLS).
4. Не повторяй локальные причины теми же словами.
5. Если локальный анализ видит typo-squat, brand-spoof, punycode, OpenPhish-hit, URLAbuse-hit — НЕ смягчай итог.
6. Если данных мало — честно напиши, но не додумывай.
7. Summary: 1-2 предложения, по существу. Не пиши "выглядит легитимно" если score > 20.
8. scoreDelta: отрицательный для позитива, положительный для риска.
9. Если нет новых полезных причин — верни пустой массив reasons.
10. Анализируй корреляции: несколько слабых сигналов вместе могут означать высокий риск.
11. Обращай внимание на несоответствия: например, известный бренд на подозрительном TLD.
12. Chain-of-thought: Сначала мысленно классифицируй домен (официальный / подозрительный / явный фишинг), затем формулируй вердикт.
13. Scoring guide: low=0-19 (безопасный), medium=20-49 (подозрительный), high=50-100 (опасный). Не ставь score=0 если есть хоть один сигнал.

## ПРИМЕРЫ ХОРОШЕГО И ПЛОХОГО СТИЛЯ
❌ Плохо: "домен выглядит нормально", "есть отдельный поддомен", "используется HTTPS"
✅ Хорошо: "Токен 'riblox' похож на 'roblox' — вероятный typo-squat"
✅ Хорошо: "Redirect на другой домен: ${normalized.host} → [redirect_host]"
✅ Хорошо: "TLS сертификат выдан на *.cloudflare.com, а не на ${normalized.host}"
✅ Хорошо: "DNS не резолвится — домен может быть свежим или уже заблокирован"

## ИЗВЕСТНЫЕ ФИШИНГОВЫЕ ТЕХНИКИ (из реальной базы угроз)
1. **Discord-фишинг**: dicsord, discrod, dlscord, disc0rd, disccord — вариации с заменой букв
2. **Steam-фишинг**: steamcommunity с опечатками (steancommunity, steamcomminity, etc)
3. **Префиксы-ловушки**: free-, get-, claim-, verify-, official-, secure-
4. **Подозрительные TLD**: .tk, .ml, .ga, .cf, .gq, .xyz часто используются для фишинга
5. **Комбинации**: discord-nitro, steam-gift, free-robux — сочетание бренда + приманка

## ФОРМАТ ОТВЕТА (строго JSON)
{"verdict":"low|medium|high","score":0,"summary":"...","reasons":[{"title":"...","detail":"...","tone":"positive|warning|critical","scoreDelta":0}],"actions":["..."]}`;
}

// ─── Groq request with retry ──────────────────────────────────────────────────
async function requestGroq({ apiKey, model, prompt, retries = 0 }) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 8_000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const requestBody = buildGroqRequest(model, prompt);
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify(requestBody),
          },
        );

        const responseText = await response.text();
        let data = null;

        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch {
          data = null;
        }

        log("debug", "Upstream response", {
          model,
          status: response.status,
          contentLength: responseText.length,
          finishReason: data?.choices?.[0]?.finish_reason ?? null,
          hasContent: Boolean(data?.choices?.[0]?.message?.content),
          hasReasoning: Boolean(
            data?.choices?.[0]?.message?.reasoning ||
              data?.choices?.[0]?.message?.reasoning_details?.length,
          ),
        });

        if (!response.ok) {
          if (response.status === 429 && attempt < retries) {
            const retryAfter = Number(response.headers.get("retry-after")) || 2;
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000),
            );
            continue;
          }

          throw new Error(
            `${model}: HTTP ${response.status} — ${sanitizeString(responseText || response.statusText, 200)}`,
          );
        }

        if (!data) {
          throw new Error(`${model}: upstream returned non-JSON payload.`);
        }

        const content = data?.choices?.[0]?.message?.content;
        return extractJson(content);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error(`${model}: upstream request timed out.`);
      } else {
        lastError = error;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

function applyResponseHeaders(res) {
  res.header("Access-Control-Allow-Origin", corsOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
}

export function standardHeaders() {
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

export function healthResponse() {
  return {
    ok: true,
    aiConfigured: Boolean(process.env.GROQ_API_KEY),
    hasLocalEnvFile: fs.existsSync(envLocalFile),
    provider: "groq",
    models: modelCandidates,
    openPhishEnabled: true,
    openPhishFeedUrl,
    openPhishLastRefreshAt: openPhishState.fetchedAt
      ? new Date(openPhishState.fetchedAt).toISOString()
      : null,
    urlAbuseEnabled: Boolean(urlAbuseEmail && urlAbuseToken),
    urlAbuseLastRefreshAt: urlAbuseState.fetchedAt
      ? new Date(urlAbuseState.fetchedAt).toISOString()
      : null,
    cacheEnabled,
    cacheStorage,
    cachePersistent: hasRedisCache,
    uptime: Math.floor(process.uptime()),
  };
}

export async function cacheStatsResponse() {
  let size = responseCache.size;

  if (redisCache) {
    try {
      // O(1) — use scard for count + hash for stats
      const [cardSize, statsHash] = await Promise.all([
        redisCache.scard(cacheIndexKey),
        redisCache.hgetall(cacheStatsKey),
      ]);

      size = cardSize || 0;
      const stats = statsHash || {};

      // Check if stats hash has verdict data
      const hasVerdictData = Object.keys(stats).some(k => k.startsWith('verdict:'));

      if (!hasVerdictData && size > 0) {
        // Lazy migration: stats hash is empty but we have records — rebuild once
        console.log(`[Cache] Stats hash empty, rebuilding from ${size} records...`);
        return await rebuildStatsFromScan();
      }

      const verdicts = {};
      for (const [k, v] of Object.entries(stats)) {
        if (k.startsWith('verdict:')) {
          verdicts[k.replace('verdict:', '')] = Number(v) || 0;
        }
      }

      return {
        size,
        total: size,
        active: size,
        expired: 0,
        verdicts,
        enabled: cacheEnabled,
        storage: cacheStorage,
        persistent: true,
        oldestRecord: stats.oldestRecord ? Number(stats.oldestRecord) : null,
        newestRecord: stats.newestRecord ? Number(stats.newestRecord) : null,
      };
    } catch (error) {
      console.error('[Cache] Error getting Redis stats:', error.message);
      size = null;
    }
  }

  return {
    size,
    enabled: cacheEnabled,
    storage: cacheStorage,
    persistent: hasRedisCache,
  };
}

/**
 * One-time scan to rebuild the stats hash from existing Redis records.
 * Called lazily on the first cacheStatsResponse() when the hash is empty.
 */
async function rebuildStatsFromScan() {
  try {
    const keys = await redisCache.smembers(cacheIndexKey);
    const keyList = (Array.isArray(keys) ? keys : []).slice(0, 500);

    if (keyList.length === 0) {
      return {
        size: 0, total: 0, active: 0, expired: 0,
        verdicts: {},
        enabled: cacheEnabled,
        storage: cacheStorage,
        persistent: true,
        oldestRecord: null,
        newestRecord: null,
      };
    }

    // Fetch records in batches of 50 to avoid giant mget
    const batchSize = 50;
    const allRecords = [];
    for (let i = 0; i < keyList.length; i += batchSize) {
      const batch = keyList.slice(i, i + batchSize);
      const results = await redisCache.mget(...batch);
      allRecords.push(...results);
    }

    const validRecords = allRecords.filter(r => r && r.data);
    const verdicts = {};
    const timestamps = [];

    for (const r of validRecords) {
      const verdict = r.data?.aiAdjustedResult?.verdict || r.data?.enrichedLocalResult?.verdict || r.data?.analysis?.verdict || 'low';
      verdicts[verdict] = (verdicts[verdict] || 0) + 1;

      const ts = r.createdAt || r.updatedAt;
      if (ts && typeof ts === 'number') {
        timestamps.push(ts);
      }
    }

    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newest = timestamps.length > 0 ? Math.max(...timestamps) : null;

    // Persist into the stats hash so future calls are O(1)
    const hashData = {};
    for (const [v, count] of Object.entries(verdicts)) {
      hashData[`verdict:${v}`] = String(count);
    }
    hashData.total = String(validRecords.length);
    if (oldest) hashData.oldestRecord = String(oldest);
    if (newest) hashData.newestRecord = String(newest);
    hashData.rebuiltAt = String(Date.now());

    await redisCache.hset(cacheStatsKey, hashData);
    console.log(`[Cache] Stats hash rebuilt: ${validRecords.length} records, verdicts:`, verdicts);

    return {
      size: validRecords.length,
      total: validRecords.length,
      active: validRecords.length,
      expired: 0,
      verdicts,
      enabled: cacheEnabled,
      storage: cacheStorage,
      persistent: true,
      oldestRecord: oldest,
      newestRecord: newest,
    };
  } catch (error) {
    console.error('[Cache] Error rebuilding stats:', error.message);
    return {
      size: 0, total: 0, active: 0, expired: 0,
      verdicts: {},
      enabled: cacheEnabled,
      storage: cacheStorage,
      persistent: true,
      oldestRecord: null,
      newestRecord: null,
    };
  }
}

export async function adminCacheGetResponse(query = {}, headers = {}) {
  const authError = assertAdminAccess(headers);
  if (authError) return authError;

  const host = String(query?.host || "").trim();
  const limit = Math.max(1, Math.min(50, Number(query?.limit) || 15));

  if (!host) {
    return {
      status: 200,
      body: {
        ok: true,
        recent: await listRecentCacheEntries(limit),
        entry: null,
      },
    };
  }

  const record = await getRawCacheRecordByHost(host);
  return {
    status: 200,
    body: {
      ok: true,
      recent: await listRecentCacheEntries(limit),
      entry: record ? serializeAdminEntry(record) : null,
    },
  };
}

export async function adminCacheUpdateResponse(body = {}, headers = {}) {
  const authError = assertAdminAccess(headers);
  if (authError) return authError;

  const hostInput = String(body?.host || "").trim();
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) {
    return { status: 400, body: { error: normalized.error } };
  }

  const existingRecord = await getRawCacheRecordByHost(normalized.host);
  if (!existingRecord?.data) {
    return { status: 404, body: { error: "Запись не найдена в кэше." } };
  }

  const nextData = applyAdminEditsToResponseData(existingRecord.data, body?.edits || {}, normalized.host);
  const savedRecord = await saveRawCacheRecord({
    ...existingRecord,
    host: normalized.host,
    data: nextData,
  });

  return {
    status: 200,
    body: {
      ok: true,
      entry: serializeAdminEntry(savedRecord),
    },
  };
}

export async function adminCacheDeleteResponse(query = {}, headers = {}) {
  const authError = assertAdminAccess(headers);
  if (authError) return authError;

  const hostInput = String(query?.host || "").trim();
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) {
    return { status: 400, body: { error: normalized.error } };
  }

  const deleted = await deleteRawCacheRecordByHost(normalized.host);
  return {
    status: deleted ? 200 : 404,
    body: deleted ? { ok: true } : { error: "Запись не найдена в кэше." },
  };
}

export async function analyzeResponse(body = {}, meta = {}) {
  const startTime = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  const input = String(body?.input || "");
  const localAnalysis = body?.localAnalysis || null;
  const skipCache = body?.skipCache === true;
  const telemetryConsent = body?.telemetryConsent === true;
  const rateLimitHit = consumeRateLimit(meta.ip || "unknown");

  if (rateLimitHit) {
    return { status: 429, body: rateLimitHit };
  }

  const normalized = normalizeInput(input);
  if ("error" in normalized) {
    return { status: 400, body: { error: normalized.error } };
  }

  log("info", "Analyze request", { host: normalized.host });

  const [threatIntel, urlAbuseIntel, networkSignals] = await Promise.all([
    lookupThreatIntel(normalized).catch((error) => {
      const message =
        error instanceof Error ? sanitizeString(error.message, 120) : "Threat intel failed.";
      log("warn", "Threat intel failed", {
        host: normalized.host,
        error: message,
      });
      return {
        source: "openphish",
        status: "unavailable",
        note: `OpenPhish недоступен: ${message}`,
        checkedAt: new Date().toISOString(),
      };
    }),
    lookupUrlAbuseIntel(normalized).catch((error) => {
      const message =
        error instanceof Error ? sanitizeString(error.message, 120) : "URLAbuse failed.";
      log("warn", "URLAbuse lookup failed", {
        host: normalized.host,
        error: message,
      });
      return {
        source: "urlabuse",
        status: "unavailable",
        note: `URLAbuse недоступен: ${message}`,
        checkedAt: new Date().toISOString(),
      };
    }),
    lookupNetworkSignals(normalized).catch((error) => {
      const message =
        error instanceof Error
          ? sanitizeString(error.message, 120)
          : "Network signal lookup failed.";
      log("warn", "Network signal lookup failed", {
        host: normalized.host,
        error: message,
      });
      return {
        source: "network",
        checkedAt: new Date().toISOString(),
        dns: {
          resolved: false,
          ipv4Count: 0,
          ipv6Count: 0,
          cnames: [],
          note: `DNS недоступен: ${message}`,
        },
        http: {
          reachable: false,
          status: null,
          redirected: false,
          redirectHost: null,
          note: `HTTP недоступен: ${message}`,
        },
        tls: {
          available: false,
          subject: null,
          issuer: null,
          validTo: null,
          note: `TLS недоступен: ${message}`,
        },
      };
    }),
  ]);

  // Применяем сетевые сигналы как дополнительные reasons
  const networkEnrichedAnalysis = applyNetworkSignalsToAnalysis(
    localAnalysis,
    networkSignals,
    normalized,
  );

  const threatEnrichedAnalysis = applyThreatIntelToAnalysis(
    networkEnrichedAnalysis,
    threatIntel,
    normalized,
  );
  const enrichedLocalAnalysis = applyUrlAbuseToAnalysis(
    threatEnrichedAnalysis,
    urlAbuseIntel,
    normalized,
  );

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "GROQ_API_KEY не настроен. Создайте .env.local на основе .env.example.",
        detail: "AI backend поднят, но без ключа Groq.",
        threatIntel,
        urlAbuseIntel,
        networkSignals,
        enrichedLocalResult: enrichedLocalAnalysis,
      },
    };
  }

  const cacheKey = getCacheKey(input, enrichedLocalAnalysis, normalized);
  if (!skipCache) {
    const cached = await getCachedResponse(cacheKey, normalized);
    if (cached) {
      log("info", "Cache hit", { host: normalized.host, storage: cacheStorage });
      return { status: 200, body: { ...cached, cached: true } };
    }
    log("debug", "Cache miss", { host: normalized.host, cacheKey, storage: cacheStorage });
  }

  const prompt = buildPrompt(
    input,
    normalized,
    enrichedLocalAnalysis,
    networkSignals,
    threatIntel,
    urlAbuseIntel,
  );
  const attempts = [];

  for (const model of modelCandidates) {
    try {
      const parsed = await requestGroq({
        apiKey,
        model,
        prompt,
        retries: 0,
      });
      const analysis = sanitizeAnalysis(parsed, input, enrichedLocalAnalysis);
      const aiAdjustedResult = applyAiToAnalysis(
        enrichedLocalAnalysis,
        analysis,
        normalized,
      );
      const responseData = {
        analysis,
        aiAdjustedResult,
        model,
        source: "groq",
        threatIntel,
        urlAbuseIntel,
        networkSignals,
        enrichedLocalResult: enrichedLocalAnalysis,
        latencyMs: Date.now() - startTime,
      };

      await setCachedResponse(cacheKey, responseData, telemetryConsent);

      log("info", "Analyze success", {
        host: normalized.host,
        model,
        verdict: analysis.verdict,
        latencyMs: responseData.latencyMs,
      });

      return { status: 200, body: responseData };
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? sanitizeString(error.message, 300)
          : "Unknown model error.";
      attempts.push({ model, error: errorMsg });
      log("warn", "Model failed", { model, error: errorMsg });
    }
  }

  log("error", "All models failed", {
    host: normalized.host,
    attempts: attempts.length,
  });

  return {
    status: 502,
      body: {
        error: "Groq request failed.",
        detail: attempts.at(-1)?.error || "Все модели вернули ошибку.",
        attempts: attempts.slice(0, 5),
        threatIntel,
        urlAbuseIntel,
        networkSignals,
        enrichedLocalResult: enrichedLocalAnalysis,
      },
    };
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json(healthResponse());
});

app.get("/api/cache/stats", async (_req, res) => {
  res.json(await cacheStatsResponse());
});

app.get("/api/admin/cache", async (req, res) => {
  const response = await adminCacheGetResponse(req.query, req.headers);
  res.status(response.status).json(response.body);
});

app.get("/api/admin-cache", async (req, res) => {
  const response = await adminCacheGetResponse(req.query, req.headers);
  res.status(response.status).json(response.body);
});

app.patch("/api/admin/cache", async (req, res) => {
  const response = await adminCacheUpdateResponse(req.body, req.headers);
  res.status(response.status).json(response.body);
});

app.patch("/api/admin-cache", async (req, res) => {
  const response = await adminCacheUpdateResponse(req.body, req.headers);
  res.status(response.status).json(response.body);
});

app.delete("/api/admin/cache", async (req, res) => {
  const response = await adminCacheDeleteResponse(req.query, req.headers);
  res.status(response.status).json(response.body);
});

app.delete("/api/admin-cache", async (req, res) => {
  const response = await adminCacheDeleteResponse(req.query, req.headers);
  res.status(response.status).json(response.body);
});

app.post("/api/analyze", async (req, res) => {
  const response = await analyzeResponse(req.body, { ip: req.ip });
  res.status(response.status).json(response.body);
});

import reportHandler from "../api/report.mjs";

app.all("/api/report", async (req, res) => {
  try {
    await reportHandler(req, res);
  } catch (error) {
    log("error", "Report error", { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: "Ошибка при обработке жалобы." });
  }
});

app.get("/api/lookup", async (req, res) => {
  const url = String(req.query?.url || req.query?.link || "").trim();
  
  if (!url) {
    res.status(400).json({ error: "Параметр url или link обязателен." });
    return;
  }

  const normalized = normalizeInput(url);
  if ("error" in normalized) {
    res.status(400).json({ error: normalized.error });
    return;
  }

  const record = await getRawCacheRecordByHost(normalized.host);
  
  if (!record?.data) {
    res.status(404).json({ 
      error: "Данные для этого домена не найдены в кэше.",
      host: normalized.host,
      suggestion: "Выполните анализ через /api/analyze для получения данных."
    });
    return;
  }

  const result = record.data.aiAdjustedResult || record.data.enrichedLocalResult || record.data.analysis;
  
  res.status(200).json({
    ok: true,
    host: normalized.host,
    cached: true,
    cachedAt: record.createdAt || null,
    updatedAt: record.updatedAt || null,
    result: {
      verdict: result?.verdict || "unknown",
      score: result?.score || 0,
      verdictLabel: result?.verdictLabel || "Неизвестно",
      summary: result?.summary || "",
      reasons: result?.reasons || [],
      actions: result?.actions || [],
      breakdown: result?.breakdown || null,
      analyzedAt: result?.analyzedAt || null,
    },
    model: record.data.model || null,
    source: record.data.source || "cache",
  });
});

app.use((err, _req, res, _next) => {
  log("error", "Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Внутренняя ошибка сервера." });
});

// ─── Static files ─────────────────────────────────────────────────────────────
if (fs.existsSync(indexFile)) {
  app.use(express.static(distDir, { maxAge: "1h" }));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(indexFile);
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT || 8787);

export default app;

// Экспорт функций для тестирования
export { getCachedResponse, setCachedResponse, getRawCacheRecordByHost, saveRawCacheRecord, normalizeInput };

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(port, () => {
    log("info", "Groq proxy listening", {
      port,
      provider: "groq",
      models: modelCandidates,
      cacheEnabled,
      corsOrigin,
    });
  });
}
