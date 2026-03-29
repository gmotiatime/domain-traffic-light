import { useEffect, useRef, useState } from "react";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";
import { consumeAnalyzerPrefill } from "@/lib/analyzer-prefill";
import {
  analyzeDomainInput,
  type AnalyzerReason,
  type AnalysisResult,
} from "@/lib/domain-analyzer";
import { officialDomains, ruleReference } from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

const reveal = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

const verdictStyles = {
  low: {
    text: "text-success",
    surface:
      "border-success/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(8,44,58,0.92))]",
    progress: "bg-success",
  },
  medium: {
    text: "text-warning",
    surface:
      "border-warning/20 bg-[linear-gradient(180deg,rgba(245,158,11,0.16),rgba(8,44,58,0.92))]",
    progress: "bg-warning",
  },
  high: {
    text: "text-danger",
    surface:
      "border-danger/24 bg-[linear-gradient(180deg,rgba(239,68,68,0.2),rgba(8,44,58,0.94))]",
    progress: "bg-danger",
  },
} as const;

const signalStyles = {
  positive: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  critical: "bg-danger/12 text-danger",
} as const;

const actionIcons = [ShieldAlert, Search, ShieldQuestion, ExternalLink];

type AiHealthStatus = "checking" | "ready" | "missing-key" | "offline";

type AiHealth = {
  status: AiHealthStatus;
  note: string;
};

type AiExplanation = {
  model: string;
  summary: string;
  score: number;
  verdictLabel: string;
  reasons: AnalyzerReason[];
  actions: string[];
};

type ThreatIntel = {
  source: string;
  status: "hit" | "clear" | "unavailable";
  matchType?: string;
  note: string;
  checkedAt?: string;
  feedFetchedAt?: string;
  hostMatches?: number;
};

function primaryAction(verdict: "low" | "medium" | "high") {
  if (verdict === "high") {
    return "Не переходите по ссылке. Не вводите данные.";
  }

  if (verdict === "medium") {
    return "Сначала сравните домен с официальным адресом.";
  }

  return "Сверьте адрес вручную. Продолжайте только при полном совпадении.";
}

function formatErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 200);
}

function isGenericAiTitle(title: string) {
  return /^(сигнал|наблюдение)\s*\d*$/i.test(title.trim());
}

function inferShortAiTitleFromText(text: string, tone: AnalyzerReason["tone"]) {
  const value = String(text || "").toLowerCase();

  if (/ssl|https|сертификат|шифрован/i.test(value)) {
    return "HTTPS";
  }

  if (/dns|ns\b|регистрац/i.test(value)) {
    return "DNS";
  }

  if (/фишинг.*баз|базах фишингов|blacklist|репутац/i.test(value)) {
    return "Репутация";
  }

  if (/бренд|компан|openai|google|bank|a1|beltelecom|cert/i.test(value)) {
    return "Бренд";
  }

  if (/зона|tld|доменн/i.test(value)) {
    return "Зона";
  }

  if (/поддомен|структур|url|адрес/i.test(value)) {
    return "Структура URL";
  }

  if (/возраст|давно|долг/i.test(value)) {
    return "Возраст домена";
  }

  return tone === "positive"
    ? "Позитивный сигнал"
    : tone === "critical"
      ? "Сигнал риска"
      : "Нужна проверка";
}

function aiToneLabel(tone: AnalyzerReason["tone"]) {
  if (tone === "positive") return "AI: позитивно";
  if (tone === "critical") return "AI: риск";
  return "AI: проверка";
}

function aiReasonTitle(reason: AnalyzerReason, index: number) {
  const title = reason.title.trim();

  if (!title || isGenericAiTitle(title)) {
    return inferShortAiTitleFromText(reason.detail, reason.tone);
  }

  return title.length > 36 ? `${title.slice(0, 35).trimEnd()}…` : title;
}

