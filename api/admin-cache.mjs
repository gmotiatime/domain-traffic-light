import {
  adminCacheDeleteResponse,
  adminCacheGetResponse,
  adminCacheUpdateResponse,
  standardHeaders,
} from "../server/openrouter-proxy.mjs";
import { adminCacheGetSchema, adminCachePatchSchema, adminCacheDeleteSchema } from "./schemas.mjs";

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
    const parsedQuery = adminCacheGetSchema.safeParse(req.query || {});
    if (!parsedQuery.success) {
      res.status(400).json({
        error: "Ошибка валидации входных данных",
        details: parsedQuery.error.issues,
      });
      return;
    }
    const response = await adminCacheGetResponse(parsedQuery.data, req.headers || {});
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

    const parsedBody = adminCachePatchSchema.safeParse(body);
    if (!parsedBody.success) {
      res.status(400).json({
        error: "Ошибка валидации входных данных",
        details: parsedBody.error.issues,
      });
      return;
    }

    const response = await adminCacheUpdateResponse(parsedBody.data, req.headers || {});
    res.status(response.status).json(response.body);
    return;
  }

  if (req.method === "DELETE") {
    const parsedQuery = adminCacheDeleteSchema.safeParse(req.query || {});
    if (!parsedQuery.success) {
      res.status(400).json({
        error: "Ошибка валидации входных данных",
        details: parsedQuery.error.issues,
      });
      return;
    }
    const response = await adminCacheDeleteResponse(parsedQuery.data, req.headers || {});
    res.status(response.status).json(response.body);
    return;
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
