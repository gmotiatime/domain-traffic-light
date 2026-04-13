import { z } from "zod";

export const analyzeSchema = z.object({
  input: z.string().trim().optional(),
  localAnalysis: z.any().optional(),
  skipCache: z.boolean().optional(),
  telemetryConsent: z.boolean().optional(),
});

export const lookupSchema = z.object({
  url: z.string().trim().optional(),
  link: z.string().trim().optional(),
}).refine(data => data.url || data.link, {
  message: "Параметр url или link обязателен."
});

export const reportPostSchema = z.object({
  host: z.string().trim().min(1, "Параметр host обязателен."),
  reportText: z.string().trim().min(1, "Параметр reportText обязателен."),
  verdict: z.string().trim().optional(),
  score: z.number().optional(),
});

export const reportDeleteSchema = z.object({
  host: z.string().trim().min(1, "Параметр host обязателен."),
  reportId: z.string().trim().min(1, "Параметр reportId обязателен."),
});

export const adminCacheGetSchema = z.object({
  host: z.string().trim().optional(),
  limit: z.union([z.number(), z.string().trim().transform(v => parseInt(v, 10))]).optional(),
});

export const adminCachePatchSchema = z.object({
  host: z.string().trim().min(1, "Параметр host обязателен."),
  edits: z.record(z.any()).optional().default({}),
});

export const adminCacheDeleteSchema = z.object({
  host: z.string().trim().min(1, "Параметр host обязателен."),
});

export const articlePostSchema = z.object({
  topic: z.string().trim().min(1, "Параметр topic обязателен."),
  content: z.string().trim().min(1, "Параметр content обязателен."),
});
