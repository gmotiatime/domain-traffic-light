import { ShieldAlert, TriangleAlert } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { AnalysisResult, AnalyzerReason } from "@/lib/domain-analyzer";

interface SignalsRowProps {
  result: AnalysisResult;
  leadReason: AnalyzerReason | null;
  visibleReasons: AnalyzerReason[];
  toneStyles: Record<string, { pill: string; label: string }>;
}

export function SignalsRow({
  result,
  leadReason,
  visibleReasons,
  toneStyles
}: SignalsRowProps) {
  return (
    <GlassCard className="lg:col-span-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-foreground/40" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/40">
            Сигналы · {result.reasons.length}
          </p>
        </div>
      </div>

      {leadReason && (() => {
        const isCritical = leadReason.tone === "critical";
        return (
          <div className={`mt-5 rounded-2xl border p-5 ${isCritical ? "border-rose-500/20 bg-rose-500/5" : "border-foreground/[0.06] bg-foreground/[0.02]"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`text-[10px] uppercase tracking-[0.2em] ${isCritical ? "text-rose-400/80" : "text-foreground/30"}`}>Главный сигнал</span>
                <div className="mt-2 flex items-center gap-2">
                  {isCritical && <ShieldAlert className="h-4 w-4 text-rose-400" />}
                  <p className={`text-sm font-medium ${isCritical ? "text-rose-400" : "text-foreground/90"}`}>{leadReason.title}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${toneStyles[leadReason.tone].pill}`}>
                    {toneStyles[leadReason.tone].label}
                  </span>
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${isCritical ? "text-rose-400/80" : "text-foreground/50"}`}>{leadReason.detail}</p>
              </div>
              <span className="shrink-0 text-sm font-medium text-foreground/70">
                {leadReason.scoreDelta > 0 ? `+${leadReason.scoreDelta}` : leadReason.scoreDelta}
              </span>
            </div>
          </div>
        );
      })()}

      {visibleReasons.length > 0 && (
        <div className="mt-3 divide-y divide-white/[0.04] rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] overflow-hidden">
          {visibleReasons.map((reason, i) => {
            const isCritical = reason.tone === "critical";
            return (
              <div key={`${reason.title}-${i}`} className={`flex items-start justify-between gap-4 px-5 py-4 ${isCritical ? "bg-rose-500/5" : ""}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isCritical && <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />}
                    <p className={`text-sm ${isCritical ? "font-medium text-rose-400" : "text-foreground/80"}`}>{reason.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${toneStyles[reason.tone].pill}`}>
                      {toneStyles[reason.tone].label}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm leading-relaxed ${isCritical ? "text-foreground/60" : "text-foreground/40"}`}>{reason.detail}</p>
                </div>
                <span className="shrink-0 text-sm text-foreground/60">
                  {reason.scoreDelta > 0 ? `+${reason.scoreDelta}` : reason.scoreDelta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
