import { buildBreakdown, log, normalizeInput, sanitizeString } from "./utils.ts";
import { isBenignNetworkReason } from "./network.ts";

export const configuredModels = (
  process.env.GROQ_MODELS ||
  process.env.GROQ_MODEL ||
  "llama-3.3-70b-versatile,llama-3.1-8b-instant"
)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

export const modelCandidates = [...new Set(configuredModels)];

export function buildGroqRequest(model: string, prompt: string) {
  return {
    model,
    temperature: 0.08,
    max_tokens: Number(process.env.AI_MAX_TOKENS) || 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Ты — строгий аналитик фишинга и доменных угроз. Ты работаешь в системе «Светофор доменов» для белорусских пользователей.

Твоя задача — на основе уже готового локального анализа (ruleset), данных threat feeds (OpenPhish, URLAbuse) и сетевых сигналов (DNS, HTTP, TLS):
1. Перепроверить вердикт и при необходимости усилить его.
2. Добавить ТОЛЬКО новые полезные наблюдения, которых нет в локальном анализе.
3. Не смягчать вердикт, если локальный анализ уже нашёл серьёзные риски (typo-squat, brand-spoof, punycode, OpenPhish hit).
4. Анализировать корреляции между сигналами (например, новый домен + подозрительные слова + нестандартный TLD = высокий риск).

Принципы:
- Каждая причина (reason) должна ссылаться на КОНКРЕТНЫЙ сигнал: фрагмент домена, TLD, результат DNS/TLS, запись в OpenPhish, redirect-цепочку.
- Не пиши общих фраз вроде «домен выглядит подозрительно» или «есть отдельный поддомен».
- Если DNS не резолвится — это серьёзный warning. Если TLS subject не совпадает с доменом — это warning. Если HTTP redirect ведёт на другой домен — это critical.
- Если данных мало, честно напиши об ограничении, но не выдумывай проверки.
- Все тексты — на русском. Формат — строго JSON.
- Заголовок reason: 1–3 слова, без нумерации, без «Сигнал 1».
- Обращай внимание на комбинации признаков: несколько слабых сигналов вместе могут указывать на высокий риск.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  };
}

export function extractJson(content: string) {
  if (!content) {
    throw new Error("Empty AI response");
  }

  const normalized = String(content)
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in AI response");
  }

  const candidate = normalized
    .slice(start, end + 1)
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

  try {
    return JSON.parse(candidate);
  } catch (parseError: any) {
    throw new Error(`JSON parse failed: ${parseError.message}`);
  }
}

export function sanitizeVerdict(verdict: any) {
  const normalized = String(verdict || "").toLowerCase().trim();

  if (
    ["high", "malicious", "dangerous", "phishing", "critical", "scam"].includes(normalized)
  ) {
    return "high";
  }

  if (["low", "safe", "legitimate", "benign", "clean"].includes(normalized)) {
    return "low";
  }

  return "medium";
}

export function sanitizeTone(tone: any) {
  return ["positive", "warning", "critical"].includes(tone) ? tone : "warning";
}

export function verdictLabel(verdict: string) {
  if (verdict === "high") return "Высокий риск";
  if (verdict === "medium") return "Нужна перепроверка";
  return "Низкий риск";
}

export function defaultActions(verdict: string) {
  if (verdict === "high") {
    return [
      "Не переходите по ссылке. Не вводите данные.",
      "Откройте официальный адрес вручную.",
      "Покажите ссылку взрослому или специалисту.",
    ];
  }

  if (verdict === "medium") {
    return [
      "Сначала сравните домен с официальным адресом.",
      "Проверьте ядро домена и поддомен.",
      "Если остаются сомнения, не продолжайте переход.",
    ];
  }

  return [
    "Сверьте адрес вручную.",
    "Убедитесь, что домен совпадает с ожидаемым сайтом.",
    "Продолжайте только при полном совпадении адреса.",
  ];
}

export function inferReasonTone(verdict: string) {
  if (verdict === "high") return "critical";
  if (verdict === "low") return "positive";
  return "warning";
}

export function inferReasonScoreDelta(verdict: string) {
  if (verdict === "high") return 18;
  if (verdict === "low") return -8;
  return 10;
}

