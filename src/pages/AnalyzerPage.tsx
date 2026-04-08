import { useEffect, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
  TriangleAlert,
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
import BorderGlow from "@/components/BorderGlow";

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

/* ─── glass card wrapper ─── */
function GlassCard({
  children,
  className = "",
  containerClassName = "",
  delay = 0,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  delay?: number;
  glow?: string;
}) {
  return (
    <motion.div
      className={`relative transition-all duration-300 hover:shadow-[0_0_60px_rgba(255,255,255,0.03)] hover:border-foreground/[0.1] ${containerClassName}`}
      variants={fadeUp}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.005 }}
    >
      <BorderGlow
        className={`w-full h-full rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] backdrop-blur-2xl transition-colors hover:bg-foreground/[0.04] flex flex-col ${className}`}
        borderRadius={32}
        glowRadius={30}
        fillOpacity={0}
        backgroundColor="transparent"
      >
        {/* top edge highlight */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100 z-10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 hover:opacity-100 z-10" />
        <div className="flex-1 flex flex-col h-full" style={glow ? { background: glow } : undefined}>
          {children}
        </div>
      </BorderGlow>
    </motion.div>
  );
}

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
    "Проверьте, что домен совпадает с ожидаемым сайтом.",
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
        const response = await fetch(getApiUrl("/api/health"));
        if (!response.ok) throw new Error("fail");
        const payload = await response.json();
        if (cancelled) return;
        if (payload?.aiConfigured) {
          setAiHealth({ status: "ready", note: "AI доступен." });
          return;
        }
        setAiHealth({ status: "missing-key", note: payload?.hasLocalEnvFile ? "Нет рабочего AI-ключа." : "AI не настроен." });
      } catch {
        if (cancelled) return;
        setAiHealth({ status: "offline", note: "AI backend недоступен." });
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
                  className="w-full bg-transparent py-3.5 text-xl font-medium text-foreground outline-none placeholder:text-foreground/30 placeholder:font-normal transition-shadow focus:drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                  id="domain-input"
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Домен или ссылка..."
                  value={draft}
                  autoComplete="off"
                />
              </div>
              
              <Button
                className="h-14 shrink-0 rounded-[1.5rem] bg-foreground text-black px-8 text-base font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 hover:bg-foreground hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95"
                type="submit"
              >
                Анализ
                <ArrowRight className="ml-2 h-5 w-5" />
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
          className="mt-14 grid gap-4 lg:grid-cols-12 items-stretch"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          {/* ── Verdict card (main, large) ── */}
          <GlassCard containerClassName="lg:col-span-7 flex flex-col h-full" className="p-8 flex-1 h-full" glow={cfg.bgGlow}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] ${cfg.pillBg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                Вердикт
              </span>
              <span className="rounded-full border border-foreground/8 bg-foreground/5 px-3 py-1 text-[11px] text-foreground/50">
                {result.score}/100
              </span>
              {aiExplanation && (
                <>
                  <span className={`rounded-full border px-3 py-1 text-[11px] ${
                    isCachedResult 
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-400" 
                      : "border-violet-500/20 bg-violet-500/10 text-violet-400"
                  }`}>
                    <Sparkles className="mr-1 inline h-3 w-3" />
                    {aiShiftLabel}
                  </span>
                  <span className="rounded-full border border-foreground/8 bg-foreground/5 px-3 py-1 text-[11px] text-foreground/50">
                    {aiExplanation.model}
                  </span>
                </>
              )}
            </div>

            <h2 
              className={`mt-8 text-6xl font-bold tracking-[-0.04em] sm:text-7xl md:text-8xl drop-shadow-[0_0_25px_currentColor] transition-colors duration-500 ${cfg.textClass}`}
              style={{ filter: "brightness(1.1)" }}
            >
              {result.verdictLabel}
            </h2>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/60 sm:text-lg">
              {result.summary}
            </p>

            {isModerated && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Изменено администратором
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-8">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-foreground/30">
                <span>Безопасно</span>
                <span>Опасно</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-foreground/5">
                <motion.div
                  className={`h-full rounded-full ${cfg.progressClass}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(result.score, 4)}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>

            {/* Domain breakdown pills */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Домен", value: result.host },
                  { label: "Ядро", value: result.breakdown.registrableDomain },
                  { label: "Зона", value: result.breakdown.tld },
                  { label: "Поддомен", value: result.breakdown.subdomain || "—" },
                ].map((item) => (
                  <span key={item.label} className="rounded-full border border-foreground/10 bg-foreground/[0.04] px-4 py-2 text-xs text-foreground/60 shadow-sm backdrop-blur-md">
                    {item.label}: <span className="text-foreground/90 font-medium tracking-wide">{item.value}</span>
                  </span>
                ))}
              </div>
              
              {result.host !== "—" && (
                <div className="relative group">
                  <button
                    onClick={() => telemetryConsent ? setShowReportModal(true) : null}
                    disabled={!telemetryConsent}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      telemetryConsent
                        ? "border-foreground/10 bg-foreground/[0.03] text-foreground/60 hover:bg-foreground/[0.06] hover:text-foreground/80"
                        : "border-foreground/5 bg-foreground/[0.01] text-foreground/30 cursor-not-allowed"
                    }`}
                  >
                    <Flag className="h-3 w-3" />
                    Пожаловаться
                  </button>
                  {!telemetryConsent && (
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 shadow-lg backdrop-blur-sm">
                      Включите "Анонимно сохранять результат в общую базу" и повторите попытку
                    </div>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          {/* ── Side column ── */}
          <div className="flex flex-col gap-4 lg:col-span-5 h-full">
            {/* Primary action */}
            <GlassCard containerClassName="flex flex-col" className="p-6">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/40">
                <ShieldCheck className="h-3.5 w-3.5" />
                Действие
              </div>
              <p className="mt-4 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
                {primaryAction(result.verdict)}
              </p>
            </GlassCard>

            {/* Quick actions */}
            <GlassCard containerClassName="flex-1 flex flex-col h-full" className="p-5 flex-1 h-full">
              <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/40">Рекомендации</p>
              <div className="mt-4 space-y-1">
                {quickActions.map((action, i) => {
                  const Icon = actionIcons[i] ?? ShieldQuestion;
                  return (
                    <div key={`${action}-${i}`} className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-foreground/[0.03]">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] text-foreground/60">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-sm leading-relaxed text-foreground/60">{action}</p>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          {/* ── Signals row ── */}
          <GlassCard containerClassName="lg:col-span-8 flex flex-col h-full" className="p-6 flex-1 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 text-foreground/40" />
                <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/40">
                  Сигналы · {result.reasons.length}
                </p>
              </div>
            </div>

            {leadReason && (
              <div className="mt-5 rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-foreground/30">Главный сигнал</span>
                    <div className="mt-2 flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground/90">{leadReason.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${toneStyles[leadReason.tone].pill}`}>
                        {toneStyles[leadReason.tone].label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/50">{leadReason.detail}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-foreground/70">
                    {leadReason.scoreDelta > 0 ? `+${leadReason.scoreDelta}` : leadReason.scoreDelta}
                  </span>
                </div>
              </div>
            )}

            {visibleReasons.length > 0 && (
              <div className="mt-3 divide-y divide-white/[0.04] rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] overflow-hidden">
                {visibleReasons.map((reason, i) => (
                  <div key={`${reason.title}-${i}`} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-foreground/80">{reason.title}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${toneStyles[reason.tone].pill}`}>
                          {toneStyles[reason.tone].label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/40">{reason.detail}</p>
                    </div>
                    <span className="shrink-0 text-sm text-foreground/60">
                      {reason.scoreDelta > 0 ? `+${reason.scoreDelta}` : reason.scoreDelta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* ── AI insights ── */}
          <GlassCard containerClassName="lg:col-span-4 flex flex-col h-full" className="p-6 flex-1 h-full">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/40">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
              AI-слой
            </div>

            {aiExplanation ? (
              <div className="mt-4">
                <p className="text-sm leading-relaxed text-foreground/60">{aiExplanation.summary}</p>
                {aiSignals.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {aiSignals.map((reason, i) => (
                      <div key={`ai-${i}`} className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                           <p className="text-sm text-foreground/70">{aiReasonTitle(reason, i)}</p>
                           <span className="text-xs text-foreground/40">
                             {reason.scoreDelta > 0 ? `+${reason.scoreDelta}` : reason.scoreDelta}
                           </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-foreground/40">{reason.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isAiEnriching ? (
              <div className="mt-5 space-y-3">
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-3 w-4/6 animate-pulse rounded-full bg-foreground/10" />
                <div className="h-3 w-3/4 animate-pulse rounded-full bg-foreground/10" />
                <div className="mt-6 space-y-3">
                  {[1, 2].map((i) => (
                    <div key={`skel-${i}`} className="h-[4.5rem] w-full animate-pulse rounded-xl border border-foreground/5 bg-foreground/[0.03]" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04] transition-colors hover:bg-foreground/[0.08]">
                  <Sparkles className="h-5 w-5 text-foreground/20" />
                </div>
                <p className="mt-3 text-sm text-foreground/30">
                  AI уточнит результат автоматически
                </p>
              </div>
            )}
          </GlassCard>

          {/* ── Reference sections ── */}
          <GlassCard containerClassName="lg:col-span-6" className="p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground/70">
                <span>Что учитывает модель</span>
                <ChevronDown className="h-4 w-4 text-foreground/30 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-3">
                {ruleReference.map((rule, i) => (
                  <div key={`${rule.title}-${i}`} className="rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] px-4 py-3">
                    <p className="text-sm text-foreground/70">{rule.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/40">{rule.detail}</p>
                  </div>
                ))}
              </div>
            </details>
          </GlassCard>

          <GlassCard containerClassName="lg:col-span-6" className="p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground/70">
                <span>Справочные домены</span>
                <ChevronDown className="h-4 w-4 text-foreground/30 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-3">
                {officialDomains.map((item, i) => (
                  <div key={`${item.domain}-${i}`} className="rounded-xl border border-foreground/[0.04] bg-foreground/[0.02] px-4 py-3">
                    <p className="text-sm text-foreground/70">{item.domain}</p>
                    <p className="mt-1 text-xs leading-relaxed text-foreground/40">{item.description}</p>
                  </div>
                ))}
              </div>
            </details>
          </GlassCard>
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
