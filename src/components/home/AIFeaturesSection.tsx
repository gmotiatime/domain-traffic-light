import { Shield, Cpu, Zap } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";

export function AIFeaturesSection() {
  return (
    <section className="relative w-full bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.26em] text-foreground/40">Подкапотная магия</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Три проверки <span className="text-foreground/50">одновременно</span>
          </h2>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <GlassCard delay={0.1} className="overflow-hidden p-0" glow="radial-gradient(circle at 100% 100%, rgba(34,197,94,0.08), transparent 70%)">
            <div className="p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
                <Shield className="h-8 w-8 text-green-400" strokeWidth={1.5} />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Фиды фишинга</h3>
              <p className="mt-3 text-base leading-relaxed text-foreground/50">
                Сверка с базами OpenPhish и URLAbuse. Если домен уже в списках фишинга, вы увидите это сразу.
              </p>
            </div>
            <div className="px-8 pb-8 pt-0">
              <img
                alt="Защита от фишинга"
                className="h-48 w-full object-contain mix-blend-screen"
                src="/shield-protection.svg?v=4"
              />
            </div>
          </GlassCard>

          <GlassCard delay={0.2} className="overflow-hidden p-0" glow="radial-gradient(circle at 100% 100%, rgba(59,130,246,0.08), transparent 70%)">
            <div className="p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
                <Cpu className="h-8 w-8 text-blue-400" strokeWidth={1.5} />
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Локальный Ruleset</h3>
              <p className="mt-3 text-base leading-relaxed text-foreground/50">
                Разбор структуры URL, проверка на опечатки брендов и подозрительные зоны. Работает мгновенно.
              </p>
            </div>
            <div className="px-8 pb-8 pt-0">
              <img
                alt="Сканирование базы данных"
                className="h-48 w-full object-contain mix-blend-screen"
                src="/database-scan.svg?v=4"
              />
            </div>
          </GlassCard>

          <GlassCard delay={0.3} containerClassName="md:col-span-2 lg:col-span-1" className="overflow-hidden p-0" glow="radial-gradient(circle at 100% 100%, rgba(139,92,246,0.08), transparent 70%)">
            <div className="p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
                <Zap className="h-8 w-8 text-violet-400" strokeWidth={1.5} />
              </div>
              <h3 className="mt-6 text-2xl font-semibold text-foreground">AI-слой</h3>
              <p className="mt-3 text-base leading-relaxed text-violet-100/60">
                AI собирает результаты всех проверок и объясняет, что именно не так с доменом.
              </p>
            </div>
            <div className="px-8 pb-8 pt-0">
              <img
                alt="AI анализ"
                className="h-48 w-full object-contain mix-blend-screen"
                src="/ai-analysis.svg?v=4"
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