export function inferReasonTitle(text: string, verdict: string) {
  const value = String(text || "").toLowerCase();

  if (/openphish/i.test(value)) return "OpenPhish";
  if (/urlabuse/i.test(value)) return "URLAbuse";
  if (/бренд|spoof|typo|подмен|roblox|vercel|openai|github|google|telegram/i.test(value)) return "Бренд";
  if (/redirect|редирект|перенаправ/i.test(value)) return "Redirect";
  if (/ssl|https|сертификат|шифрован/i.test(value)) return "HTTPS";
  if (/dns|ns\b|регистрац/i.test(value)) return "DNS";
  if (/фишинг.*баз|базах фишингов|blacklist|репутац/i.test(value)) return "Репутация";
  if (/возраст|давно|долг/i.test(value)) return "Возраст домена";
  if (/официаль|известн|легитим|довер/i.test(value)) return verdict === "low" ? "Признак доверия" : "Известный сервис";
  if (/не содержит|нет признаков|не найден/i.test(value)) return verdict === "low" ? "Явных угроз не видно" : "Требует проверки";
  if (/зона|tld|доменн/i.test(value)) return "Доменная зона";
  if (/поддомен|структур/i.test(value)) return "Структура URL";

  return verdict === "low" ? "Позитивный сигнал" : verdict === "high" ? "Сигнал риска" : "Сигнал проверки";
}

export function isGenericReasonTitle(title: string) {
  return /^(сигнал|наблюдение)\s*\d*$/i.test(String(title || "").trim());
}

export function inferReasonTopic(reason: any) {
  const value = `${String(reason?.title || "")} ${String(reason?.detail || "")}`.toLowerCase();

  if (/openphish/.test(value)) return "openphish";
  if (/urlabuse/.test(value)) return "urlabuse";
  if (/бренд|spoof|typo|подмен|roblox|vercel|openai|github|google|telegram/.test(value)) return "brand";
  if (/ssl|https|сертификат|шифрован|tls/.test(value)) return "https";
  if (/dns|ns\b|регистрац/.test(value)) return "dns";
  if (/redirect|редирект|перенаправ/.test(value)) return "redirect";
  if (/поддомен|структур|ядро домена/.test(value)) return "subdomain";
  if (/зона|tld|доменн/.test(value)) return "tld";
  if (/query|параметр|порт|@/.test(value)) return "url-structure";
  if (/репутац|blacklist|базах фишингов|фишинг/.test(value)) return "reputation";

  return sanitizeString(reason?.title || reason?.detail || "", 60).toLowerCase();
}

export function filterNovelAiReasons(aiReasons: any[] = [], localReasons: any[] = []) {
  const localTopics = new Set(localReasons.map((reason) => inferReasonTopic(reason)));
  const seenTopics = new Set();

  return aiReasons.filter((reason) => {
    const topic = inferReasonTopic(reason);
    const detail = sanitizeString(reason?.detail || "", 220).toLowerCase();
    const hasConcretePayload =
      detail.length >= 38 ||
      /openphish|urlabuse|xn--|redirect|поддомен|зона|бренд|spoof|typo|dns|https|tls/.test(detail);

    if (seenTopics.has(topic)) return false;
    if (localTopics.has(topic) && !hasConcretePayload) return false;

    seenTopics.add(topic);
    return true;
  });
}

export function reasonMentionsConcreteSignal(reason: any, normalized: any) {
  const text = `${String(reason?.title || "")} ${String(reason?.detail || "")}`.toLowerCase();
  const hostTokens = normalized.host
    .split(".")
    .map((part: string) => part.trim().toLowerCase())
    .filter((part: string) => part.length >= 4);
  const pathTokens = normalized.url.pathname
    .split(/[\\/._-]+/)
    .map((part: string) => part.trim().toLowerCase())
    .filter((part: string) => part.length >= 4);

  return (
    [...hostTokens, ...pathTokens].some((token) => text.includes(token)) ||
    /openphish|urlabuse|xn--|https|dns|tls|redirect|поддомен|зона|бренд|spoof|typo/.test(text)
  );
}

