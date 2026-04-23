import { useState } from "react";
import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { ShieldCheck, Sparkles, Check, Copy } from "lucide-react";
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
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = (label: string, value: string) => {
    if (value === "—") return;
    navigator.clipboard.writeText(value);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
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
          ].map((item) => {
            const isCopied = copiedLabel === item.label;
            const canCopy = item.value !== "—";

            return (
              <button
                key={item.label}
                onClick={() => handleCopy(item.label, item.value)}
                disabled={!canCopy}
                aria-label={canCopy ? `Скопировать ${item.label.toLowerCase()} (${item.value})` : `${item.label} отсутствует`}
                title={canCopy ? "Скопировать" : ""}
                className={`group flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs shadow-sm backdrop-blur-md transition-all ${
                  canCopy
                    ? "border-foreground/10 bg-foreground/[0.04] text-foreground/60 hover:bg-foreground/[0.08] hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 active:scale-95 cursor-pointer"
                    : "border-foreground/5 bg-foreground/[0.02] text-foreground/40 cursor-default"
                }`}
              >
                <span>{item.label}: <span className={`font-medium tracking-wide ${canCopy ? "text-foreground/90" : "text-foreground/50"}`}>{item.value}</span></span>
                {canCopy && (
                  <span className="flex h-3.5 w-3.5 items-center justify-center">
                    {isCopied ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </GlassCard>
  );
}
