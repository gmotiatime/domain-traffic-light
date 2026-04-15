import { Shield, Search, TrendingUp, Database } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export type CacheStats = {
  size?: number;
  total?: number;
  active?: number;
  expired?: number;
  verdicts?: Record<string, number>;
  storage?: string;
  dbSize?: number;
  oldestRecord?: string | null;
  newestRecord?: string | null;
};

export function StatsSection({ stats }: { stats: CacheStats }) {
  return (
    <section className="relative w-full bg-background py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.26em] text-foreground/40">Статистика в реальном времени</p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Проверено доменов: <AnimatedCounter end={stats.total || stats.size || 0} className="inline-block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent" />
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <GlassCard delay={0.1} className="p-6" glow="radial-gradient(circle at 100% 100%, rgba(74,222,128,0.06), transparent 70%)">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
              <Shield className="h-8 w-8 text-green-400" strokeWidth={1.5} />
            </div>
            <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">Безопасные</div>
            <AnimatedCounter end={stats.verdicts?.low || 0} className="mt-2 text-3xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]" duration={1500} />
            <p className="mt-2 text-sm text-foreground/40">Домены с низким риском</p>
          </GlassCard>

          <GlassCard delay={0.2} className="p-6" glow="radial-gradient(circle at 100% 100%, rgba(250,204,21,0.06), transparent 70%)">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
              <Search className="h-8 w-8 text-yellow-400" strokeWidth={1.5} />
            </div>
            <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">Подозрительные</div>
            <AnimatedCounter end={stats.verdicts?.medium || 0} className="mt-2 text-3xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]" duration={1500} />
            <p className="mt-2 text-sm text-foreground/40">Требуют внимания</p>
          </GlassCard>

          <GlassCard delay={0.3} className="p-6" glow="radial-gradient(circle at 100% 100%, rgba(248,113,113,0.06), transparent 70%)">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
              <TrendingUp className="h-8 w-8 text-red-400" strokeWidth={1.5} />
            </div>
            <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">Опасные</div>
            <AnimatedCounter end={stats.verdicts?.high || 0} className="mt-2 text-3xl font-bold text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.3)]" duration={1500} />
            <p className="mt-2 text-sm text-foreground/40">Высокий риск фишинга</p>
          </GlassCard>

          <GlassCard delay={0.4} className="p-6" glow="radial-gradient(circle at 100% 100%, rgba(167,139,250,0.06), transparent 70%)">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-transparent">
              <Database className="h-8 w-8 text-violet-400" strokeWidth={1.5} />
            </div>
            <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">База данных</div>
            <div className="mt-2 text-3xl font-bold text-violet-400">
              {stats.dbSize ? (
                <>
                  <AnimatedCounter end={Math.floor(stats.dbSize / 1024)} className="inline-block" duration={1500} />
                  <span className="text-lg text-foreground/40 ml-1">KB</span>
                </>
              ) : '—'}
            </div>
            <p className="mt-2 text-sm text-foreground/40">Размер кэша</p>
          </GlassCard>
        </div>

        {(stats.oldestRecord || stats.newestRecord) && (
          <div className="mt-8 text-center">
            <p className="text-sm text-foreground/40">
              {stats.oldestRecord && `Первая проверка: ${new Date(stats.oldestRecord).toLocaleDateString('ru-RU')}`}
              {stats.oldestRecord && stats.newestRecord && ' • '}
              {stats.newestRecord && `Последняя: ${new Date(stats.newestRecord).toLocaleDateString('ru-RU')}`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
