import { Flag, ShieldCheck, ShieldQuestion } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { AnalysisResult } from "@/lib/domain-analyzer";

interface SideColumnProps {
  result: AnalysisResult;
  telemetryConsent: boolean;
  setShowReportModal: (val: boolean) => void;
  primaryAction: (verdict: "low" | "medium" | "high") => string;
  quickActions: string[];
  actionIcons: any[]; // we'll type this properly
}

export function SideColumn({
  result,
  telemetryConsent,
  setShowReportModal,
  primaryAction,
  quickActions,
  actionIcons
}: SideColumnProps) {
  return (
    <div className="flex flex-col gap-4 lg:col-span-5">
      {/* Primary action */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-foreground/40">
            <ShieldCheck className="h-3.5 w-3.5" />
            Действие
          </div>

          {result.host !== "—" && (
            <div className="relative group">
              <button
                onClick={() => telemetryConsent ? setShowReportModal(true) : null}
                disabled={!telemetryConsent}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  telemetryConsent
                    ? "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                    : "border-foreground/5 bg-foreground/[0.01] text-foreground/30 cursor-not-allowed"
                }`}
              >
                <Flag className="h-3 w-3" />
                Неверный вердикт?
              </button>
              {!telemetryConsent && (
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200 shadow-lg backdrop-blur-sm z-10">
                  Включите "Анонимно сохранять результат в общую базу" (в настройках) и повторите попытку
                </div>
              )}
            </div>
          )}
        </div>
        <p className="mt-4 text-xl font-semibold leading-snug tracking-tight text-foreground sm:text-2xl">
          {primaryAction(result.verdict)}
        </p>
      </GlassCard>

      {/* Quick actions */}
      <GlassCard className="flex-1 p-5">
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
  );
}
