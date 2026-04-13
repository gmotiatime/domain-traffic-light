import { getArticlesResponse, saveArticleResponse, generateArticleResponse, deleteArticleResponse, standardHeaders } from "../server/openrouter-proxy.mjs";
import { articlePostSchema } from "./schemas.mjs";
import { z } from "zod";

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
    const response = await getArticlesResponse();
    res.status(response.status).json(response.body);
    return;
  }

  if (req.method === "DELETE") {
    const idFromQuery = typeof req.query?.id === "string" ? req.query.id.trim() : "";
    let body = req.body || {};
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body || "{}");
      } catch {
        res.status(400).json({ error: "Invalid JSON payload" });
        return;
      }
    }

    const parsedBody = z.object({ id: z.string().trim().min(1).optional() }).safeParse(body);
    if (!parsedBody.success) {
      res.status(400).json({ error: "Invalid article id" });
      return;
    }

    const articleId = idFromQuery || parsedBody.data.id || "";
    if (!articleId) {
      res.status(400).json({ error: "Article id is required" });
      return;
    }

    const response = await deleteArticleResponse(articleId, req.headers);
    res.status(response.status).json(response.body);
    return;
  }

  if (req.method === "POST") {
    const action = req.query.action;

    let body = req.body || {};
    if (typeof req.body === "string") {
      try {
        body = JSON.parse(req.body || "{}");
      } catch (e) {
        res.status(400).json({ error: "Invalid JSON payload" });
        return;
      }
    }

    if (action === "generate") {
      const topicSchema = z.object({ topic: z.string().min(1) });
      const parsedBody = topicSchema.safeParse(body);

      if (!parsedBody.success) {
        res.status(400).json({ error: "Invalid topic" });
        return;
      }

      const response = await generateArticleResponse(parsedBody.data.topic, req.headers);
      res.status(response.status).json(response.body);
      return;
    } else {
      const parsedBody = articlePostSchema.safeParse(body);
      if (!parsedBody.success) {
        res.status(400).json({
          error: "Ошибка валидации входных данных",
          details: parsedBody.error.errors,
        });
        return;
      }

      const response = await saveArticleResponse(parsedBody.data, req.headers);
      res.status(response.status).json(response.body);
      return;
    }
  }

  res.status(405).json({ error: "Method Not Allowed" });
}
