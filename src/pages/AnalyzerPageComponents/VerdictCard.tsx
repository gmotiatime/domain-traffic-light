import { motion } from "framer-motion";
import { useState } from "react";
import { GlassCard } from "./GlassCard";
import { ShieldCheck, Sparkles, Copy, CheckCircle2 } from "lucide-react";
import type { AnalysisResult, AiExplanation } from "@/lib/domain-analyzer";

interface VerdictCardProps {
  result: AnalysisResult;
  cfg: any; // We'll type this properly later
  aiExplanation: AiExplanation | null;
  isCachedResult: boolean;
  aiShiftLabel: string | boolean;
  isModerated: boolean;
// Or import it if it's exported
}

export function VerdictCard({
  result,
  cfg,
  aiExplanation,
  isCachedResult,
  aiShiftLabel,
  isModerated
}: VerdictCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyReport = async () => {
    const aiText = aiExplanation ? `(${aiExplanation.model}) ` : "";
    const text = `🚦 Доменный светофор: ${result.host}\n\nВердикт: ${result.verdictLabel}\nОценка безопасности: ${result.score}/100\n\n${aiText}${result.summary}\n\nАнализ: https://gmotia.tech/#/analyzer`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <GlassCard className="lg:col-span-7 p-8" glow={cfg.bgGlow}>
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

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-8">
        <div>
          <h2
            className={`text-6xl font-bold tracking-[-0.04em] sm:text-7xl md:text-8xl drop-shadow-[0_0_25px_currentColor] transition-colors duration-500 ${cfg.textClass}`}
            style={{ filter: "brightness(1.1)" }}
          >
            {result.verdictLabel}
          </h2>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/60 sm:text-lg">
            {result.summary}
          </p>
        </div>
        <button
          onClick={handleCopyReport}
          title="Скопировать отчет"
          className="shrink-0 mb-1 inline-flex items-center justify-center gap-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 active:scale-95 text-foreground/80 self-start sm:self-auto"
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-400">Скопировано</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Поделиться</span>
            </>
          )}
        </button>
      </div>

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

      </div>
    </GlassCard>
  );
}
