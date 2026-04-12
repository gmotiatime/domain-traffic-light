import { generateQuizScenarioResponse, standardHeaders } from "../server/openrouter-proxy.mjs";

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
    const response = await generateQuizScenarioResponse(req.headers);
    res.status(response.status).json(response.body);
    return;
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
