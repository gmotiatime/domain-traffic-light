import { generateQuizScenarioResponse, standardHeaders, consumeRateLimit } from "../server/openrouter-proxy.mjs";

export default async function handler(req, res) {
  const headers = standardHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    const forwardedFor = req.headers["x-forwarded-for"];
    const ip =
      typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0].trim()
        : req.socket?.remoteAddress || "unknown";

    const rateLimitHit = consumeRateLimit(ip);
    if (rateLimitHit) {
      res.status(429).json(rateLimitHit);
      return;
    }

    const response = await generateQuizScenarioResponse(req.headers);
    res.status(response.status).json(response.body);
    return;
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
