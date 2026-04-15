import { ArrowRight, ExternalLink, Scale } from "lucide-react";
import { GlassCard } from "./GlassCard";
import type { SitePath } from "@/lib/site-router";

interface CyberLawSectionProps {
  verdict: "low" | "medium" | "high";
  routeHref: (path: SitePath) => string;
}

export function CyberLawSection({
  verdict,
  routeHref
}: CyberLawSectionProps) {
  if (verdict !== "high" && verdict !== "medium") return null;

  return (
    <GlassCard className="lg:col-span-12 p-6 border-violet-500/10 bg-violet-500/[0.02]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-violet-400">
        <Scale className="h-3.5 w-3.5" />
        #КиберПраво
      </div>
      <div className="mt-4 flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <h3 className="text-base font-medium text-foreground/90">Закон о защите персональных данных</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/60">
            По Закону Республики Беларусь вы — субъект персональных данных. Фишинговые ресурсы нарушают этот закон, собирая ваши данные (логины, пароли, платежную информацию) неправомерно, без вашего явного согласия.
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-violet-500/10 bg-violet-500/5 p-4">
          <p className="text-sm text-foreground/70 mb-3">
            Вы имеете право на защиту своих данных и правовую помощь.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="https://cpd.by" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-400 transition-colors hover:bg-violet-500/20">
              НЦЗПД (cpd.by)
              <ExternalLink className="h-3 w-3" />
            </a>
            <a href={routeHref("/safety")} className="inline-flex items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/5 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/10">
              О безопасности
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
