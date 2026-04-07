import { analyzeResponse, standardHeaders } from "../server/index.ts";

export default async function handler(req: any, res: any) {
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

  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : req.socket?.remoteAddress || "unknown";

  let body = req.body || {};
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body || "{}");
    } catch (e) {
      res.status(400).json({ error: "Invalid JSON payload" });
      return;
    }
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ error: "Invalid JSON payload: expected an object" });
    return;
  }

  const response = await analyzeResponse(body, { ip });
  res.status(response.status).json(response.body);
}
