import { analyzeResponse, standardHeaders } from "../server/openrouter-proxy.mjs";

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

  const forwardedFor = req.headers["x-forwarded-for"];
  const ip =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0].trim()
      : req.socket?.remoteAddress || "unknown";
  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};

  const response = await analyzeResponse(body, { ip });
  res.status(response.status).json(response.body);
}
