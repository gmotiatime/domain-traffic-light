import { standardHeaders } from "../server/index.ts";

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

  // Deduplication API is not implemented in the new index.ts yet, returning 404 to avoid build failure.
  res.status(404).json({ error: "Not found." });
}
