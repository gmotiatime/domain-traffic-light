import { useEffect, useRef } from "react";
import { Cat, ShieldAlert, Sparkles } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface AiInsightsProps {
  aiExplanation: any;
  isAiEnriching: boolean;
  streamingText?: string;
  toneStyles: Record<string, { pill: string; label: string }>;
}

export function AiInsights({
  aiExplanation,
  isAiEnriching,
  streamingText,
  toneStyles
}: AiInsightsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [streamingText]);

  return (
    <GlassCard className="lg:col-span-4 p-6">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/40">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        AI-слой
      </div>

      {aiExplanation ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-foreground/60 whitespace-pre-wrap">{aiExplanation.summary}</p>
          {aiExplanation.reasons && aiExplanation.reasons.length > 0 && (
            <div className="mt-4 space-y-3">
              {aiExplanation.reasons.map((reason: any, i: number) => {
                const isCritical = reason.tone === "critical";
                return (
                  <div key={`ai-${i}`} className={`rounded-xl border px-4 py-3 ${isCritical ? "border-rose-500/20 bg-rose-500/5" : "border-foreground/[0.06] bg-foreground/[0.02]"}`}>
                    <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2">
                         {isCritical && <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />}
                         <p className={`text-sm font-medium ${isCritical ? "text-rose-400" : "text-foreground/80"}`}>{reason.title}</p>
                       </div>
                       <span className={`rounded-full border px-2 py-0.5 text-[10px] ${toneStyles[reason.tone]?.pill || toneStyles.warning.pill}`}>
                         {toneStyles[reason.tone]?.label || "Сигнал"}
                       </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/60 whitespace-pre-wrap">{reason.detail}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : isAiEnriching ? (
        streamingText ? (
          <div className="mt-4">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-violet-400/70">AI рассуждает</span>
              </div>
              <div 
                ref={scrollContainerRef}
                className="max-h-64 overflow-y-auto pr-2 custom-scrollbar"
              >
                <p className="text-sm leading-relaxed text-foreground/60 whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-[2px] h-4 bg-violet-400 ml-0.5 align-text-bottom animate-pulse" />
                </p>
              </div>
            </div>
          </div>
        ) : (
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
        )
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04] transition-colors hover:bg-foreground/[0.08]">
            <Cat className="h-5 w-5 text-foreground/20" />
          </div>
          <p className="mt-3 text-sm text-foreground/30">
            Нейрокот начеку. Уточненный вердикт появится автоматически.
          </p>
        </div>
      )}
    </GlassCard>
  );
}
