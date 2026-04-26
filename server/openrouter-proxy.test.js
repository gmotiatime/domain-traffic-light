import { EventEmitter } from "node:events";

import { test, describe, expect, beforeEach, afterEach, vi } from "vitest";

const builtinMocks = vi.hoisted(() => ({
  dns: {
    resolve4: vi.fn(),
    resolve6: vi.fn(),
    resolveCname: vi.fn(),
  },
  net: {
    createConnection: vi.fn(),
  },
  tls: {
    connect: vi.fn(),
  },
}));

vi.mock("node:dns/promises", () => ({
  default: builtinMocks.dns,
}));

vi.mock("node:net", () => ({
  default: builtinMocks.net,
}));

vi.mock("node:tls", () => ({
  default: builtinMocks.tls,
}));

import { analyzeDomainInput } from "../src/lib/domain-analyzer.ts";
import { analyzeResponseStream, normalizeInput, extractClientIp } from "./openrouter-proxy.mjs";

function createMockSocket() {
  const socket = new EventEmitter();
  socket.setTimeout = vi.fn();
  socket.write = vi.fn();
  socket.destroy = vi.fn();
  socket.end = vi.fn();
  socket.getPeerCertificate = vi.fn(() => ({}));
  return socket;
}

function createMockSseResponse() {
  const chunks = [];
  return {
    chunks,
    writeHead: vi.fn(),
    write: vi.fn((chunk) => {
      chunks.push(String(chunk));
    }),
    end: vi.fn(),
    flush: vi.fn(),
  };
}

describe("openrouter-proxy", () => {
  const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-api-key";
    builtinMocks.dns.resolve4.mockReset();
    builtinMocks.dns.resolve6.mockReset();
    builtinMocks.dns.resolveCname.mockReset();
    builtinMocks.net.createConnection.mockReset();
    builtinMocks.tls.connect.mockReset();
  });

  afterEach(() => {
    if (originalOpenRouterApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY;
    } else {
      process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey;
    }

    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

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

  describe("analyzeResponseStream", () => {
    test("returns an SSE error event when the AI request fails before streaming starts", async () => {
      builtinMocks.dns.resolve4.mockRejectedValue(new Error("DNS unavailable"));
      builtinMocks.dns.resolve6.mockRejectedValue(new Error("DNS unavailable"));
      builtinMocks.dns.resolveCname.mockRejectedValue(new Error("DNS unavailable"));

      builtinMocks.net.createConnection.mockImplementation((_port, _host, onConnect) => {
        const socket = createMockSocket();
        queueMicrotask(() => {
          if (typeof onConnect === "function") {
            onConnect();
          }
          socket.emit("error", new Error("WHOIS unavailable"));
        });
        return socket;
      });

      builtinMocks.tls.connect.mockImplementation((_options, _onSecureConnect) => {
        const socket = createMockSocket();
        queueMicrotask(() => {
          socket.emit("error", new Error("TLS unavailable"));
        });
        return socket;
      });

      const fetchMock = vi.fn(async (url) => {
        const target = String(url);
        if (target.includes("openrouter.ai")) {
          throw new Error("AI upstream unavailable");
        }
        throw new Error(`Mocked network failure for ${target}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const res = createMockSseResponse();

      await expect(
        analyzeResponseStream(
          {
            input: "example.com",
            localAnalysis: analyzeDomainInput("example.com"),
          },
          { ip: "127.0.0.1" },
          res,
        ),
      ).resolves.toBeUndefined();

      const output = res.chunks.join("");
      expect(res.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          "Content-Type": "text/event-stream",
        }),
      );
      expect(res.end).toHaveBeenCalled();
      expect(output).toContain("event: local");
      expect(output).toContain("event: error");
      expect(output).toContain("Все AI-модели недоступны.");
    });
  });
});
