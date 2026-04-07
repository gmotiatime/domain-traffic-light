import { standardHeaders } from "../server/index.ts";
import { getRawCacheRecordByHost } from "../server/modules/cache.ts";
import { normalizeInput } from "../server/modules/utils.ts";

export default async function handler(req: any, res: any) {
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
