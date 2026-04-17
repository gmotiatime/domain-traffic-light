import { analyzeResponse, standardHeaders, extractClientIp, consumeRateLimit } from "../server/openrouter-proxy.mjs";
import { analyzeSchema } from "./schemas.mjs";

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


  const ip = extractClientIp(req);
  const rateLimitHit = consumeRateLimit(ip);
  if (rateLimitHit) {
    res.status(429).json({ error: "Слишком много запросов. Подождите немного." });
    return;
  }


  let body = req.body || {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body || "{}");
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON payload" });
      return;
    }
  }

  const parsedBody = analyzeSchema.safeParse(body);
  if (!parsedBody.success) {
    res.status(400).json({
      error: "Ошибка валидации входных данных",
      details: parsedBody.error.errors,
    });
    return;
  }

  const response = await analyzeResponse(parsedBody.data, { ip });
  res.status(response.status).json(response.body);
}
