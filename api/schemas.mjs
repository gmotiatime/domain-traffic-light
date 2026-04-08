import { z } from "zod";

export const analyzeSchema = z.object({
  input: z.string().optional(),
  localAnalysis: z.any().optional(),
  skipCache: z.boolean().optional(),
  telemetryConsent: z.boolean().optional(),
});

export const lookupSchema = z.object({
  url: z.string().optional(),
  link: z.string().optional(),
}).refine(data => data.url || data.link, {
  message: "Параметр url или link обязателен."
});

export const reportPostSchema = z.object({
  host: z.string().min(1, "Параметр host обязателен."),
  reportText: z.string().min(1, "Параметр reportText обязателен."),
  verdict: z.string().optional(),
  score: z.number().optional(),
});

export const reportDeleteSchema = z.object({
  host: z.string().min(1, "Параметр host обязателен."),
  reportId: z.string().min(1, "Параметр reportId обязателен."),
});

export const adminCacheGetSchema = z.object({
  host: z.string().optional(),
  limit: z.union([z.number(), z.string().transform(v => parseInt(v, 10))]).optional(),
});

export const adminCachePatchSchema = z.object({
  host: z.string().min(1, "Параметр host обязателен."),
  edits: z.record(z.any()).optional().default({}),
});

export const adminCacheDeleteSchema = z.object({
  host: z.string().min(1, "Параметр host обязателен."),
});
