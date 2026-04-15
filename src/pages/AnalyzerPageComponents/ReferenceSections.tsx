import { ChevronDown } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface ReferenceSectionsProps {
  ruleReference: readonly { readonly title: string; readonly detail: string }[];
  officialDomains: readonly { readonly domain: string; readonly description: string }[];
}

export function ReferenceSections({
  ruleReference,
  officialDomains
}: ReferenceSectionsProps) {
  return (
    <>
      <GlassCard className="lg:col-span-6 p-6">
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

      <GlassCard className="lg:col-span-6 p-6">
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
    </>
  );
}
