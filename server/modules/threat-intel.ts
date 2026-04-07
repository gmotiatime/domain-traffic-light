import { buildBreakdown, log, normalizeThreatUrl, sanitizeString, sortReasons, sameRegistrableDomain } from "./utils.ts";

export const openPhishFeedUrl =
  process.env.OPENPHISH_FEED_URL ||
  "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
export const openPhishRefreshMs =
  Number(process.env.OPENPHISH_REFRESH_MS) || 30 * 60_000;
export const urlAbuseApiUrl =
  process.env.URLABUSE_API_URL || "https://urlabuse.com/get_record_by_rowid";
export const urlAbuseEmail = process.env.URLABUSE_EMAIL || "";
export const urlAbuseToken = process.env.URLABUSE_TOKEN || "";
export const urlAbuseAcl = process.env.URLABUSE_ACL || "ALL";
export const urlAbuseRefreshMs = Number(process.env.URLABUSE_REFRESH_MS) || 5 * 60_000;
export const urlAbuseMaxPages = Number(process.env.URLABUSE_MAX_PAGES) || 1;

export const openPhishState = {
  urls: new Set<string>(),
  hosts: new Map<string, number>(),
  fetchedAt: 0,
  loadingPromise: null as Promise<void> | null,
  lastError: null as string | null,
};
export const urlAbuseState = {
  urls: new Set<string>(),
  hosts: new Map<string, number>(),
  fetchedAt: 0,
  loadingPromise: null as Promise<void> | null,
  lastError: null as string | null,
  lastRowId: 0,
};

