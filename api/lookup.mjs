import { standardHeaders } from "../server/openrouter-proxy.mjs";

function normalizeInput(input) {
  const raw = String(input || "").trim();

  if (!raw) {
    return { error: "Введите домен или ссылку." };
  }

  if (raw.length > 2048) {
    return { error: "Слишком длинный ввод. Максимум 2048 символов." };
  }

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

async function getRawCacheRecordByHost(host) {
  // Эта функция должна быть импортирована из openrouter-proxy.mjs
  // Для Vercel serverless функций нужно использовать Redis напрямую
  const { Redis } = await import("@upstash/redis");
  
  const redisRestUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const redisRestToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  
  if (!redisRestUrl || !redisRestToken) {
    return null;
  }

  const redis = new Redis({
    url: redisRestUrl,
    token: redisRestToken,
  });

  const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
  const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
  const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
  const cacheHostPrefix = `${cachePrefix}:host`;

  const hostKey = `${cacheHostPrefix}:${String(host || "unknown").toLowerCase()}`;
  const record = await redis.get(hostKey);

  return record?.data ? record : null;
}

export default async function handler(req, res) {
  const headers = standardHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

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
      suggestion: "Выполните анализ через /api/analyze для получения данных.",
    });
    return;
  }

  const result =
    record.data.aiAdjustedResult ||
    record.data.enrichedLocalResult ||
    record.data.analysis;

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
}
