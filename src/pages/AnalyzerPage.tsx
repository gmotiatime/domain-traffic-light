import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  TriangleAlert,
  Scale,
  Cat,
  Globe,
  Lock,
  Activity,
  Zap,
  Flag,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/api";
import { consumeAnalyzerPrefill } from "@/lib/analyzer-prefill";
import {
  analyzeDomainInput,
  type AnalyzerReason,
  type AnalysisResult,
} from "@/lib/domain-analyzer";
import { useHistory } from "@/lib/history-store";
import { officialDomains, ruleReference } from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";
import { ReportModal } from "@/components/ReportModal";
import { VerdictCard, SideColumn, SignalsRow, AiInsights, CyberLawSection, ReferenceSections } from "./AnalyzerPageComponents";


/* ─── animation presets ─── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

/* ─── verdict color system ─── */
const verdictConfig = {
  low: {
    label: "Безопасно",
    color: "#34d399",
    textClass: "text-emerald-400",
    bgGlow: "radial-gradient(ellipse at 50% 0%, rgba(52,211,153,0.08) 0%, transparent 60%)",
    borderClass: "border-emerald-500/15",
    progressClass: "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]",
    dotClass: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
    pillBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  medium: {
    label: "Подозрительно",
    color: "#fbbf24",
    textClass: "text-amber-400",
    bgGlow: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.08) 0%, transparent 60%)",
    borderClass: "border-amber-500/15",
    progressClass: "bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]",
    dotClass: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]",
    pillBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  high: {
    label: "Опасно",
    color: "#f43f5e",
    textClass: "text-rose-400",
    bgGlow: "radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.1) 0%, transparent 60%)",
    borderClass: "border-rose-500/15",
    progressClass: "bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]",
    dotClass: "bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]",
    pillBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
} as const;

