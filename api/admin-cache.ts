import { standardHeaders } from "../server/index.ts";
import {
  adminCacheDeleteResponse,
  adminCacheGetResponse,
  adminCacheUpdateResponse
} from "../server/modules/cache.ts";

export default async function handler(req: any, res: any) {
  const headers = standardHeaders();

  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    const response = await adminCacheGetResponse(req.query || {}, req.headers || {});
    res.status(response.status).json(response.body);
    return;
  }

  if (req.method === "PATCH") {
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

    const response = await adminCacheUpdateResponse(body, req.headers || {});
    res.status(response.status).json(response.body);
    return;
  }

  if (req.method === "DELETE") {
    const response = await adminCacheDeleteResponse(req.query || {}, req.headers || {});
    res.status(response.status).json(response.body);
    return;
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