export function alignScoreWithVerdict(score: number, verdict: string) {
  const normalized = Math.max(0, Math.min(100, Number(score) || 0));

  if (verdict === "high") return Math.max(normalized, 65);
  if (verdict === "medium") return Math.min(64, Math.max(normalized, 30));

  return Math.min(normalized, 29);
}

export function isContradictorySummary(summary: string, verdict: string) {
  const value = sanitizeString(summary || "", 220).toLowerCase();

  if (!value) return true;

  const calmPatterns = [
    "не выявлен",
    "не обнаружен",
    "сильных тревожных признаков не найдено",
    "явных угроз не видно",
    "выглядит легитим",
    "выглядит норм",
    "всё норм",
    "все норм",
  ];

  if (verdict === "high" || verdict === "medium") {
    return calmPatterns.some((pattern) => value.includes(pattern));
  }

  return false;
}

export function sanitizeAnalysis(aiPayload: any, input: string, localAnalysis: any) {
  const normalized = normalizeInput(input);
  if ("error" in normalized) throw new Error(normalized.error as string);

  const fallbackVerdict = sanitizeVerdict(localAnalysis?.verdict);
  const aiVerdict = sanitizeVerdict(aiPayload?.verdict);
  const verdictPriority: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const verdict =
    verdictPriority[aiVerdict] >= verdictPriority[fallbackVerdict]
      ? aiVerdict
      : fallbackVerdict;

  const rawScore = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(Number(aiPayload?.score))
        ? Number(aiPayload.score)
        : Number.isFinite(Number(localAnalysis?.score))
          ? Number(localAnalysis.score)
          : 50,
    ),
  );
  const score = alignScoreWithVerdict(rawScore, verdict);

  const reasons = Array.isArray(aiPayload?.reasons)
    ? aiPayload.reasons.slice(0, 6).map((item: any, index: number) => {
        if (typeof item === "string") {
          const tone = inferReasonTone(verdict);
          return {
            title: inferReasonTitle(item, verdict) || `Сигнал ${index + 1}`,
            detail: sanitizeString(item),
            scoreDelta: inferReasonScoreDelta(verdict),
            tone,
          };
        }

        const fallbackTone = inferReasonTone(verdict);
        const fallbackTitle = inferReasonTitle(item?.detail || item?.title || "", verdict);
        return {
          title: sanitizeString(
            isGenericReasonTitle(item?.title) ? fallbackTitle : item?.title || fallbackTitle,
            100,
          ),
          detail: sanitizeString(
            item?.detail || "AI вернул краткое объяснение без деталей.",
          ),
          scoreDelta: Number.isFinite(Number(item?.scoreDelta))
            ? Math.max(-50, Math.min(60, Number(item.scoreDelta)))
            : inferReasonScoreDelta(verdict),
          tone: item?.tone ? sanitizeTone(item?.tone) : fallbackTone,
        };
      })
    : [];
  const filteredAiReasons = filterNovelAiReasons(
    reasons,
    Array.isArray(localAnalysis?.reasons) ? localAnalysis.reasons : [],
  ).filter((reason) => reasonMentionsConcreteSignal(reason, normalized));

  const aiReasonsAreOnlyBenignNetworkNotes =
    filteredAiReasons.length > 0 &&
    filteredAiReasons.every((reason) => isBenignNetworkReason(reason, normalized));

  const downgradedVerdict =
    fallbackVerdict === "low" && aiReasonsAreOnlyBenignNetworkNotes ? "low" : verdict;

  const actions = Array.isArray(aiPayload?.actions)
    ? aiPayload.actions
        .slice(0, 5)
        .map((item: any) => sanitizeString(item, 200))
        .filter(Boolean)
    : defaultActions(verdict);

  const mergedReasons = [...filteredAiReasons];
  if (Array.isArray(localAnalysis?.reasons)) {
    const existingTitles = new Set(mergedReasons.map((r) => r.title.toLowerCase()));
    for (const lr of localAnalysis.reasons) {
      if (!existingTitles.has(lr.title.toLowerCase())) {
        mergedReasons.push(lr);
      }
    }
  }

  const safeSummary = sanitizeString(aiPayload?.summary || "", 600);
  const summary =
    !safeSummary || isContradictorySummary(safeSummary, verdict)
      ? sanitizeString(localAnalysis?.summary || safeSummary, 600)
      : safeSummary;

  return {
    host: normalized.host,
    score:
      fallbackVerdict === "low" && aiReasonsAreOnlyBenignNetworkNotes
        ? Math.min(10, alignScoreWithVerdict(rawScore, "low"))
        : score,
    verdict: downgradedVerdict,
    verdictLabel: verdictLabel(downgradedVerdict),
    summary:
      fallbackVerdict === "low" && aiReasonsAreOnlyBenignNetworkNotes
        ? sanitizeString(localAnalysis?.summary || summary, 600)
        : summary,
    reasons:
      mergedReasons.length > 0
        ? mergedReasons.slice(0, 8)
        : [
            {
              title: "AI не вернул причины",
              detail:
                "Сервер получил ответ без объяснений и использовал безопасный fallback.",
              scoreDelta: 0,
              tone: "warning",
            },
          ],
    actions:
      actions.length > 0
        ? actions
        : Array.isArray(localAnalysis?.actions) && localAnalysis.actions.length > 0
          ? localAnalysis.actions.slice(0, 5)
          : defaultActions(verdict),
    breakdown: buildBreakdown(normalized.host as string),
  };
}