const toneStyles = {
  positive: { pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Плюс" },
  warning: { pill: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Внимание" },
  critical: { pill: "bg-rose-500/10 text-rose-400 border-rose-500/20", label: "Риск" },
} as const;

const actionIcons = [ShieldAlert, Search, ShieldQuestion, ExternalLink];


/* ─── types ─── */
type AiHealthStatus = "checking" | "ready" | "missing-key" | "offline";
type AiHealth = { status: AiHealthStatus; note: string };
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

/* ─── helpers ─── */
function primaryAction(verdict: "low" | "medium" | "high") {
  if (verdict === "high") return "Не переходите по ссылке. Не вводите данные.";
  if (verdict === "medium") return "Сначала сравните домен с официальным адресом.";
  return "Сверьте адрес вручную. Продолжайте только при полном совпадении.";
}

function recommendedActions(verdict: "low" | "medium" | "high") {
  if (verdict === "high") {
    return [
      "Не переходите по ссылке и не вводите данные.",
      "Откройте официальный сайт вручную, а не через эту ссылку.",
      "Если ссылка пришла в сообщении, покажите её взрослому или специалисту.",
      "При необходимости отправьте адрес через официальный канал сообщения об инцидентах.",
    ];
  }

  if (verdict === "medium") {
    return [
      "Сначала сравните домен с официальным адресом символ в символ.",
      "Проверьте, не маскируется ли поддомен под основной сайт.",
      "Не вводите данные, пока не подтвердите адрес вручную.",
      "Если остаются сомнения, откройте официальный сайт через поисковик.",
    ];
  }

  return [
    "Сверьте адрес вручную перед вводом данных.",
    "Проверьте, что домен совпа��ает с ожидаемым сайтом.",
    "Продолжайте только при полном совпадении адреса.",
    "При желании проверьте сертификат и владельца домена вручную.",
  ];
}

function formatErrorMessage(message: string) {
  return message.replace(/\s+/g, " ").trim().slice(0, 200);
}

function isGenericAiTitle(title: string) {
  return /^(сигнал|наблюдение)\s*\d*$/i.test(title.trim());
}

function inferShortAiTitleFromText(text: string, tone: AnalyzerReason["tone"]) {
  const value = String(text || "").toLowerCase();
  if (/ssl|https|сертификат|шифрован/i.test(value)) return "HTTPS";
  if (/dns|ns\b|регистрац/i.test(value)) return "DNS";
  if (/фишинг.*баз|базах фишингов|blacklist|репутац/i.test(value)) return "Репутация";
  if (/бренд|компан|openai|google|bank|a1|beltelecom|cert/i.test(value)) return "Бренд";
  if (/зона|tld|доменн/i.test(value)) return "Зона";
  if (/поддомен|структур|url|адрес/i.test(value)) return "Структура URL";
  if (/возраст|давно|долг/i.test(value)) return "Возраст домена";
  return tone === "positive" ? "Позитивный сигнал" : tone === "critical" ? "Сигнал риска" : "Нужна проверка";
}

function aiReasonTitle(reason: AnalyzerReason, _index: number) {
  const title = reason.title.trim();
  if (!title || isGenericAiTitle(title)) return inferShortAiTitleFromText(reason.detail, reason.tone);
  return title.length > 36 ? `${title.slice(0, 35).trimEnd()}…` : title;
}

function sameReason(left: AnalyzerReason, right: AnalyzerReason) {
  return (
    left.title.trim().toLowerCase() === right.title.trim().toLowerCase() &&
    left.detail.trim().toLowerCase() === right.detail.trim().toLowerCase()
  );
}

import { StickersLayer, StickerData } from "@/components/StickersLayer";
const analyzerStickers: StickerData[] = [
  { src: "/sticker/1-64-256b.png", side: "left", top: "25%", rotation: -12 },
  { src: "/sticker/1-54-256b.png", side: "right", top: "55%", rotation: 10 },
  { src: "/sticker/1-60-256b.png", side: "left", top: "85%", rotation: 15 },
];

/* ════════════════════════════════════════════════ */
/*  MAIN ANALYZER PAGE                             */
/* ════════════════════════════════════════════════ */
export function AnalyzerPage() {
  const initialResult = analyzeDomainInput("");
  const activeRequestRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<AnalysisResult>(initialResult);
  const [baselineResult, setBaselineResult] = useState<AnalysisResult>(initialResult);
  const [statusNote, setStatusNote] = useState("");
  const [isAiEnriching, setIsAiEnriching] = useState(false);
  const [isCachedResult, setIsCachedResult] = useState(false);
  const [telemetryConsent, setTelemetryConsent] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("domain-traffic-light:telemetry") !== "false";
    }
    return true;
  });
  const [aiExplanation, setAiExplanation] = useState<AiExplanation | null>(null);
  const [threatIntel, setThreatIntel] = useState<ThreatIntel | null>(null);
  const [urlAbuseIntel, setUrlAbuseIntel] = useState<ThreatIntel | null>(null);
  const [isModerated, setIsModerated] = useState(false);
  const [aiHealth, setAiHealth] = useState<AiHealth>({
    status: "checking",
    note: "Проверяем AI backend.",
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, addHistory } = useHistory();

  const cfg = verdictConfig[result.verdict];
  const leadReason = result.reasons[0] ?? null;
  const visibleReasons = result.reasons.slice(1, 4);
  const quickActions = recommendedActions(result.verdict);
  const aiSignals = (aiExplanation?.reasons || [])
    .filter((r) => !baselineResult.reasons.some((br) => sameReason(br, r)))
    .slice(0, 3);
  const aiScoreShift = aiExplanation ? result.score - baselineResult.score : 0;
  
  let aiShiftLabel = aiExplanation && aiScoreShift !== 0
      ? `AI ${aiScoreShift > 0 ? `+${aiScoreShift}` : aiScoreShift}`
      : "AI подтвердил";
      
  if (isCachedResult) {
    aiShiftLabel = "⚡ Данные из базы";
  }

  /* ─── health check ─── */
  useEffect(() => {
    let cancelled = false;
    async function readHealth() {
      try {
        const response = await fetch(getApiUrl("/api/health"), {
          signal: AbortSignal.timeout(5000)
        });
        if (!response.ok) throw new Error("fail");
        const payload = await response.json();
        if (cancelled) return;
        if (payload?.aiConfigured) {
          setAiHealth({ status: "ready", note: "AI доступен." });
          return;
        }
        setAiHealth({ status: "missing-key", note: payload?.hasLocalEnvFile ? "Нет рабочего AI-ключа." : "AI не настроен." });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.name === "TimeoutError") {
          setAiHealth({ status: "offline", note: "AI недоступен" });
        } else {
          setAiHealth({ status: "offline", note: "Ошибка соединения" });
        }
      }
    }
    void readHealth();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const pendingInput = consumeAnalyzerPrefill();
    if (pendingInput) { setDraft(pendingInput); runAnalysis(pendingInput); }
  }, []);

  useEffect(() => {
    // Make sure we focus whenever the shortcut is activated
    const handleFocus = () => inputRef.current?.focus();
    window.addEventListener("focus-analyzer-input", handleFocus as EventListener);
    // Autofocus if mounting fresh without prefill
    if (!draft) handleFocus();
    
    return () => window.removeEventListener("focus-analyzer-input", handleFocus as EventListener);
  }, []);

  /* ─── analysis ─── */
  function applyLocalFallback(nextInput: string, note: string) {
    setAiExplanation(null); setThreatIntel(null); setUrlAbuseIntel(null);
    const localResult = analyzeDomainInput(nextInput);
    setBaselineResult(localResult); setResult(localResult); setStatusNote(note);
  }

  function runAnalysis(nextInput: string) {
    const normalizedInput = nextInput.trim();
    setDraft(normalizedInput); setStatusNote(""); setIsCachedResult(false); setIsModerated(false);
    if (!normalizedInput) { applyLocalFallback(normalizedInput, "Введите домен или URL."); return; }
    const preview = analyzeDomainInput(normalizedInput);
    if (preview.host !== "—") { addHistory(preview.host, preview.verdict); }
    setAiExplanation(null); setThreatIntel(null); setUrlAbuseIntel(null);
    setBaselineResult(preview); setResult(preview);
    if (aiHealth.status !== "offline") void enrichWithAi(normalizedInput, preview);
  }

  async function enrichWithAi(nextInput: string, baseResult: AnalysisResult) {
    if (aiHealth.status === "offline") { setStatusNote("Backend недоступен."); return; }
    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setStatusNote("AI уточняет…"); setIsAiEnriching(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 18000);
      const response = await fetch(getApiUrl("/api/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ input: nextInput, localAnalysis: baseResult, telemetryConsent }),
      }).finally(() => window.clearTimeout(timeoutId));

      if (!response.ok) {
        const ep = await response.json().catch(() => ({}));
        if (ep?.enrichedLocalResult) { setBaselineResult(ep.enrichedLocalResult); setResult(ep.enrichedLocalResult); }
        if (ep?.threatIntel) setThreatIntel(ep.threatIntel);
        if (ep?.urlAbuseIntel) setUrlAbuseIntel(ep.urlAbuseIntel);
        throw new Error([String(ep?.error||"").trim(), String(ep?.detail||"").trim()].filter(Boolean).join(" ") || "AI request failed.");
      }

      const payload = await response.json();
      if (activeRequestRef.current !== requestId) return;
      const nextBaseline = payload.enrichedLocalResult ?? baseResult;
      setBaselineResult(nextBaseline);
      setIsCachedResult(payload.cached === true);
      setIsModerated(payload.moderated === true);
      setResult(payload.aiAdjustedResult ?? nextBaseline);
      setThreatIntel(payload.threatIntel ?? null);
      setUrlAbuseIntel(payload.urlAbuseIntel ?? null);

      const nextAi = payload.analysis ? {
        model: payload.model ?? "AI",
        summary: payload.analysis.summary || "",
        score: typeof payload.analysis.score === "number" ? payload.analysis.score : baseResult.score,
        verdictLabel: payload.analysis.verdictLabel ?? baseResult.verdictLabel,
        reasons: Array.isArray(payload.analysis.reasons) ? payload.analysis.reasons.slice(0, 3) : [],
        actions: Array.isArray(payload.analysis.actions) ? payload.analysis.actions.slice(0, 3) : [],
      } : null;
      setAiExplanation(nextAi);

      const parts: string[] = [];
      if (payload.threatIntel?.status === "hit") parts.push("OpenPhish: совпадение");
      else if (payload.threatIntel?.status === "clear") parts.push("OpenPhish: чисто");
      if (payload.urlAbuseIntel?.status === "hit") parts.push("URLAbuse: совпадение");
      else if (payload.urlAbuseIntel?.status === "clear") parts.push("URLAbuse: чисто");
      if (payload.model) parts.push(`AI · ${payload.model}`);
      setStatusNote(parts.join(" · ") || "Анализ обновлён.");
    } catch (error) {
      if (activeRequestRef.current !== requestId) return;
      const msg = error instanceof Error
        ? formatErrorMessage(error.name === "AbortError" ? "AI ответил слишком медленно." : error.message)
        : "AI request failed.";
      setStatusNote(`AI: ${msg}`);
    } finally {
      if (activeRequestRef.current === requestId) setIsAiEnriching(false);
    }
  }

  /* ════════════════════════════════════════════════ */
  /*  RENDER                                         */
  /* ════════════════════════════════════════════════ */
  return (
    <section className="relative isolate min-h-[calc(100vh-6rem)] w-full overflow-hidden text-foreground bg-background">
      <StickersLayer items={analyzerStickers} />
      {/* ── Background layers ── */}
      <video
        autoPlay loop muted playsInline
        className="fixed inset-0 z-0 h-full w-full object-cover scale-105"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
      />
      <div className="fixed inset-0 z-[1] bg-black/40 dark:bg-background/70" />
      <div className="fixed inset-0 z-[2] bg-gradient-to-b from-black/60 via-black/20 to-background/90 dark:to-black/90" />

      {/* Animated mesh orbs */}
      <div className="pointer-events-none fixed inset-0 z-[3] overflow-hidden">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 left-1/4 h-[600px] w-[600px] rounded-full opacity-30 blur-[150px]"
          style={{ background: `radial-gradient(circle, ${cfg.color}40, transparent 70%)` }}
        />
        <motion.div
          animate={{ x: [0, -30, 20, 0], y: [0, 30, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/4 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.4), transparent 70%)" }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-5 pb-20 pt-8 sm:px-8 md:px-10">

        {/* ══════════ HERO / SEARCH ══════════ */}
        <motion.div initial="initial" animate="animate" variants={stagger}>
          <motion.div variants={fadeUp} className="text-center">
            <div className="mx-auto flex items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-foreground/60 backdrop-blur-md">
                <Activity className="h-3 w-3" />
                AI-анализатор
              </span>
              {aiHealth.status === "ready" && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.2em] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready
                </span>
              )}
            </div>

            <h1 className="mx-auto mt-8 max-w-3xl text-5xl font-bold leading-[1.1] tracking-[-0.04em] sm:text-6xl md:text-7xl">
              Проверьте домен
              <br />
              <span className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                за секунды.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/50 sm:text-lg">
              AI + ruleset + фиды фишинга + сетевые сигналы.
              <br className="hidden sm:block" />
              Мгновенный анализ вместо слепого доверия.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.form
            variants={fadeUp}
            className="mx-auto mt-10 max-w-2xl"
            onSubmit={(e) => { e.preventDefault(); runAnalysis(draft); }}
          >
            <div className="relative flex items-center gap-2 rounded-[2.5rem] border border-foreground/10 bg-foreground/[0.03] p-2.5 backdrop-blur-3xl transition-all focus-within:border-foreground/20 focus-within:bg-foreground/[0.06] focus-within:shadow-[0_0_50px_rgba(255,255,255,0.07)] hover:bg-foreground/[0.05]">
              <div className="flex flex-1 items-center gap-3 px-4 z-20">
                <Globe className="h-6 w-6 shrink-0 text-foreground/40 transition-colors group-focus-within:text-foreground/70" />
                <input
                  ref={inputRef}
                  aria-label="Введите домен или ссылку для проверки"
                  className="w-full bg-transparent py-3.5 text-xl font-medium text-foreground outline-none placeholder:text-foreground/30 placeholder:font-normal transition-shadow focus:drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                  id="domain-input"
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Домен или ссылка..."
                  value={draft}
                  autoComplete="off"
                />
              </div>
              
              <Button
                className="h-14 shrink-0 rounded-[1.5rem] bg-foreground text-black px-8 text-base font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 hover:bg-foreground hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95 disabled:hover:scale-100 disabled:shadow-none"
                type="submit"
                disabled={isAiEnriching}
                aria-label="Запустить анализ домена"
              >
                {isAiEnriching ? "Анализируем..." : "Анализ"}
                {isAiEnriching ? (
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                ) : (
                  <ArrowRight className="ml-2 h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Status line */}
            <div className="mt-3 flex items-center justify-between text-xs text-foreground/40">
              <label className="flex cursor-pointer items-center gap-2 transition-colors hover:text-foreground/70">
                <input
                  type="checkbox"
                  checked={telemetryConsent}
                  onChange={(e) => {
                    setTelemetryConsent(e.target.checked);
                    window.localStorage.setItem("domain-traffic-light:telemetry", String(e.target.checked));
                  }}
                  className="rounded border-foreground/20 bg-foreground/5 accent-emerald-500"
                />
                Анонимно сохранять результат в общую базу
              </label>

              <div className="flex items-center gap-3">
                {isCachedResult && (
                  <span className="inline-flex items-center gap-1.5 text-amber-300/80">
                    <Zap className="h-3 w-3" />
                    Ответ загружен из общей базы
                  </span>
                )}
                {isAiEnriching && (
                  <span className="inline-flex items-center gap-1.5 text-foreground/60">
                    <Zap className="h-3 w-3 animate-pulse" />
                    AI обрабатывает…
                  </span>
                )}
              </div>
            </div>

            {/* Local History Chips */}
            {history.length > 0 && (
              <div className="mx-auto mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
                {history.map((item) => {
                  const pColor = item.verdict === "high" ? "bg-rose-400" : item.verdict === "medium" ? "bg-amber-400" : "bg-emerald-400";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setDraft(item.domain);
                        runAnalysis(item.domain);
                      }}
                      className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3.5 py-1.5 text-xs font-medium transition-all duration-300 hover:bg-foreground/10 hover:border-foreground/20 hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <span className={`h-2 w-2 rounded-full ${pColor} shadow-[0_0_8px_currentColor]`} />
                      <span className="text-foreground/70">{item.domain}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.form>
        </motion.div>

        {/* ══════════ RESULTS BENTO GRID ══════════ */}
        <motion.div
          className="mt-14 grid gap-4 lg:grid-cols-12"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          {/* ── Verdict card (main, large) ── */}
          <VerdictCard
            result={result}
            cfg={cfg}
            aiExplanation={aiExplanation}
            isCachedResult={isCachedResult}
            aiShiftLabel={aiShiftLabel}
            isModerated={isModerated}
          />

          {/* ── Side column ── */}
          <SideColumn
            result={result}
            telemetryConsent={telemetryConsent}
            setShowReportModal={setShowReportModal}
            primaryAction={primaryAction}
            quickActions={quickActions}
            actionIcons={actionIcons}
          />

          {/* ── Signals row ── */}
          <SignalsRow
            result={result}
            leadReason={leadReason}
            visibleReasons={visibleReasons}
            toneStyles={toneStyles}
          />

          {/* ── AI insights ── */}
          <AiInsights
            aiExplanation={aiExplanation}
            isAiEnriching={isAiEnriching}
            toneStyles={toneStyles}
          />

          {/* ── CyberLaw (КиберПраво) section ── */}
          <CyberLawSection
            verdict={result.verdict}
            routeHref={routeHref}
          />

          {/* ── Reference sections ── */}
          <ReferenceSections
            ruleReference={ruleReference}
            officialDomains={officialDomains}
          />
        </motion.div>
      </div>

      {/* ══════════ REPORT MODAL ══════════ */}
      {result && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          host={result.host}
          verdict={result.verdict}
          score={result.score}
        />
      )}
    </section>
  );
}