export async function refreshOpenPhishFeed() {
  if (
    openPhishState.loadingPromise &&
    Date.now() - openPhishState.fetchedAt < openPhishRefreshMs
  ) {
    return openPhishState.loadingPromise;
  }

  openPhishState.loadingPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      const response = await fetch(openPhishFeedUrl, {
        headers: {
          "User-Agent": "domain-traffic-light/1.0",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenPhish HTTP ${response.status}`);
      }

      const text = await response.text();
      const tokens = text
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);

      const urls = new Set<string>();
      const hosts = new Map<string, number>();

      for (const token of tokens) {
        const normalizedUrl = normalizeThreatUrl(token);
        if (!normalizedUrl) continue;

        urls.add(normalizedUrl);

        try {
          const host = new URL(normalizedUrl).hostname.toLowerCase();
          hosts.set(host, (hosts.get(host) || 0) + 1);
        } catch {
          // ignore malformed feed item
        }
      }

      openPhishState.urls = urls;
      openPhishState.hosts = hosts;
      openPhishState.fetchedAt = Date.now();
      openPhishState.lastError = null;

      log("info", "OpenPhish feed refreshed", {
        urls: urls.size,
        hosts: hosts.size,
      });
    } catch (error) {
      openPhishState.lastError =
        error instanceof Error ? error.message : "OpenPhish refresh failed.";
      log("warn", "OpenPhish feed refresh failed", {
        error: openPhishState.lastError,
      });
    } finally {
      clearTimeout(timeoutId);
      const finishedPromise = openPhishState.loadingPromise;
      setTimeout(() => {
        if (openPhishState.loadingPromise === finishedPromise) {
          openPhishState.loadingPromise = null;
        }
      }, 0);
    }
  })();

  return openPhishState.loadingPromise;
}

export async function ensureOpenPhishFeed() {
  const isFresh =
    openPhishState.fetchedAt > 0 &&
    Date.now() - openPhishState.fetchedAt < openPhishRefreshMs &&
    openPhishState.urls.size > 0;

  if (isFresh) {
    return;
  }

  await refreshOpenPhishFeed();
}

export async function lookupThreatIntel(normalized: any) {
  await ensureOpenPhishFeed();

  if (openPhishState.urls.size === 0) {
    return {
      source: "openphish",
      status: "unavailable",
      note: openPhishState.lastError
        ? `OpenPhish недоступен: ${sanitizeString(openPhishState.lastError, 120)}`
        : "OpenPhish временно недоступен.",
      checkedAt: new Date().toISOString(),
    };
  }

  const exactUrl = normalizeThreatUrl(normalized.url.toString());
  const rootUrl = normalizeThreatUrl(`${normalized.url.protocol}//${normalized.host}/`);
  const host = normalized.host.toLowerCase();
  const exactMatch = openPhishState.urls.has(exactUrl);
  const rootMatch = openPhishState.urls.has(rootUrl);
  const hostMatches = openPhishState.hosts.get(host) || 0;

  if (exactMatch || rootMatch) {
    return {
      source: "openphish",
      status: "hit",
      matchType: exactMatch ? "exact-url" : "host-root",
      confidence: "high",
      note: "Точный адрес найден в базе OpenPhish.",
      checkedAt: new Date().toISOString(),
      feedFetchedAt: new Date(openPhishState.fetchedAt).toISOString(),
      hostMatches,
    };
  }

  if (hostMatches > 0) {
    return {
      source: "openphish",
      status: "hit",
      matchType: "host",
      confidence: "medium",
      note:
        hostMatches > 1
          ? `На этом хосте найдено ${hostMatches} адреса из OpenPhish.`
          : "На этом хосте найден адрес из OpenPhish.",
      checkedAt: new Date().toISOString(),
      feedFetchedAt: new Date(openPhishState.fetchedAt).toISOString(),
      hostMatches,
    };
  }

  return {
    source: "openphish",
    status: "clear",
    matchType: "none",
    confidence: "low",
    note: "Точного совпадения в OpenPhish не найдено.",
    checkedAt: new Date().toISOString(),
    feedFetchedAt: new Date(openPhishState.fetchedAt).toISOString(),
    hostMatches: 0,
  };
}

export async function refreshUrlAbuseFeed() {
  if (!urlAbuseEmail || !urlAbuseToken) {
    urlAbuseState.lastError = "URLAbuse credentials are not configured.";
    return;
  }

  if (
    urlAbuseState.loadingPromise &&
    Date.now() - urlAbuseState.fetchedAt < urlAbuseRefreshMs
  ) {
    return urlAbuseState.loadingPromise;
  }

  urlAbuseState.loadingPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12_000);

    try {
      let nextRowId = urlAbuseState.lastRowId;
      let pagesFetched = 0;
      let fetchedAny = false;

      while (pagesFetched < urlAbuseMaxPages) {
        const params = new URLSearchParams({
          email: urlAbuseEmail,
          token: urlAbuseToken,
          acl: urlAbuseAcl,
        });

        if (nextRowId > 0) {
          params.set("rowid", String(nextRowId));
        }

        const response = await fetch(`${urlAbuseApiUrl}?${params.toString()}`, {
          headers: {
            "User-Agent": "domain-traffic-light/1.0",
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`URLAbuse HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!payload?.success) {
          throw new Error(
            sanitizeString(payload?.msg || "URLAbuse returned unsuccessful payload.", 180),
          );
        }

        const records = Array.isArray(payload?.attr) ? payload.attr : [];
        if (records.length === 0) {
          break;
        }

        fetchedAny = true;
        pagesFetched += 1;

        for (const record of records) {
          const normalizedUrl = normalizeThreatUrl(record?.url);
          if (!normalizedUrl) continue;

          urlAbuseState.urls.add(normalizedUrl);

          try {
            const host = new URL(normalizedUrl).hostname.toLowerCase();
            urlAbuseState.hosts.set(host, (urlAbuseState.hosts.get(host) || 0) + 1);
          } catch {
            // ignore malformed record
          }

          const rowId = Number(record?.rowid);
          if (Number.isFinite(rowId) && rowId > nextRowId) {
            nextRowId = rowId;
          }
        }

        if (records.length < 100) {
          break;
        }
      }

      if (fetchedAny) {
        urlAbuseState.lastRowId = nextRowId;
      }

      urlAbuseState.fetchedAt = Date.now();
      urlAbuseState.lastError = null;

      log("info", "URLAbuse feed refreshed", {
        urls: urlAbuseState.urls.size,
        hosts: urlAbuseState.hosts.size,
        lastRowId: urlAbuseState.lastRowId,
      });
    } catch (error) {
      urlAbuseState.lastError =
        error instanceof Error ? error.message : "URLAbuse refresh failed.";
      log("warn", "URLAbuse refresh failed", {
        error: urlAbuseState.lastError,
      });
    } finally {
      clearTimeout(timeoutId);
      const finishedPromise = urlAbuseState.loadingPromise;
      setTimeout(() => {
        if (urlAbuseState.loadingPromise === finishedPromise) {
          urlAbuseState.loadingPromise = null;
        }
      }, 0);
    }
  })();

  return urlAbuseState.loadingPromise;
}

export async function ensureUrlAbuseFeed() {
  if (!urlAbuseEmail || !urlAbuseToken) {
    return;
  }

  const isFresh =
    urlAbuseState.fetchedAt > 0 &&
    Date.now() - urlAbuseState.fetchedAt < urlAbuseRefreshMs &&
    (urlAbuseState.urls.size > 0 || urlAbuseState.lastRowId > 0);

  if (isFresh) {
    return;
  }

  await refreshUrlAbuseFeed();
}

export async function lookupUrlAbuseIntel(normalized: any) {
  if (!urlAbuseEmail || !urlAbuseToken) {
    return {
      source: "urlabuse",
      status: "unavailable",
      note: "URLAbuse не настроен.",
      checkedAt: new Date().toISOString(),
    };
  }

  await ensureUrlAbuseFeed();

  if (urlAbuseState.urls.size === 0) {
    return {
      source: "urlabuse",
      status: "unavailable",
      note: urlAbuseState.lastError
        ? `URLAbuse недоступен: ${sanitizeString(urlAbuseState.lastError, 120)}`
        : "URLAbuse временно недоступен.",
      checkedAt: new Date().toISOString(),
    };
  }

  const exactUrl = normalizeThreatUrl(normalized.url.toString());
  const rootUrl = normalizeThreatUrl(`${normalized.url.protocol}//${normalized.host}/`);
  const host = normalized.host.toLowerCase();
  const exactMatch = urlAbuseState.urls.has(exactUrl);
  const rootMatch = urlAbuseState.urls.has(rootUrl);
  const hostMatches = urlAbuseState.hosts.get(host) || 0;

  if (exactMatch || rootMatch) {
    return {
      source: "urlabuse",
      status: "hit",
      matchType: exactMatch ? "exact-url" : "host-root",
      confidence: "high",
      note: "Точный адрес найден в URLAbuse.",
      checkedAt: new Date().toISOString(),
      hostMatches,
      lastRowId: urlAbuseState.lastRowId,
    };
  }

  if (hostMatches > 0) {
    return {
      source: "urlabuse",
      status: "hit",
      matchType: "host",
      confidence: "medium",
      note:
        hostMatches > 1
          ? `Для этого хоста в URLAbuse найдено ${hostMatches} записей.`
          : "Для этого хоста в URLAbuse найдена запись.",
      checkedAt: new Date().toISOString(),
      hostMatches,
      lastRowId: urlAbuseState.lastRowId,
    };
  }

  return {
    source: "urlabuse",
    status: "clear",
    matchType: "none",
    confidence: "low",
    note: "Совпадений в URLAbuse не найдено.",
    checkedAt: new Date().toISOString(),
    hostMatches: 0,
    lastRowId: urlAbuseState.lastRowId,
  };
}

export function applyThreatIntelToAnalysis(localAnalysis: any, threatIntel: any, normalized: any) {
  if (!localAnalysis || !normalized || threatIntel?.source !== "openphish") {
    return localAnalysis;
  }

  const baseReasons = Array.isArray(localAnalysis.reasons)
    ? [...localAnalysis.reasons]
    : [];
  const baseActions = Array.isArray(localAnalysis.actions)
    ? [...localAnalysis.actions]
    : [];
  let score = Number.isFinite(Number(localAnalysis.score))
    ? Number(localAnalysis.score)
    : 0;

  if (threatIntel.status === "hit") {
    const isExact = threatIntel.matchType === "exact-url" || threatIntel.matchType === "host-root";
    const scoreDelta = isExact ? 70 : 52;

    baseReasons.unshift({
      title: isExact ? "Есть в OpenPhish" : "Хост есть в OpenPhish",
      detail: isExact
        ? "Точный URL найден в community feed OpenPhish. Это сильный сигнал реального фишинга."
        : threatIntel.hostMatches > 1
          ? `Для этого хоста в OpenPhish найдено ${threatIntel.hostMatches} phishing-URL.`
          : "Для этого хоста в OpenPhish найден phishing-URL.",
      scoreDelta,
      tone: "critical",
    });

    score = Math.min(100, score + scoreDelta);

    const actions = [
      "Не открывайте этот адрес. Не вводите данные.",
      "Откройте официальный сайт вручную через поисковик или закладки.",
      "Если ссылка пришла в сообщении, покажите её взрослому или специалисту.",
    ];

    return {
      ...localAnalysis,
      host: normalized.host,
      breakdown: buildBreakdown(normalized.host),
      analyzedAt: new Date().toISOString(),
      score,
      verdict: "high",
      verdictLabel: "Высокий риск",
      summary: isExact
        ? "Точный адрес найден в phishing-базе OpenPhish. Это сильный сигнал опасности."
        : "Этот хост уже встречается в phishing-базе OpenPhish. Переход лучше остановить.",
      reasons: sortReasons(baseReasons).slice(0, 8),
      actions,
    };
  }

  return {
    ...localAnalysis,
    host: normalized.host,
    breakdown: buildBreakdown(normalized.host),
  };
}

export function applyUrlAbuseToAnalysis(localAnalysis: any, urlAbuseIntel: any, normalized: any) {
  if (!localAnalysis || !normalized || urlAbuseIntel?.source !== "urlabuse") {
    return localAnalysis;
  }

  if (urlAbuseIntel.status !== "hit") {
    return localAnalysis;
  }

  const baseReasons = Array.isArray(localAnalysis.reasons)
    ? [...localAnalysis.reasons]
    : [];
  const baseActions = Array.isArray(localAnalysis.actions)
    ? [...localAnalysis.actions]
    : [];
  const isExact =
    urlAbuseIntel.matchType === "exact-url" || urlAbuseIntel.matchType === "host-root";
  const scoreDelta = isExact ? 62 : 44;

  baseReasons.unshift({
    title: isExact ? "Есть в URLAbuse" : "Хост есть в URLAbuse",
    detail: isExact
      ? "Точный адрес найден в URLAbuse. Это сильный сигнал реального фишинга."
      : urlAbuseIntel.hostMatches > 1
        ? `Для этого хоста в URLAbuse найдено ${urlAbuseIntel.hostMatches} записей.`
        : "Для этого хоста в URLAbuse найдена phishing-запись.",
    scoreDelta,
    tone: "critical",
  });

  return {
    ...localAnalysis,
    host: normalized.host,
    breakdown: buildBreakdown(normalized.host),
    analyzedAt: new Date().toISOString(),
    score: Math.min(100, Math.max(Number(localAnalysis.score) || 0, scoreDelta)),
    verdict: "high",
    verdictLabel: "Высокий риск",
    summary: isExact
      ? "Адрес найден в URLAbuse. Переход и ввод данных лучше остановить."
      : "Для этого хоста есть записи в URLAbuse. Нужна жёсткая перепроверка.",
    reasons: sortReasons(baseReasons).slice(0, 8),
    actions: [
      "Не переходите по ссылке. Не вводите данные.",
      "Откройте официальный адрес вручную через поисковик или закладки.",
      "Если ссылка пришла в сообщении, покажите её взрослому или специалисту.",
      ...baseActions,
    ]
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 5),
  };
}

setTimeout(() => {
  void refreshOpenPhishFeed();
  if (urlAbuseEmail && urlAbuseToken) {
    void refreshUrlAbuseFeed();
  }
}, 0);