function mergeReasons(primary: AnalyzerReason[], secondary: AnalyzerReason[]) {
  const seen = new Set<string>();

  return [...primary, ...secondary]
    .filter((reason) => {
      const key = `${reason.title}::${reason.detail}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function mergeActions(primary: string[], secondary: string[]) {
  const seen = new Set<string>();

  return [...primary, ...secondary]
    .filter((action) => {
      const key = action.trim();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

function sameReason(left: AnalyzerReason, right: AnalyzerReason) {
  return (
    left.title.trim().toLowerCase() === right.title.trim().toLowerCase() &&
    left.detail.trim().toLowerCase() === right.detail.trim().toLowerCase()
  );
}

export function AnalyzerPage() {
  const activeRequestRef = useRef(0);
  const [draft, setDraft] = useState("xn--epasluga-verify.test");
  const [result, setResult] = useState<AnalysisResult>(() =>
    analyzeDomainInput("xn--epasluga-verify.test"),
  );
  const [statusNote, setStatusNote] = useState("");
  const [isAiEnriching, setIsAiEnriching] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntel | null>(null);
  const [aiHealth, setAiHealth] = useState<AiHealth>({
    status: "checking",
    note: "Проверяем AI backend.",
  });

  const topReasons = result.reasons.slice(0, 4);
  const quickActions = result.actions.slice(0, 4);
  const summaryHighlights = (
    aiExplanation?.reasons.length
      ? aiExplanation.reasons.map((reason, index) => aiReasonTitle(reason, index))
      : topReasons.map((reason) => reason.title)
  ).slice(0, 3);
  const summaryText = aiExplanation?.summary || result.summary;
  const aiUniqueReasons = aiExplanation
    ? aiExplanation.reasons
        .filter(
          (reason) => !topReasons.some((baseReason) => sameReason(reason, baseReason)),
        )
        .slice(0, 2)
    : [];

  useEffect(() => {
    let cancelled = false;

    async function readHealth() {
      try {
        const response = await fetch(getApiUrl("/api/health"));
        if (!response.ok) {
          throw new Error("AI proxy health request failed.");
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        if (payload?.aiConfigured) {
          setAiHealth({
            status: "ready",
            note: "AI доступен.",
          });
          return;
        }

        setAiHealth({
          status: "missing-key",
          note: payload?.hasLocalEnvFile ? "Нет рабочего AI-ключа." : "AI не настроен.",
        });
      } catch {
        if (cancelled) {
          return;
        }

        setAiHealth({
          status: "offline",
          note: "AI backend недоступен.",
        });
      }
    }

    void readHealth();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const pendingInput = consumeAnalyzerPrefill();

    if (pendingInput) {
      setDraft(pendingInput);
      runAnalysis(pendingInput);
    }
  }, []);

  function applyLocalFallback(nextInput: string, note: string) {
    setAiExplanation(null);
    setThreatIntel(null);
    setResult(analyzeDomainInput(nextInput));
    setStatusNote(note);
  }

  function runAnalysis(nextInput: string) {
    const normalizedInput = nextInput.trim();
    setDraft(normalizedInput);
    setStatusNote("");

    if (!normalizedInput) {
      applyLocalFallback(normalizedInput, "Введите домен или URL.");
      return;
    }

    const preview = analyzeDomainInput(normalizedInput);
    setAiExplanation(null);
    setThreatIntel(null);
    console.info("[analyzer] local-analysis", {
      input: normalizedInput,
      host: preview.host,
      verdict: preview.verdict,
      score: preview.score,
    });
    setResult(preview);

    if (aiHealth.status !== "offline") {
      void enrichWithAi(normalizedInput, preview);
    }
  }

  async function enrichWithAi(nextInput: string, baseResult: AnalysisResult) {
    if (aiHealth.status === "offline") {
      setStatusNote("Backend недоступен. Показан быстрый локальный разбор.");
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setStatusNote("AI уточняет объяснение...");
    setIsAiEnriching(true);
    console.info("[analyzer] ai-start", {
      input: nextInput,
      host: baseResult.host,
      verdict: baseResult.verdict,
      score: baseResult.score,
    });

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 18000);

      const response = await fetch(getApiUrl("/api/analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({ input: nextInput, localAnalysis: baseResult }),
      }).finally(() => {
        window.clearTimeout(timeoutId);
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        if (errorPayload?.enrichedLocalResult) {
          setResult(errorPayload.enrichedLocalResult);
        }
        if (errorPayload?.threatIntel) {
          setThreatIntel(errorPayload.threatIntel);
        }
        const errorMessage = [
          String(errorPayload?.error || "").trim(),
          String(errorPayload?.detail || "").trim(),
        ]
          .filter(Boolean)
          .join(" ");

        throw new Error(errorMessage || "AI analysis request failed.");
      }

      const payload = await response.json();
      if (activeRequestRef.current !== requestId) {
        return;
      }

      if (payload.enrichedLocalResult) {
        setResult(payload.enrichedLocalResult);
      }

      setThreatIntel(payload.threatIntel ?? null);

      const nextAiExplanation = payload.analysis
        ? {
            model: payload.model ?? "AI",
            summary: payload.analysis.summary || "",
            score:
              typeof payload.analysis.score === "number"
                ? payload.analysis.score
                : baseResult.score,
            verdictLabel: payload.analysis.verdictLabel ?? baseResult.verdictLabel,
            reasons: Array.isArray(payload.analysis.reasons)
              ? payload.analysis.reasons.slice(0, 3)
              : [],
            actions: Array.isArray(payload.analysis.actions)
              ? payload.analysis.actions.slice(0, 3)
              : [],
          }
        : null;

      setAiExplanation(nextAiExplanation);
      console.info("[analyzer] ai-success", {
        input: nextInput,
        host: baseResult.host,
        model: payload.model ?? null,
        threatIntel: payload.threatIntel?.status ?? null,
        reasons: Array.isArray(payload.analysis?.reasons)
          ? payload.analysis.reasons.length
          : 0,
      });
      const statusParts = [];
      if (payload.threatIntel?.status === "hit") {
        statusParts.push("OpenPhish нашёл совпадение");
      } else if (payload.threatIntel?.status === "clear") {
        statusParts.push("OpenPhish: совпадений нет");
      }
      if (payload.model) {
        statusParts.push(`AI добавил пояснение · ${payload.model}`);
      } else if (payload.threatIntel) {
        statusParts.push("Обновлён результат по phishing-базе");
      }
      setStatusNote(statusParts.join(" · ") || "Анализ обновлён.");
    } catch (error) {
      if (activeRequestRef.current !== requestId) {
        return;
      }

      const errorMessage =
        error instanceof Error
          ? formatErrorMessage(
              error.name === "AbortError"
                ? "AI ответил слишком медленно."
                : error.message,
            )
          : "AI analysis request failed.";

      console.warn("[analyzer] ai-fail", {
        input: nextInput,
        host: baseResult.host,
        error: errorMessage,
      });
      setStatusNote(`AI не успел: ${errorMessage}`);
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsAiEnriching(false);
      }
    }
  }

  return (
    <section className="min-h-[calc(100vh-6rem)] bg-background text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <motion.div
          className="rounded-[1.8rem] border border-white/10 bg-card/75 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-6 md:p-7"
          {...reveal}
        >
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-end">
            <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  {aiExplanation ? "Краткая сводка AI" : "Краткая сводка"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {result.verdictLabel} · {result.score}/100
                </span>
                {aiExplanation ? (
                  <span className="rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent">
                    {aiExplanation.model}
                  </span>
                ) : null}
              </div>
              <p className="mt-4 max-w-2xl text-lg leading-snug text-foreground sm:text-xl">
                {summaryText}
              </p>
              {summaryHighlights.length > 0 ? (
                <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {summaryHighlights.map((item, index) => (
                    <div
                      key={`${item}-${index}-summary`}
                      className="rounded-[1rem] border border-white/8 bg-background/28 px-3 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[11px] text-foreground/82">
                          {index + 1}
                        </span>
                        <p className="text-sm leading-relaxed text-foreground/84">{item}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <form
              className="rounded-[1.55rem] border border-white/10 bg-background/45 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                runAnalysis(draft);
              }}
            >
              <label
                className="flex h-12 items-center gap-3 rounded-[1rem] border border-white/10 bg-background/70 px-4 sm:h-[52px]"
                htmlFor="domain-input"
              >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  id="domain-input"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Введите домен или ссылку"
                  value={draft}
                />
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button className="h-11 w-full px-5 text-sm sm:flex-1" type="submit">
                  Проверить домен
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full px-4 text-sm text-muted-foreground transition-colors hover:text-foreground sm:justify-start"
                  href={routeHref("/method")}
                >
                  Методика
                </a>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {isAiEnriching
                    ? "AI уточняет"
                    : aiHealth.status === "ready"
                      ? "AI включён"
                      : "Быстрый разбор"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  {result.breakdown.registrableDomain}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                  .{result.breakdown.tld}
                </span>
                {threatIntel ? (
                  <span
                    className={[
                      "rounded-full border px-3 py-1.5",
                      threatIntel.status === "hit"
                        ? "border-danger/30 bg-danger/10 text-danger"
                        : threatIntel.status === "clear"
                          ? "border-white/10 bg-white/5"
                          : "border-warning/30 bg-warning/10 text-warning",
                    ].join(" ")}
                    title={threatIntel.note}
                  >
                    {threatIntel.status === "hit"
                      ? "OpenPhish: найдено"
                      : threatIntel.status === "clear"
                        ? "OpenPhish: нет совпадений"
                        : "OpenPhish: недоступен"}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 rounded-[1rem] border border-white/8 bg-background/34 px-3.5 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground/88">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Статус анализа
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-foreground/82">
                      {statusNote || "Введите адрес и запустите проверку. AI дополнит объяснение после локального анализа."}
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <motion.section
            className={[
              "rounded-[1.8rem] border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6",
              verdictStyles[result.verdict].surface,
            ].join(" ")}
            {...reveal}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-background/55 px-3 py-1 text-xs text-muted-foreground">
                Вердикт
              </span>
              <span className="rounded-full border border-white/10 bg-background/55 px-3 py-1 text-xs text-muted-foreground">
                Балл {result.score}/100
              </span>
            </div>

            <div className="mt-5">
              <div>
                <h2
                  className={`text-4xl leading-none sm:text-5xl ${verdictStyles[result.verdict].text}`}
                >
                  {result.verdictLabel}
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/88">
                  {result.summary}
                </p>

                <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-background/48 px-4 py-4">
                  <p className="text-sm text-muted-foreground">Главный совет</p>
                  <p className="mt-2 text-xl leading-snug text-foreground">
                    {primaryAction(result.verdict)}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    <span>Низкий риск</span>
                    <span>Высокий риск</span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-background/55">
                    <div
                      className={`h-full rounded-full ${verdictStyles[result.verdict].progress}`}
                      style={{ width: `${Math.max(result.score, 5)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.1rem] border border-white/10 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Домен
                    </p>
                    <p className="mt-2 break-all text-foreground">{result.host}</p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/10 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Ядро
                    </p>
                    <p className="mt-2 break-all text-foreground">
                      {result.breakdown.registrableDomain}
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/10 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Поддомен / зона
                    </p>
                    <p className="mt-2 break-all text-foreground">
                      {result.breakdown.subdomain || "—"} / {result.breakdown.tld}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.3rem] border border-white/10 bg-background/34 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                        Почему такой вердикт
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{topReasons.length} сигнала</p>
                  </div>

                  <div className="mt-4 space-y-3">
                    {topReasons.map((reason, index) => (
                      <div
                        key={`${reason.title}-${index}`}
                        className="grid gap-3 rounded-[1.1rem] border border-white/10 bg-background/36 p-4 md:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-base text-foreground">{reason.title}</p>
                            <span
                              className={[
                                "rounded-full px-2.5 py-1 text-[11px]",
                                signalStyles[reason.tone],
                              ].join(" ")}
                            >
                              {reason.tone === "positive"
                                ? "Позитивный"
                                : reason.tone === "warning"
                                  ? "Предупреждение"
                                  : "Критично"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                            {reason.detail}
                          </p>
                        </div>
                        <p className="text-sm text-foreground">
                          {reason.scoreDelta > 0 ? `+${reason.scoreDelta}` : reason.scoreDelta}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {aiExplanation ? (
                  <div className="mt-4 rounded-[1.2rem] border border-accent/22 bg-accent/8 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent">
                        <Sparkles className="h-3.5 w-3.5" />
                        AI подтвердил вывод
                      </span>
                      <span className="rounded-full border border-white/10 bg-background/40 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {aiExplanation.model}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-foreground/88">
                      {aiExplanation.summary}
                    </p>

                    {aiUniqueReasons.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {aiUniqueReasons.map((reason, index) => (
                          <span
                            key={`${reason.title}-${index}-ai-inline`}
                            className="rounded-full border border-white/10 bg-background/45 px-3 py-1.5 text-xs text-foreground/84"
                            title={reason.detail}
                          >
                            {aiReasonTitle(reason, index)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.section>

          <motion.section
            className="rounded-[1.8rem] border border-white/10 bg-card/72 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-6"
            {...reveal}
          >
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-foreground" />
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                Следующее действие
              </p>
            </div>

            <div className="mt-5 rounded-[1.3rem] border border-white/10 bg-background/48 p-4">
              <p className="text-sm text-muted-foreground">Сейчас</p>
              <p className="mt-2 text-2xl leading-snug text-foreground">
                {primaryAction(result.verdict)}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {quickActions.map((action, index) => {
                const Icon = actionIcons[index] ?? ShieldQuestion;

                return (
                  <div
                    key={`${action}-${index}`}
                    className="flex gap-3 rounded-[1.2rem] border border-white/10 bg-background/42 p-4"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {action}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.details
            className="group rounded-[1.5rem] border border-white/10 bg-card/72 p-5"
            {...reveal}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base text-foreground">
              <span>Что учитывает модель</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-4">
              {ruleReference.map((rule, index) => (
                <div key={`${rule.title}-${index}`}>
                  <p className="text-sm text-foreground">{rule.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {rule.detail}
                  </p>
                </div>
              ))}
            </div>
          </motion.details>

          <motion.details
            className="group rounded-[1.5rem] border border-white/10 bg-card/72 p-5"
            {...reveal}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base text-foreground">
              <span>Справочные домены</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-4 space-y-4">
              {officialDomains.map((item, index) => (
                <div key={`${item.domain}-${index}`}>
                  <p className="text-sm text-foreground">{item.domain}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.details>
        </div>
      </div>
    </section>
  );
}
