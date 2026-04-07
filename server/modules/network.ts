import dns from "node:dns/promises";
import tls from "node:tls";
import { buildBreakdown, sameRegistrableDomain, sanitizeString, sortReasons, withTimeout } from "./utils.ts";

export const networkSignalTimeoutMs =
  Number(process.env.NETWORK_SIGNAL_TIMEOUT_MS) || 3_000;

export async function lookupDnsSignals(host: string) {
  const [ipv4, ipv6, cnames] = await Promise.allSettled([
    withTimeout(dns.resolve4(host), networkSignalTimeoutMs, "DNS A"),
    withTimeout(dns.resolve6(host), networkSignalTimeoutMs, "DNS AAAA"),
    withTimeout(dns.resolveCname(host), networkSignalTimeoutMs, "DNS CNAME"),
  ]);

  const ipv4List = ipv4.status === "fulfilled" ? ipv4.value : [];
  const ipv6List = ipv6.status === "fulfilled" ? ipv6.value : [];
  const cnameList = cnames.status === "fulfilled" ? cnames.value : [];
  const resolved =
    ipv4List.length > 0 || ipv6List.length > 0 || cnameList.length > 0;

  return {
    resolved,
    ipv4Count: ipv4List.length,
    ipv6Count: ipv6List.length,
    cnames: cnameList.slice(0, 2),
    note: resolved
      ? `DNS есть: A ${ipv4List.length}, AAAA ${ipv6List.length}, CNAME ${cnameList.length}.`
      : "DNS-ответ не получен.",
  };
}

export async function lookupHttpSignals(normalized: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), networkSignalTimeoutMs);

  try {
    let response = await fetch(normalized.url.toString(), {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "DomainTrafficLight/1.0",
      },
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(normalized.url.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "DomainTrafficLight/1.0",
        },
      });
    }

    const location = response.headers.get("location");
    let redirectHost = null;

    if (location) {
      try {
        redirectHost = new URL(location, normalized.url).hostname.toLowerCase();
      } catch {
        redirectHost = null;
      }
    }

    return {
      reachable: true,
      status: response.status,
      redirected: Boolean(redirectHost),
      redirectHost,
      note: redirectHost
        ? `HTTP ${response.status}, redirect на ${redirectHost}.`
        : `HTTP ${response.status} без внешнего redirect.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? sanitizeString(error.message, 120) : "HTTP check failed.";
    return {
      reachable: false,
      status: null,
      redirected: false,
      redirectHost: null,
      note: `HTTP недоступен: ${message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function lookupTlsSignals(host: string): Promise<any> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: any) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    const socket = tls.connect(
      {
        host,
        servername: host,
        port: 443,
        rejectUnauthorized: false,
      },
      () => {
        const certificate = socket.getPeerCertificate();
        done({
          available: Boolean(certificate && Object.keys(certificate).length > 0),
          subject: certificate?.subject?.CN || null,
          issuer: certificate?.issuer?.CN || null,
          validTo: certificate?.valid_to || null,
          note:
            certificate && Object.keys(certificate).length > 0
              ? `TLS сертификат есть: ${certificate?.subject?.CN || "CN не указан"}.`
              : "TLS сертификат не получен.",
        });
        socket.end();
      },
    );

    socket.setTimeout(networkSignalTimeoutMs, () => {
      done({
        available: false,
        subject: null,
        issuer: null,
        validTo: null,
        note: "TLS-проверка не успела завершиться.",
      });
      socket.destroy();
    });

    socket.on("error", (error) => {
      done({
        available: false,
        subject: null,
        issuer: null,
        validTo: null,
        note: `TLS недоступен: ${sanitizeString(error.message, 120)}`,
      });
    });
  });
}

export async function lookupNetworkSignals(normalized: any) {
  const dnsSignal = await lookupDnsSignals(normalized.host).catch((error) => ({
    resolved: false,
    ipv4Count: 0,
    ipv6Count: 0,
    cnames: [],
    note:
      error instanceof Error
        ? `DNS недоступен: ${sanitizeString(error.message, 120)}`
        : "DNS lookup failed.",
  }));

  const [httpSignal, tlsSignal] = await Promise.all([
    lookupHttpSignals(normalized),
    normalized.url.protocol === "https:"
      ? lookupTlsSignals(normalized.host)
      : Promise.resolve({
          available: false,
          subject: null,
          issuer: null,
          validTo: null,
          note: "TLS не проверялся для HTTP-ссылки.",
        }),
  ]);

  return {
    source: "network",
    checkedAt: new Date().toISOString(),
    dns: dnsSignal,
    http: httpSignal,
    tls: tlsSignal,
  };
}

export function isBenignSameSiteRedirect(sourceHost: string, redirectHost: string) {
  const source = String(sourceHost || "").toLowerCase();
  const target = String(redirectHost || "").toLowerCase();
  if (!source || !target) return false;
  if (source === target) return true;
  if (!sameRegistrableDomain(source, target)) return false;

  const sourceBreakdown = buildBreakdown(source);
  const targetBreakdown = buildBreakdown(target);

  const sourceIsApex = !sourceBreakdown.subdomain;
  const targetIsApex = !targetBreakdown.subdomain;

  if (sourceIsApex && target === `www.${source}`) return true;
  if (targetIsApex && source === `www.${target}`) return true;

  return sourceIsApex !== targetIsApex;
}

