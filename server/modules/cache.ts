import { createHash, timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";
import { buildBreakdown, log, normalizeCacheHostInput, normalizeInput, sanitizeString } from "./utils.ts";

export const cacheEnabled = process.env.CACHE_ENABLED !== "false";
export const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
export const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
export const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
export const cacheRecordPrefix = `${cachePrefix}:record`;
export const cacheHostPrefix = `${cachePrefix}:host`;
export const cacheIndexKey = `${cachePrefix}:keys`;
export const cacheStatsKey = `${cachePrefix}:stats`;
export const legacyCachePrefixes = String(
  process.env.THREAT_CACHE_LEGACY_PREFIXES || "threat-cache:v7,threat-cache:v6",
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean)
  .filter((value) => value !== cachePrefix);
export const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
export const redisRestToken =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
export const hasRedisCache = Boolean(cacheEnabled && redisRestUrl && redisRestToken);
export const cacheStorage = hasRedisCache ? "redis" : "memory";
export const adminToken = process.env.ADMIN_TOKEN || "";
export const responseCache = new Map<string, any>();
export const redisCache = hasRedisCache
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

export function sanitizeCacheInput(input: string, normalized: any) {
  if (normalized?.url instanceof URL) {
    const url = new URL(normalized.url.toString());
    url.username = "";
    url.password = "";
    url.pathname = "/";
    url.search = "";
    url.hash = "";

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
      url.hostname = hostname;
    }

    return url.toString().toLowerCase();
  }

  return String(input || "").trim().toLowerCase();
}

