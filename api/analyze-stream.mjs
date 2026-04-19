import { analyzeResponseStream, standardHeaders, extractClientIp } from "../server/openrouter-proxy.mjs";
import { analyzeSchema } from "./schemas.mjs";

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    const headers = standardHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const ip = extractClientIp(req);

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

  // Stream response via SSE — analyzeResponseStream handles headers & writing
  await analyzeResponseStream(parsedBody.data, { ip }, res);
}
