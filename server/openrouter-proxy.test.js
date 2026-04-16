import { test, describe, expect } from "vitest";
import { normalizeInput, extractClientIp } from "./openrouter-proxy.mjs";

describe("openrouter-proxy", () => {
  describe("normalizeInput", () => {
    test("returns error for empty input", () => {
      expect(normalizeInput("")).toEqual({ error: "Введите домен или ссылку." });
      expect(normalizeInput("   ")).toEqual({ error: "Введите домен или ссылку." });
    });

    test("returns error for too long input", () => {
      const longInput = "a".repeat(2049);
      expect(normalizeInput(longInput)).toEqual({ error: "Слишком длинный ввод. Максимум 2048 символов." });
    });

    test("returns error for dangerous schemes", () => {
      expect(normalizeInput("javascript:alert(1)")).toEqual({ error: "Недопустимая схема URL." });
      expect(normalizeInput("data:text/html,<html>")).toEqual({ error: "Недопустимая схема URL." });
      expect(normalizeInput("vbscript:msgbox")).toEqual({ error: "Недопустимая схема URL." });
      expect(normalizeInput("file:///etc/passwd")).toEqual({ error: "Недопустимая схема URL." });
    });

    test("normalizes a simple domain", () => {
      const res = normalizeInput("example.com");
      expect(res.host).toBe("example.com");
      expect(res.url.href).toBe("https://example.com/");
    });

    test("normalizes a domain with whitespace", () => {
      const res = normalizeInput("  example.com  ");
      expect(res.host).toBe("example.com");
      expect(res.url.href).toBe("https://example.com/");
    });

    test("keeps existing valid protocols", () => {
      const res1 = normalizeInput("http://example.com");
      expect(res1.host).toBe("example.com");
      expect(res1.url.href).toBe("http://example.com/");

      const res2 = normalizeInput("https://example.com/path");
      expect(res2.host).toBe("example.com");
      expect(res2.url.href).toBe("https://example.com/path");
    });
  });

  describe("extractClientIp", () => {
    test("extracts x-real-ip if present", () => {
      const req = { headers: { "x-real-ip": "192.168.1.1" } };
      expect(extractClientIp(req)).toBe("192.168.1.1");
    });

    test("extracts x-vercel-forwarded-for if present", () => {
      const req = { headers: { "x-vercel-forwarded-for": "10.0.0.1, 10.0.0.2" } };
      expect(extractClientIp(req)).toBe("10.0.0.1");
    });

    test("extracts remoteAddress if headers are absent", () => {
      const req = { headers: {}, socket: { remoteAddress: "127.0.0.1" } };
      expect(extractClientIp(req)).toBe("127.0.0.1");
    });

    test("returns unknown if nothing is present", () => {
      const req = { headers: {} };
      expect(extractClientIp(req)).toBe("unknown");
    });
  });
});