export function mergeUniqueReasons(primary: any[] = [], secondary: any[] = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((reason) => {
    const key = `${String(reason?.title || "").toLowerCase()}::${String(reason?.detail || "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergeUniqueActions(primary: any[] = [], secondary: any[] = []) {
  const seen = new Set();
  return [...primary, ...secondary].filter((action) => {
    const key = sanitizeString(action, 200).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function applyAiToAnalysis(baseAnalysis: any, aiAnalysis: any, normalized: any) {
  if (!baseAnalysis || !aiAnalysis) return baseAnalysis;

  const verdictPriority: Record<string, number> = { low: 0, medium: 1, high: 2 };
  const chosenVerdict =
    verdictPriority[aiAnalysis.verdict] >= verdictPriority[baseAnalysis.verdict]
      ? aiAnalysis.verdict
      : baseAnalysis.verdict;
  const chosenScore = alignScoreWithVerdict(
    Math.max(Number(baseAnalysis.score) || 0, Number(aiAnalysis.score) || 0),
    chosenVerdict,
  );

  return {
    ...baseAnalysis,
    host: normalized.host,
    analyzedAt: new Date().toISOString(),
    breakdown: buildBreakdown(normalized.host),
    verdict: chosenVerdict,
    verdictLabel: verdictLabel(chosenVerdict),
    score: chosenScore,
    summary: sanitizeString(aiAnalysis.summary || baseAnalysis.summary, 600),
    reasons: mergeUniqueReasons(baseAnalysis.reasons || [], aiAnalysis.reasons || []).slice(0, 8),
    actions: mergeUniqueActions(baseAnalysis.actions || [], aiAnalysis.actions || []).slice(0, 5),
  };
}

export function sanitizeAdminReasons(reasons: any[], fallbackVerdict: string) {
  if (!Array.isArray(reasons)) return [];

  return reasons
    .map((reason, index) => {
      if (typeof reason === "string") {
        const detail = sanitizeString(reason, 240);
        if (!detail) return null;
        return {
          title: inferReasonTitle(detail, fallbackVerdict) || `Сигнал ${index + 1}`,
          detail,
          scoreDelta: inferReasonScoreDelta(fallbackVerdict),
          tone: inferReasonTone(fallbackVerdict),
        };
      }

      const detail = sanitizeString(reason?.detail || "", 240);
      const title = sanitizeString(reason?.title || "", 100);
      if (!detail && !title) return null;

      return {
        title: title || inferReasonTitle(detail, fallbackVerdict) || `Сигнал ${index + 1}`,
        detail: detail || "Ручная правка без подробностей.",
        scoreDelta: Number.isFinite(Number(reason?.scoreDelta))
          ? Math.max(-50, Math.min(60, Number(reason.scoreDelta)))
          : inferReasonScoreDelta(fallbackVerdict),
        tone: reason?.tone ? sanitizeTone(reason.tone) : inferReasonTone(fallbackVerdict),
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

export function sanitizeAdminActions(actions: any[], fallbackVerdict: string) {
  if (!Array.isArray(actions)) return defaultActions(fallbackVerdict);

  const nextActions = actions
    .map((item) => sanitizeString(typeof item === "string" ? item : String(item || ""), 200))
    .filter(Boolean)
    .slice(0, 5);

  return nextActions.length > 0 ? nextActions : defaultActions(fallbackVerdict);
}

export function applyAdminEditsToResponseData(data: any, edits: any = {}, host: string) {
  const currentFinal = data?.aiAdjustedResult || data?.enrichedLocalResult || data?.analysis || {};
  const currentAnalysis = data?.analysis || currentFinal || {};
  const nextVerdict = sanitizeVerdict(edits?.verdict || currentFinal?.verdict || currentAnalysis?.verdict);
  const rawScore = Number.isFinite(Number(edits?.score))
    ? Number(edits.score)
    : Number.isFinite(Number(currentFinal?.score))
      ? Number(currentFinal.score)
      : Number.isFinite(Number(currentAnalysis?.score))
        ? Number(currentAnalysis.score)
        : 50;
  const nextScore = alignScoreWithVerdict(rawScore, nextVerdict);
  const nextSummary = sanitizeString(
    edits?.summary || currentFinal?.summary || currentAnalysis?.summary || "",
    600,
  );
  const nextReasons = sanitizeAdminReasons(
    Array.isArray(edits?.reasons) ? edits.reasons : currentFinal?.reasons || currentAnalysis?.reasons || [],
    nextVerdict,
  );
  const nextActions = sanitizeAdminActions(
    Array.isArray(edits?.actions) ? edits.actions : currentFinal?.actions || currentAnalysis?.actions || [],
    nextVerdict,
  );
  const nextBreakdown = buildBreakdown(host);
  const moderationNote = sanitizeString(edits?.note || "", 280);
  const timestamp = new Date().toISOString();

  return {
    ...data,
    analysis: {
      ...currentAnalysis,
      host,
      verdict: nextVerdict,
      verdictLabel: verdictLabel(nextVerdict),
      score: nextScore,
      summary: nextSummary,
      reasons: nextReasons,
      actions: nextActions,
      breakdown: nextBreakdown,
    },
    aiAdjustedResult: {
      ...currentFinal,
      host,
      verdict: nextVerdict,
      verdictLabel: verdictLabel(nextVerdict),
      score: nextScore,
      summary: nextSummary,
      reasons: nextReasons,
      actions: nextActions,
      analyzedAt: timestamp,
      breakdown: nextBreakdown,
    },
    source: "cache-admin",
    moderation: {
      moderated: true,
      updatedAt: timestamp,
      note: moderationNote || null,
    },
  };
}

export function buildNetworkSignalSummary(networkSignals: any) {
  if (!networkSignals) return "network: unavailable";

  const dnsLine = `dns_resolved: ${networkSignals.dns?.resolved ? "yes" : "no"}, a=${networkSignals.dns?.ipv4Count || 0}, aaaa=${networkSignals.dns?.ipv6Count || 0}, cname=${Array.isArray(networkSignals.dns?.cnames) ? networkSignals.dns.cnames.join(",") || "none" : "none"}`;
  const httpLine = `http_status: ${networkSignals.http?.status ?? "n/a"}, redirected: ${networkSignals.http?.redirected ? "yes" : "no"}, redirect_host: ${networkSignals.http?.redirectHost || "none"}`;
  const tlsLine = `tls_available: ${networkSignals.tls?.available ? "yes" : "no"}, tls_subject: ${networkSignals.tls?.subject || "none"}, tls_issuer: ${networkSignals.tls?.issuer || "none"}`;

  return [dnsLine, httpLine, tlsLine].join("\n");
}

export function buildThreatIntelSummary(threatIntel: any, urlAbuseIntel: any) {
  const openPhishLine = threatIntel
    ? `openphish: status=${threatIntel.status}, match=${threatIntel.matchType || "none"}, note=${sanitizeString(threatIntel.note || "", 180)}`
    : "openphish: unavailable";
  const urlAbuseLine = urlAbuseIntel
    ? `urlabuse: status=${urlAbuseIntel.status}, match=${urlAbuseIntel.matchType || "none"}, note=${sanitizeString(urlAbuseIntel.note || "", 180)}`
    : "urlabuse: unavailable";

  return [openPhishLine, urlAbuseLine].join("\n");
}

export function buildLocalSignalSummary(localAnalysis: any) {
  if (!Array.isArray(localAnalysis?.reasons) || localAnalysis.reasons.length === 0) {
    return "none";
  }

  return localAnalysis.reasons
    .slice(0, 5)
    .map((reason: any) => {
      const tone = sanitizeTone(reason?.tone);
      const delta = Number.isFinite(Number(reason?.scoreDelta))
        ? Number(reason.scoreDelta)
        : 0;
      return `${reason.title} [${tone}, ${delta >= 0 ? `+${delta}` : delta}]: ${sanitizeString(reason.detail, 180)}`;
    })
    .join("\n");
}

export function buildPrompt(
  input: string,
  normalized: any,
  localAnalysis: any,
  networkSignals: any,
  threatIntel: any,
  urlAbuseIntel: any,
) {
  const localReasons = buildLocalSignalSummary(localAnalysis);
  const networkSummary = buildNetworkSignalSummary(networkSignals);
  const threatIntelSummary = buildThreatIntelSummary(threatIntel, urlAbuseIntel);
  const breakdown = buildBreakdown(normalized.host as string);

  return `## КОНТЕКСТ
Ты не оцениваешь домен с нуля. У тебя уже есть локальный ruleset, данные phishing-баз и сетевые проверки.
Твоя задача: перепроверить вывод, добавить ТОЛЬКО новые конкретные наблюдения, и сформировать итог.

## ВХОДНЫЕ ДАННЫЕ
input: ${sanitizeString(input, 280)}
host: ${normalized.host}
registrable_domain: ${breakdown.registrableDomain}
subdomain: ${breakdown.subdomain || "none"}
tld: ${breakdown.tld}
path: ${normalized.url.pathname || "/"}
query: ${normalized.url.search ? sanitizeString(normalized.url.search, 200) : "none"}
local_verdict: ${localAnalysis?.verdict || "unknown"}
local_score: ${Number.isFinite(Number(localAnalysis?.score)) ? Number(localAnalysis.score) : 0}
local_summary: ${sanitizeString(localAnalysis?.summary || "", 280)}

## ЛОКАЛЬНЫЕ СИГНАЛЫ (ruleset)
${localReasons}

## THREAT FEEDS
${threatIntelSummary}

## СЕТЕВЫЕ СИГНАЛЫ (DNS / HTTP / TLS)
${networkSummary}

## ИНСТРУКЦИИ ПО АНАЛИЗУ СЕТЕВЫХ СИГНАЛОВ
- Если dns_resolved=no → домен не резолвится, это серьёзный warning (может быть новый/свежий фишинг или мёртвый домен).
- Если http redirect ведёт на ДРУГОЙ registrable domain → это critical: redirect-маскировка.
- Если apex-домен просто ведёт на \`www\` того же registrable domain — это НОРМАЛЬНО и не должно считаться риском.
- Если tls_subject — wildcard внутри того же registrable domain (\`*.example.com\` для \`www.example.com\` или \`example.com\`) — это не сигнал риска само по себе.
- Если запрос к apex домену (example.com), а TLS сертификат выдан на www поддомен (www.example.com) — это НОРМАЛЬНАЯ практика редиректа и НЕ является риском.
- Если запрос к www поддомену (www.example.com), а TLS сертификат выдан на apex домен (example.com) — это тоже НОРМАЛЬНО.
- Если tls_available=no для https-ссылки → warning: сертификат не получен.
- Если http_status=4xx или 5xx → warning: сайт может быть недействителен.

## ПРАВИЛА
1. Причин максимум 4. Действий максимум 3.
2. Заголовок причины: 1-3 слова. БЕЗ нумерации, БЕЗ "Сигнал 1".
3. В detail ОБЯЗАТЕЛЬНО упоминай конкретный фрагмент: имя хоста, токен, TLD, или источник (OpenPhish, DNS, TLS).
4. Не повторяй локальные причины теми же словами.
5. Если локальный анализ видит typo-squat, brand-spoof, punycode, OpenPhish-hit, URLAbuse-hit — НЕ смягчай итог.
6. Если данных мало — честно напиши, но не додумывай.
7. Summary: 1-2 предложения, по существу. Не пиши "выглядит легитимно" если score > 20.
8. scoreDelta: отрицательный для позитива, положительный для риска.
9. Если нет новых полезных причин — верни пустой массив reasons.
10. Анализируй корреляции: несколько слабых сигналов вместе могут означать высокий риск.
11. Обращай внимание на несоответствия: например, известный бренд на подозрительном TLD.
12. Chain-of-thought: Сначала мысленно классифицируй домен (официальный / подозрительный / явный фишинг), затем формулируй вердикт.
13. Scoring guide: low=0-19 (безопасный), medium=20-49 (подозрительный), high=50-100 (опасный). Не ставь score=0 если есть хоть один сигнал.

## ПРИМЕРЫ ХОРОШЕГО И ПЛОХОГО СТИЛЯ
❌ Плохо: "домен выглядит нормально", "есть отдельный поддомен", "используется HTTPS"
✅ Хорошо: "Токен 'riblox' похож на 'roblox' — вероятный typo-squat"
✅ Хорошо: "Redirect на другой домен: ${normalized.host} → [redirect_host]"
✅ Хорошо: "TLS сертификат выдан на *.cloudflare.com, а не на ${normalized.host}"
✅ Хорошо: "DNS не резолвится — домен может быть свежим или уже заблокирован"

## ИЗВЕСТНЫЕ ФИШИНГОВЫЕ ТЕХНИКИ (из реальной базы угроз)
1. **Discord-фишинг**: dicsord, discrod, dlscord, disc0rd, disccord — вариации с заменой букв
2. **Steam-фишинг**: steamcommunity с опечатками (steancommunity, steamcomminity, etc)
3. **Префиксы-ловушки**: free-, get-, claim-, verify-, official-, secure-
4. **Подозрительные TLD**: .tk, .ml, .ga, .cf, .gq, .xyz часто используются для фишинга
5. **Комбинации**: discord-nitro, steam-gift, free-robux — сочетание бренда + приманка

## ФОРМАТ ОТВЕТА (строго JSON)
{"verdict":"low|medium|high","score":0,"summary":"...","reasons":[{"title":"...","detail":"...","tone":"positive|warning|critical","scoreDelta":0}],"actions":["..."]}`;
}

export async function requestGroq({ apiKey, model, prompt, retries = 0 }: { apiKey: string, model: string, prompt: string, retries?: number }) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 8_000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const requestBody = buildGroqRequest(model, prompt);
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify(requestBody),
          },
        );

        const responseText = await response.text();
        let data: any = null;

        try {
          data = responseText ? JSON.parse(responseText) : null;
        } catch {
          data = null;
        }

        log("debug", "Upstream response", {
          model,
          status: response.status,
          contentLength: responseText.length,
          finishReason: data?.choices?.[0]?.finish_reason ?? null,
          hasContent: Boolean(data?.choices?.[0]?.message?.content),
          hasReasoning: Boolean(
            data?.choices?.[0]?.message?.reasoning ||
              data?.choices?.[0]?.message?.reasoning_details?.length,
          ),
        });

        if (!response.ok) {
          if (response.status === 429 && attempt < retries) {
            const retryAfter = Number(response.headers.get("retry-after")) || 2;
            await new Promise((resolve) =>
              setTimeout(resolve, retryAfter * 1000),
            );
            continue;
          }

          throw new Error(
            `${model}: HTTP ${response.status} — ${sanitizeString(responseText || response.statusText, 200)}`,
          );
        }

        if (!data) {
          throw new Error(`${model}: upstream returned non-JSON payload.`);
        }

        const content = data?.choices?.[0]?.message?.content;
        return extractJson(content);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: any) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = new Error(`${model}: upstream request timed out.`);
      } else {
        lastError = error;
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}
