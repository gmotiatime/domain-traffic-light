import { cacheStatsResponse, standardHeaders, consumeRateLimit, extractClientIp } from "../server/openrouter-proxy.mjs";

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


  const ip = extractClientIp(req);
  const rateLimitHit = consumeRateLimit(ip);
  if (rateLimitHit) {
    res.status(429).json({ error: "Слишком много запросов. Подождите немного." });
    return;
  }

  res.status(200).json(await cacheStatsResponse());
}