export function matchesTlsSubject(host: string, subject: string) {
  const normalizedHost = String(host || "").toLowerCase();
  const normalizedSubject = String(subject || "").toLowerCase().trim();
  if (!normalizedHost || !normalizedSubject) return false;
  if (normalizedHost === normalizedSubject) return true;

  if (normalizedSubject.startsWith("*.")) {
    const wildcardBase = normalizedSubject.slice(2);

    if (normalizedHost.endsWith(`.${wildcardBase}`)) {
      return true;
    }

    if (
      sameRegistrableDomain(normalizedHost, wildcardBase) &&
      (normalizedHost === wildcardBase || normalizedHost === `www.${wildcardBase}`)
    ) {
      return true;
    }
  }

  if (normalizedSubject.startsWith("www.")) {
    const apexDomain = normalizedSubject.slice(4);
    if (normalizedHost === apexDomain) {
      return true;
    }
  }

  if (normalizedHost.startsWith("www.")) {
    const apexDomain = normalizedHost.slice(4);
    if (normalizedSubject === apexDomain) {
      return true;
    }
  }

  return false;
}

export function isBenignNetworkReason(reason: any, normalized: any) {
  const title = String(reason?.title || "").toLowerCase();
  const detail = String(reason?.detail || "").toLowerCase();
  const host = String(normalized?.host || "").toLowerCase();

  if (/redirect|редирект|перенаправ/.test(title + " " + detail)) {
    const wwwHost = `www.${host}`;
    if (
      detail.includes(wwwHost) &&
      detail.includes("нормаль")
    ) {
      return true;
    }
  }

  if (/tls|https|сертификат/.test(title + " " + detail)) {
    const registrableDomain = buildBreakdown(host).registrableDomain.toLowerCase();
    if (
      detail.includes(`*.${registrableDomain}`) &&
      (/соответств|не вызывает подозр|нормаль/.test(detail) || matchesTlsSubject(host, `*.${registrableDomain}`))
    ) {
      return true;
    }
  }

  return false;
}

export function applyNetworkSignalsToAnalysis(localAnalysis: any, networkSignals: any, normalized: any) {
  if (!localAnalysis || !networkSignals || !normalized) {
    return localAnalysis;
  }

  const baseReasons = Array.isArray(localAnalysis.reasons)
    ? [...localAnalysis.reasons]
    : [];
  let score = Number.isFinite(Number(localAnalysis.score))
    ? Number(localAnalysis.score)
    : 0;
  let changed = false;

  if (networkSignals.dns && !networkSignals.dns.resolved) {
    baseReasons.push({
      title: "DNS не отвечает",
      detail: `Домен ${normalized.host} не резолвится через DNS. Это может означать свежий фишинг, мёртвый домен или блокировку.`,
      scoreDelta: 14,
      tone: "warning",
    });
    score += 14;
    changed = true;
  }

  if (
    networkSignals.http &&
    networkSignals.http.redirected &&
    networkSignals.http.redirectHost &&
    networkSignals.http.redirectHost !== normalized.host &&
    !isBenignSameSiteRedirect(normalized.host, networkSignals.http.redirectHost) &&
    !normalized.host.endsWith(`.${networkSignals.http.redirectHost}`) &&
    !networkSignals.http.redirectHost.endsWith(`.${normalized.host}`)
  ) {
    baseReasons.push({
      title: "Redirect на другой домен",
      detail: `При переходе на ${normalized.host} происходит redirect на ${networkSignals.http.redirectHost}. Это может быть маскировка реального направления.`,
      scoreDelta: 20,
      tone: "critical",
    });
    score += 20;
    changed = true;
  }

  if (
    networkSignals.tls &&
    networkSignals.tls.available &&
    networkSignals.tls.subject &&
    !matchesTlsSubject(normalized.host, networkSignals.tls.subject)
  ) {
    baseReasons.push({
      title: "TLS-несоответствие",
      detail: `TLS сертификат выдан на ${networkSignals.tls.subject}, а не на ${normalized.host}. Это может быть shared hosting или подмена.`,
      scoreDelta: 10,
      tone: "warning",
    });
    score += 10;
    changed = true;
  }

  if (
    networkSignals.http &&
    !networkSignals.http.reachable &&
    !normalized.host.endsWith(".test") &&
    !normalized.host.endsWith(".example")
  ) {
    baseReasons.push({
      title: "Сайт недоступен",
      detail: `HTTP-запрос к ${normalized.host} не получил ответа. Сайт может быть нерабочим, заблокированным или временным.`,
      scoreDelta: 8,
      tone: "warning",
    });
    score += 8;
    changed = true;
  }

  if (!changed) {
    return localAnalysis;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  let verdict = localAnalysis.verdict || "low";
  if (normalizedScore >= 42 && verdict !== "high") {
    verdict = "high";
  } else if (normalizedScore >= 12 && verdict === "low") {
    verdict = "medium";
  }

  return {
    ...localAnalysis,
    host: normalized.host,
    breakdown: buildBreakdown(normalized.host),
    analyzedAt: new Date().toISOString(),
    score: normalizedScore,
    verdict,
    verdictLabel: verdict === "high" ? "Высокий риск" : verdict === "medium" ? "Нужна перепроверка" : "Низкий риск",
    summary: localAnalysis.summary,
    reasons: sortReasons(baseReasons).slice(0, 10),
    actions: localAnalysis.actions,
  };
}
