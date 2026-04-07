import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";

import { log, normalizeInput, sanitizeString, standardHeaders } from "./modules/utils.ts";
import { lookupThreatIntel, lookupUrlAbuseIntel, openPhishFeedUrl, openPhishState, urlAbuseEmail, urlAbuseToken, urlAbuseState } from "./modules/threat-intel.ts";
import { lookupNetworkSignals, applyNetworkSignalsToAnalysis } from "./modules/network.ts";
import { applyThreatIntelToAnalysis, applyUrlAbuseToAnalysis } from "./modules/threat-intel.ts";
import {
  adminCacheDeleteResponse,
  adminCacheGetResponse,
  adminCacheUpdateResponse,
  cacheEnabled,
  cacheStatsKey,
  cacheStorage,
  getCacheKey,
  getCachedResponse,
  getRawCacheRecordByHost,
  hasRedisCache,
  rebuildStatsFromScan,
  redisCache,
  responseCache,
  setCachedResponse,
  cacheIndexKey
} from "./modules/cache.ts";
import { applyAiToAnalysis, buildPrompt, modelCandidates, requestGroq, sanitizeAnalysis } from "./modules/ai.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const indexFile = path.join(distDir, "index.html");
const envLocalFile = path.join(rootDir, ".env.local");
const envFile = path.join(rootDir, ".env");

dotenv.config({ path: envLocalFile });
dotenv.config({ path: envFile });

const corsOrigin = process.env.CORS_ORIGIN || "";
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX) || 30;
const rateBuckets = new Map<string, { windowStart: number; count: number }>();

function consumeRateLimit(key: string) {
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

function rateLimit(req: express.Request, res: express.Response, next: express.NextFunction) {
  const limited = consumeRateLimit(req.ip || req.socket.remoteAddress || "unknown");
  if (limited) {
    res.status(429).json(limited);
    return;
  }
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.windowStart > rateLimitWindowMs * 2) {
      rateBuckets.delete(key);
    }
  }
}, rateLimitWindowMs * 3);


app.use(express.json({ limit: "256kb" }));

app.use((req, res, next) => {
  if (corsOrigin) {
    res.header("Access-Control-Allow-Origin", corsOrigin);
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
  let size: number | null = responseCache.size;
  let dbSize = 0;

  if (redisCache) {
    try {
      const promises = [
        redisCache.scard(cacheIndexKey),
        redisCache.hgetall(cacheStatsKey),
      ];
      if (typeof redisCache.info === 'function') {
        promises.push(redisCache.info().catch(() => ""));
      } else {
        promises.push(Promise.resolve(""));
      }

      const [cardSize, statsHash, infoStr] = await Promise.all(promises);

      size = cardSize || 0;
      const stats = (statsHash as Record<string, string>) || {};

      if (infoStr && typeof infoStr === 'string') {
        const match = infoStr.match(/used_memory:(\d+)/);
        if (match && match[1]) {
          dbSize = parseInt(match[1], 10);
        }
      }

      if (!dbSize && size > 0) {
        dbSize = size * 1850;
      }

      const hasVerdictData = Object.keys(stats).some(k => k.startsWith('verdict:'));

      if (!hasVerdictData && size > 0) {
        console.log(`[Cache] Stats hash empty, rebuilding from ${size} records...`);
        return await rebuildStatsFromScan();
      }

      const verdicts: Record<string, number> = {};
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
        dbSize,
      };
    } catch (error: any) {
      console.error('[Cache] Error getting Redis stats:', error.message);
      size = null;
    }
  } else {
    dbSize = JSON.stringify([...responseCache.values()]).length;
  }

  return {
    size,
    dbSize,
    enabled: cacheEnabled,
    storage: cacheStorage,
    persistent: hasRedisCache,
  };
}

export async function analyzeResponse(body: any = {}, meta: any = {}) {
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

import reportHandler from "../api/report.ts";

app.all("/api/report", async (req, res) => {
  try {
    await reportHandler(req, res);
  } catch (error: any) {
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

  const record = await getRawCacheRecordByHost(normalized.host as string);

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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log("error", "Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ error: "Внутренняя ошибка сервера." });
});

if (fs.existsSync(indexFile)) {
  app.use(express.static(distDir, { maxAge: "1h" }));

  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(indexFile);
  });
}

const port = Number(process.env.PORT || 8787);

export default app;

export { standardHeaders };

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
