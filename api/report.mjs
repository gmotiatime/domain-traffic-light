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
  const headers = standardHeaders();

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

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const { host, verdict, score, reportText } = body;

    if (!host || !reportText) {
      res.status(400).json({ error: "Поля host и reportText обязательны." });
      return;
    }

    const normalized = normalizeHost(host);
    
    // Подключение к Redis
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

    const cacheVersion = String(process.env.THREAT_CACHE_VERSION || "stable").trim();
    const configuredCachePrefix = String(process.env.THREAT_CACHE_PREFIX || "").trim();
    const cachePrefix = configuredCachePrefix || `threat-cache:${cacheVersion}`;
    const cacheHostPrefix = `${cachePrefix}:host`;
    const hostKey = `${cacheHostPrefix}:${normalized}`;

    // Получаем существующую запись
    let record = await redis.get(hostKey);
    
    if (!record) {
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

    // Сохраняем обратно в Redis
    await redis.set(hostKey, record);

    res.status(200).json({
      ok: true,
      message: "Жалоба успешно отправлена.",
      host: normalized,
      reportsCount: record.reports.length,
    });
  } catch (error) {
    console.error("[API] Report error:", error);
    res.status(500).json({ error: "Ошибка при сохранении жалобы." });
  }
}