export function getCacheKey(input: string, localAnalysis: any, normalized: any) {
  const payload = JSON.stringify({
    version: cacheVersion,
    input: sanitizeCacheInput(input, normalized),
    verdict: localAnalysis?.verdict,
    score: localAnalysis?.score,
    summary: String(localAnalysis?.summary || "").trim().slice(0, 180),
    reasons: Array.isArray(localAnalysis?.reasons)
      ? localAnalysis.reasons
          .slice(0, 4)
          .map((reason: any) => [reason.title, reason.scoreDelta, reason.tone])
      : [],
    actions: Array.isArray(localAnalysis?.actions)
      ? localAnalysis.actions.slice(0, 3)
      : [],
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function getCacheRecordKey(key: string) {
  return `${cacheRecordPrefix}:${key}`;
}

export function getCacheHostKey(host: string) {
  return `${cacheHostPrefix}:${String(host || "unknown").toLowerCase()}`;
}

export function getCacheRecordKeyForPrefix(prefix: string, key: string) {
  return `${prefix}:record:${key}`;
}

export function getCacheHostKeyForPrefix(prefix: string, host: string) {
  return `${prefix}:host:${String(host || "unknown").toLowerCase()}`;
}

export function buildCacheRecord(key: string, data: any, existingRecord: any = null) {
  const host =
    data?.aiAdjustedResult?.host ||
    data?.enrichedLocalResult?.host ||
    data?.analysis?.host ||
    null;

  const now = Date.now();

  const result = data?.aiAdjustedResult || data?.enrichedLocalResult || data?.analysis;

  return {
    key,
    host,
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
    data,
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

export async function getCachedResponse(key: string, normalized: any = null) {
  if (!cacheEnabled) return null;

  async function retryOperation(operation: () => Promise<any>, maxRetries = 3, delayMs = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`[Cache] Attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  if (redisCache) {
    try {
      const entry = await retryOperation(async () => {
        let result = await redisCache.get(getCacheRecordKey(key));
        if (!result || !(result as any).data) {
          for (const prefix of legacyCachePrefixes) {
            result = await redisCache.get(getCacheRecordKeyForPrefix(prefix, key));
            if (result && (result as any).data) {
              console.log(`[Cache] Found in legacy prefix: ${prefix}`);
              break;
            }
          }
        }
        return result;
      });

      if (entry && (entry as any).data) {
        console.log(`[Cache] Redis hit for key: ${key}`);
        return {
          ...(entry as any).data,
          cached: true,
          cacheStorage,
          cachedAt: (entry as any).createdAt || null,
        };
      }
      console.log(`[Cache] Redis miss for key: ${key}`);
    } catch (error: any) {
      console.error(`[Cache] Redis error, falling back to memory:`, error.message);
    }
  }

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
  } catch (error: any) {
    console.error(`[Cache] Memory cache error:`, error.message);
  }

  return null;
}

export async function setCachedResponse(key: string, data: any, telemetryConsent = false) {
  if (!cacheEnabled || !telemetryConsent) return;

  let host = data?.aiAdjustedResult?.host || data?.enrichedLocalResult?.host || data?.analysis?.host;
  if (!host) {
    console.warn('[Cache] Cannot save: no host found in data');
    return;
  }

  if (host.startsWith('www.')) {
    host = host.substring(4);
  }

  async function retryWrite(operation: () => Promise<any>, maxRetries = 3, delayMs = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`[Cache] Write attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  let existingRecord: any = null;
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
  } catch (error: any) {
    console.error('[Cache] Error checking existing record:', error.message);
  }

  const record = buildCacheRecord(key, data, existingRecord);
  record.host = host;

  if (redisCache) {
    try {
      await retryWrite(async () => {
        const ttlSeconds = 7 * 24 * 60 * 60;

        const writes: Promise<any>[] = [
          redisCache.set(getCacheRecordKey(key), record, { ex: ttlSeconds }),
          redisCache.sadd(cacheIndexKey, getCacheRecordKey(key)),
        ];

        if (record.host) {
          writes.push(redisCache.set(getCacheHostKey(record.host), key, { ex: ttlSeconds }));
        }

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
    } catch (error: any) {
      console.error(`[Cache] Redis save failed, falling back to memory:`, error.message);
    }
  }

  try {
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
  } catch (error: any) {
    console.error(`[Cache] Memory save failed:`, error.message);
  }
}

export function getAdminTokenFromHeaders(headers: Record<string, any> = {}) {
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

export function assertAdminAccess(headers: Record<string, any> = {}) {
  if (!adminToken) {
    return {
      status: 503,
      body: { error: "ADMIN_TOKEN не настроен." },
    };
  }

  const providedToken = getAdminTokenFromHeaders(headers);

  if (!providedToken) {
    return {
      status: 401,
      body: { error: "Недостаточно прав." },
    };
  }

  const providedBuffer = Buffer.from(providedToken);
  const adminBuffer = Buffer.from(adminToken);

  if (providedBuffer.length !== adminBuffer.length || !timingSafeEqual(providedBuffer, adminBuffer)) {
    return {
      status: 401,
      body: { error: "Недостаточно прав." },
    };
  }

  return null;
}

export function serializeAdminEntry(record: any) {
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

export async function getRawCacheRecordByHost(hostInput: string) {
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) {
    console.warn(`[Cache] Invalid host input: ${hostInput}`);
    return null;
  }

  async function retryOperation(operation: () => Promise<any>, maxRetries = 2, delayMs = 100) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        console.error(`[Cache] getRawCacheRecordByHost attempt ${attempt}/${maxRetries} failed:`, error.message);
        if (attempt === maxRetries) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  if (redisCache) {
    try {
      const recordKey = await retryOperation(async () => {
        let key = await redisCache.get(getCacheHostKey(normalized.host as string));
        if (!key) {
          for (const prefix of legacyCachePrefixes) {
            key = await redisCache.get(getCacheHostKeyForPrefix(prefix, normalized.host as string));
            if (key) {
              console.log(`[Cache] Found host in legacy prefix: ${prefix}`);
              break;
            }
          }
        }
        return key;
      });

      if (recordKey) {
        const record = await retryOperation(() =>
          redisCache.get(typeof recordKey === 'string' ? getCacheRecordKey(recordKey) : getCacheHostKey(normalized.host as string))
        );

        if (record && (record as any).data) {
          console.log(`[Cache] Redis hit for host: ${normalized.host}`);
          return record;
        }
      }
      console.log(`[Cache] Redis miss for host: ${normalized.host}`);
    } catch (error: any) {
      console.error(`[Cache] Redis error in getRawCacheRecordByHost, falling back to memory:`, error.message);
    }
  }

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

    const latest = matchingRecords.reduce((latest, current) => {
      const latestTime = Number(latest?.updatedAt || latest?.createdAt || 0);
      const currentTime = Number(current?.updatedAt || current?.createdAt || 0);
      return currentTime > latestTime ? current : latest;
    });

    console.log(`[Cache] Memory hit for host: ${normalized.host}`);
    return latest;
  } catch (error: any) {
    console.error(`[Cache] Memory cache error in getRawCacheRecordByHost:`, error.message);
    return null;
  }
}

export async function saveRawCacheRecord(record: any) {
  if (!record?.key) return;

  const normalizedHost = record.host || record?.data?.aiAdjustedResult?.host || record?.data?.analysis?.host;
  const nextRecord = {
    ...record,
    host: normalizedHost || record.host || null,
    updatedAt: Date.now(),
  };

  if (redisCache) {
    if (nextRecord.host) {
      const oldRecord: any = await redisCache.get(getCacheHostKey(nextRecord.host));
      if (oldRecord?.key && oldRecord.key !== nextRecord.key) {
        await Promise.all([
          redisCache.del(getCacheRecordKey(oldRecord.key)),
          redisCache.srem(cacheIndexKey, getCacheRecordKey(oldRecord.key)),
        ]);
      }
    }

    const writes: Promise<any>[] = [
      redisCache.set(getCacheRecordKey(nextRecord.key), nextRecord),
      redisCache.sadd(cacheIndexKey, getCacheRecordKey(nextRecord.key)),
    ];

    if (nextRecord.host) {
      writes.push(redisCache.set(getCacheHostKey(nextRecord.host), nextRecord.key));
    }

    const verdict = nextRecord.data?.aiAdjustedResult?.verdict || nextRecord.data?.enrichedLocalResult?.verdict || nextRecord.data?.analysis?.verdict || 'low';
    writes.push(
      redisCache.hincrby(cacheStatsKey, 'total', 1),
      redisCache.hincrby(cacheStatsKey, `verdict:${verdict}`, 1),
      redisCache.hset(cacheStatsKey, { newestRecord: String(nextRecord.updatedAt || Date.now()) }),
    );

    await Promise.all(writes);
    return nextRecord;
  }

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

export async function deleteRawCacheRecordByHost(hostInput: string) {
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) return false;

  if (redisCache) {
    const hostKey = getCacheHostKey(normalized.host as string);
    const record = await redisCache.get(hostKey);
    if (!record) return false;

    const recordKey = typeof record === 'string' ? record : (record as any).key;
    if (!recordKey) return false;

    await Promise.all([
      redisCache.del(hostKey),
      redisCache.del(getCacheRecordKey(recordKey)),
      redisCache.srem(cacheIndexKey, getCacheRecordKey(recordKey)),
    ]);
    return true;
  }

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

export async function listRecentCacheEntries(limit = 20) {
  let records: any[] = [];

  if (redisCache) {
    try {
      const keys = await redisCache.smembers(cacheIndexKey);
      const keyList = (Array.isArray(keys) ? keys : []).slice(0, 200);

      if (keyList.length > 0) {
        console.log(`[Cache] Fetching ${keyList.length} records with MGET`);
        const values = await redisCache.mget(...keyList);
        records = values.filter((v: any) => v !== null && v?.data);
      }
    } catch (error: any) {
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

// Stats rebuilding
export async function rebuildStatsFromScan() {
  try {
    if (!redisCache) return null;
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

    const batchSize = 50;
    const allRecords: any[] = [];
    for (let i = 0; i < keyList.length; i += batchSize) {
      const batch = keyList.slice(i, i + batchSize);
      const results = await redisCache.mget(...batch);
      allRecords.push(...results);
    }

    const validRecords = allRecords.filter(r => r && r.data);
    const verdicts: Record<string, number> = {};
    const timestamps: number[] = [];

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

    const hashData: Record<string, string> = {};
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
  } catch (error: any) {
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

import { applyAdminEditsToResponseData } from "./ai.ts";

export async function adminCacheGetResponse(query: any = {}, headers: any = {}) {
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

export async function adminCacheUpdateResponse(body: any = {}, headers: any = {}) {
  const authError = assertAdminAccess(headers);
  if (authError) return authError;

  const hostInput = String(body?.host || "").trim();
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) {
    return { status: 400, body: { error: normalized.error } };
  }

  const existingRecord = await getRawCacheRecordByHost(normalized.host as string);
  if (!existingRecord?.data) {
    return { status: 404, body: { error: "Запись не найдена в кэше." } };
  }

  const nextData = applyAdminEditsToResponseData(existingRecord.data, body?.edits || {}, normalized.host as string);
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

export async function adminCacheDeleteResponse(query: any = {}, headers: any = {}) {
  const authError = assertAdminAccess(headers);
  if (authError) return authError;

  const hostInput = String(query?.host || "").trim();
  const normalized = normalizeCacheHostInput(hostInput);
  if ("error" in normalized) {
    return { status: 400, body: { error: normalized.error } };
  }

  const deleted = await deleteRawCacheRecordByHost(normalized.host as string);
  return {
    status: deleted ? 200 : 404,
    body: deleted ? { ok: true } : { error: "Запись не найдена в кэше." },
  };
}
