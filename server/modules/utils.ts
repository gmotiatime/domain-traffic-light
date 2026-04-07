import { fileURLToPath } from "node:url";
import path from "node:path";

// Extract useful helpers here.

export const logLevel = process.env.LOG_LEVEL || "debug";

export function log(level: "debug" | "info" | "warn" | "error", message: string, meta: Record<string, any> = {}) {
  const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  if ((levels[level] ?? 1) < (levels[logLevel] ?? 1)) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function sanitizeString(value: any, maxLength: number = 500): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export const compoundSuffixes = [
  "edu.gov.by",
  "gov.by",
  "mil.by",
  "com.by",
  "net.by",
  "org.by",
];

export function buildBreakdown(host: string) {
  const labels = host.split(".");
  const matchedSuffix = compoundSuffixes.find(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );

  if (matchedSuffix) {
    const suffixLength = matchedSuffix.split(".").length;

    if (labels.length === suffixLength) {
      return {
        subdomain: "",
        registrableDomain: host,
        tld: matchedSuffix,
      };
    }

    return {
      subdomain:
        labels.length > suffixLength + 1
          ? labels.slice(0, -(suffixLength + 1)).join(".")
          : "",
      registrableDomain: labels.slice(-(suffixLength + 1)).join("."),
      tld: matchedSuffix,
    };
  }

  return {
    subdomain: labels.length > 2 ? labels.slice(0, -2).join(".") : "",
    registrableDomain: labels.length >= 2 ? labels.slice(-2).join(".") : host,
    tld: labels.at(-1) || "",
  };
}

export function sameRegistrableDomain(hostA: string, hostB: string) {
  const left = buildBreakdown(String(hostA || "").toLowerCase()).registrableDomain;
  const right = buildBreakdown(String(hostB || "").toLowerCase()).registrableDomain;
  return Boolean(left && right && left === right);
}

export function normalizeThreatUrl(rawUrl: string) {
  try {
    const url = new URL(String(rawUrl || "").trim());
    url.hash = "";

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    if (!url.pathname) {
      url.pathname = "/";
    }

    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeInput(input: string) {
  const raw = String(input || "").trim();

  if (!raw) {
    return { error: "Введите домен или ссылку." };
  }

  if (raw.length > 2048) {
    return { error: "Слишком длинный ввод. Максимум 2048 символов." };
  }

  const dangerousSchemes = /^(javascript|data|vbscript|file):/i;
  if (dangerousSchemes.test(raw)) {
    return { error: "Недопустимая схема URL." };
  }

  let candidate = raw;

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");

    if (!host || !host.includes(".")) {
      return { error: "Нужен домен с точкой, например `portal.example`." };
    }

    if (host.length > 253) {
      return { error: "Имя хоста слишком длинное." };
    }

    const labels = host.split(".");
    if (labels.some((label) => label.length > 63 || label.length === 0)) {
      return { error: "Некорректная структура доменного имени." };
    }

    return { url, host };
  } catch {
    return {
      error: "Не удалось распознать ввод. Проверьте адрес и уберите лишние пробелы.",
    };
  }
}

export function normalizeCacheHostInput(input: string) {
  const normalized = normalizeInput(String(input || "").trim());
  if ("error" in normalized) {
    return normalized;
  }

  let host = normalized.host;
  if (host.startsWith('www.')) {
    host = host.substring(4);
  }

  return { host };
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timer = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout`)), timeoutMs);
  });

  return Promise.race([promise, timer]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function standardHeaders() {
  const corsOrigin = process.env.CORS_ORIGIN || "";
  return {
    ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

export function sortReasons(reasons: any[]) {
  const toneOrder: Record<string, number> = { critical: 0, warning: 1, positive: 2 };
  return [...reasons].sort((left, right) => {
    const byTone = toneOrder[left.tone] - toneOrder[right.tone];
    if (byTone !== 0) return byTone;
    return Math.abs(right.scoreDelta) - Math.abs(left.scoreDelta);
  });
}
