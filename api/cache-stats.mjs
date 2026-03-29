import { cacheStatsResponse, standardHeaders } from "../server/openrouter-proxy.mjs";

export default function handler(req, res) {
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

  res.status(200).json(cacheStatsResponse());
}
