import fs from "node:fs";
import path from "node:path";
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

dotenv.config({ path: envLocalFile });
dotenv.config({ path: envFile });

const corsOrigin = process.env.CORS_ORIGIN || "*";
const app = express();

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

// ─── Кэш ответов AI ──────────────────────────────────────────────────────────
const cacheEnabled = process.env.CACHE_ENABLED !== "false";
const cacheTtlMs = Number(process.env.CACHE_TTL_MS) || 5 * 60_000;
const cacheMaxSize = Number(process.env.CACHE_MAX_SIZE) || 500;
const responseCache = new Map();
const openPhishFeedUrl =
  process.env.OPENPHISH_FEED_URL ||
  "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
const openPhishRefreshMs =
  Number(process.env.OPENPHISH_REFRESH_MS) || 30 * 60_000;

const openPhishState = {
  urls: new Set(),
  hosts: new Map(),
  fetchedAt: 0,
  loadingPromise: null,
  lastError: null,
};

function getCacheKey(input, localAnalysis) {
  const payload = JSON.stringify({
    version: 4,
    input: String(input || "").trim().toLowerCase(),
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

function getCachedResponse(key) {
  if (!cacheEnabled) return null;
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > cacheTtlMs) {
    responseCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedResponse(key, data) {
  if (!cacheEnabled) return;
  if (responseCache.size >= cacheMaxSize) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
  responseCache.set(key, { data, createdAt: Date.now() });
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
  "openai/gpt-oss-120b,llama-3.3-70b-versatile,llama-3.1-8b-instant"
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
    temperature: 0,
    max_tokens: Number(process.env.AI_MAX_TOKENS) || 500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a strict phishing/domain risk analyst. Return only valid JSON. All text content must be in Russian.",
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

  const actions = Array.isArray(aiPayload?.actions)
    ? aiPayload.actions
        .slice(0, 5)
        .map((item) => sanitizeString(item, 200))
        .filter(Boolean)
    : defaultActions(verdict);

  // Объединяем локальные и AI-причины (без дублей по title)
  const mergedReasons = [...reasons];
  if (Array.isArray(localAnalysis?.reasons)) {
    const existingTitles = new Set(mergedReasons.map((r) => r.title.toLowerCase()));
    for (const lr of localAnalysis.reasons) {
      if (!existingTitles.has(lr.title.toLowerCase())) {
        mergedReasons.push(lr);
      }
    }
  }

  return {
    host: normalized.host,
    score,
    verdict,
    verdictLabel: verdictLabel(verdict),
    summary: sanitizeString(
      aiPayload?.summary || localAnalysis?.summary || "",
      600,
    ),
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

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(input, normalized, localAnalysis) {
  const localReasons = Array.isArray(localAnalysis?.reasons)
    ? localAnalysis.reasons
        .slice(0, 3)
        .map((reason) => `${reason.title}: ${reason.detail}`)
        .join("; ")
    : "";

  return `Проанализируй домен или ссылку на признаки фишинга.

host: ${normalized.host}
path: ${normalized.url.pathname || "/"}
local_verdict: ${localAnalysis?.verdict || "unknown"}
local_score: ${Number.isFinite(Number(localAnalysis?.score)) ? Number(localAnalysis.score) : 0}
local_summary: ${sanitizeString(localAnalysis?.summary || "", 220)}
local_reasons: ${sanitizeString(localReasons, 360)}

Верни только валидный JSON на русском.
Причин максимум 3. Действий максимум 3.
Заголовок каждой причины должен быть коротким: 1-3 слова, без нумерации, без "Сигнал 1", без "Наблюдение 2".
Не придумывай проверки, которых у тебя нет. Не утверждай факты о DNS, SSL, blacklists или репутации, если они не следуют из локального анализа или из самой структуры URL.
Если данных мало, честно скажи об ограничении в summary.

Формат:
{"verdict":"low|medium|high","score":0,"summary":"...","reasons":[{"title":"...","detail":"...","tone":"positive|warning|critical"}],"actions":["..."]}`;
}

// ─── Groq request with retry ──────────────────────────────────────────────────
async function requestGroq({ apiKey, model, prompt, retries = 1 }) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 30_000;
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
    cacheEnabled,
    uptime: Math.floor(process.uptime()),
  };
}

export function cacheStatsResponse() {
  return {
    size: responseCache.size,
    maxSize: cacheMaxSize,
    ttlMs: cacheTtlMs,
    enabled: cacheEnabled,
  };
}

export async function analyzeResponse(body = {}, meta = {}) {
  const startTime = Date.now();
  const apiKey = process.env.GROQ_API_KEY;
  const input = String(body?.input || "");
  const localAnalysis = body?.localAnalysis || null;
  const skipCache = body?.skipCache === true;
  const rateLimitHit = consumeRateLimit(meta.ip || "unknown");

  if (rateLimitHit) {
    return { status: 429, body: rateLimitHit };
  }

  const normalized = normalizeInput(input);
  if ("error" in normalized) {
    return { status: 400, body: { error: normalized.error } };
  }

  log("info", "Analyze request", { host: normalized.host });

  const threatIntel = await lookupThreatIntel(normalized).catch((error) => {
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
  });

  const enrichedLocalAnalysis = applyThreatIntelToAnalysis(
    localAnalysis,
    threatIntel,
    normalized,
  );

  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: "GROQ_API_KEY не настроен. Создайте .env.local на основе .env.example.",
        detail: "AI backend поднят, но без ключа Groq.",
        threatIntel,
        enrichedLocalResult: enrichedLocalAnalysis,
      },
    };
  }

  const cacheKey = getCacheKey(input, enrichedLocalAnalysis);
  if (!skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      log("info", "Cache hit", { host: normalized.host });
      return { status: 200, body: { ...cached, cached: true } };
    }
    log("debug", "Cache miss", { host: normalized.host, cacheKey });
  }

  const prompt = buildPrompt(input, normalized, enrichedLocalAnalysis);
  const attempts = [];

  for (const model of modelCandidates) {
    try {
      const parsed = await requestGroq({
        apiKey,
        model,
        prompt,
        retries: 1,
      });
      const analysis = sanitizeAnalysis(parsed, input, localAnalysis);
      const responseData = {
        analysis,
        model,
        source: "groq",
        threatIntel,
        enrichedLocalResult: enrichedLocalAnalysis,
        latencyMs: Date.now() - startTime,
      };

      setCachedResponse(cacheKey, responseData);

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
      enrichedLocalResult: enrichedLocalAnalysis,
    },
  };
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json(healthResponse());
});

app.get("/api/cache/stats", (_req, res) => {
  res.json(cacheStatsResponse());
});

app.post("/api/analyze", async (req, res) => {
  const response = await analyzeResponse(req.body, { ip: req.ip });
  res.status(response.status).json(response.body);
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
