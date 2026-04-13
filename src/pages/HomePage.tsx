import { useState, useEffect } from "react";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Search, Zap, Shield, Cpu, Database, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { HeroTitle } from "@/components/HeroTitle";
import { HeroSearchForm } from "@/components/HeroSearchForm";
import {
  behaviorSteps,
  heroVideo,
  homeManifest,
  homeProof,
} from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

import BorderGlow from "@/components/BorderGlow";

/* ─── animation presets ─── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] }, // Stronger ease-out
};

const stagger = {
  whileInView: { transition: { staggerChildren: 0.06 } }, // Faster stagger
  viewport: { once: true },
};

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
      className={`relative transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 ${containerClassName}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }} // Start from scale 0.95, not 0
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      viewport={{ once: true, amount: 0.1 }}
    >
      <BorderGlow
        className={`w-full h-full rounded-[2rem] border-white/5 shadow-2xl flex flex-col ${className}`}
        borderRadius={32}
        glowRadius={30}
        fillOpacity={0}
        backgroundColor="#000000"
      >
        <div style={glow ? { background: glow, height: '100%' } : { height: '100%' }}>
          {children}
        </div>
      </BorderGlow>
    </motion.div>
  );
}

type CacheStats = {
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

import { StickersLayer, StickerData } from "@/components/StickersLayer";

const homeStickers: StickerData[] = [
  { src: "/sticker/1-61-256b.png", side: "left", top: "18%", rotation: -12 },
  { src: "/sticker/1-67-256b.png", side: "right", top: "35%", rotation: 10 },
  { src: "/sticker/1-86-256b.png", side: "left", top: "55%", rotation: 8 },
  { src: "/sticker/1-71-256b.png", side: "right", top: "72%", rotation: -10 },
  { src: "/sticker/1-54-256b.png", side: "left", top: "85%", rotation: 15 },
];

export function HomePage() {
  const [stats, setStats] = useState<CacheStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch("/api/cache-stats");
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    }
    loadStats();
  }, []);

  const { scrollY } = useScroll();
  const orb1Y = useTransform(scrollY, value => value * 0.3);
  const orb2Y = useTransform(scrollY, value => value * 0.2);

  return (
    <div className="relative bg-background text-foreground selection:bg-foreground/20">
      <StickersLayer items={homeStickers} />
      {/* ══════════ HERO SECTION ══════════ */}
      <section className="relative isolate min-h-[90svh] overflow-hidden">
        {/* Background Video & Overlays */}
        <video
          autoPlay
          className="absolute inset-0 z-0 h-full w-full object-cover scale-105"
          loop
          muted
          playsInline
          src={heroVideo}
        />
        <div className="absolute inset-0 z-[1] bg-black/40 dark:bg-background/70" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/20 to-background dark:to-black" />

        {/* Animated Mesh Orbs (Hero Only) */}
        <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
          <motion.div style={{ y: orb1Y }} className="absolute -top-[10%] left-[10%] h-[700px] w-[700px]">
            <motion.div
              animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0] }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-full rounded-full bg-blue-500/10 opacity-40 blur-[150px]"
            />
          </motion.div>
          <motion.div style={{ y: orb2Y }} className="absolute bottom-0 right-[5%] h-[600px] w-[600px]">
            <motion.div
              animate={{ x: [0, -40, 30, 0], y: [0, 50, -30, 0] }}
              transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-full rounded-full bg-violet-500/10 opacity-30 blur-[120px]"
            />
          </motion.div>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[90svh] w-full max-w-7xl flex-col items-center justify-center px-4 pb-20 pt-32 text-center sm:px-6">
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="whileInView"
            className="max-w-5xl"
          >
            <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-[0.26em] text-foreground/50 sm:text-sm">
              Мгновенный AI Анализатор Доменов
            </motion.p>
            
            <motion.h1
              variants={fadeUp}
              className="mt-6 text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[84px]"
            >
              <HeroTitle />
            </motion.h1>
            
            <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/60 sm:text-lg">
              Проверяйте ссылки до ввода паролей. Сервис показывает уровень риска и объясняет, почему домен подозрительный.
            </motion.p>

            <motion.div variants={fadeUp} className="mx-auto mt-12 w-full max-w-3xl">
              <HeroSearchForm />

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
                  {homeManifest.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 text-sm text-foreground/50"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                      {item}
                    </span>
                  ))}
                </div>

                <Button asChild className="h-10 px-0 text-sm text-foreground/50 hover:text-foreground hover:bg-transparent" variant="ghost">
                  <a href={routeHref("/method")}>Как работает проверка</a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════ AI FEATURES (NEW SECTION) ══════════ */}
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

      {/* ══════════ BEHAVIOR LOGIC ══════════ */}
      <section className="relative w-full bg-[#000000] py-16 sm:py-20 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 relative z-10">
          <GlassCard className="p-8 sm:p-12 md:p-14">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Логика сервиса</p>
              <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Три шага: <span className="text-foreground/50">остановка, проверка, решение</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {behaviorSteps.map((item, i) => (
                <div key={item.step} className="flex flex-col">
                  <BorderGlow
                    className="rounded-[2rem] h-full w-full border-white/5 shadow-2xl p-0 overflow-hidden"
                    borderRadius={32}
                    glowRadius={30}
                    fillOpacity={0}
                    backgroundColor="#000000"
                  >
                    <div className="relative flex flex-col justify-between h-full w-full">
                      {/* Big glowing background number */}
                      <span className="absolute -top-6 -right-2 text-[10rem] font-bold leading-none text-foreground/[0.03] select-none pointer-events-none z-0">
                        {i + 1}
                      </span>
                      
                      <div className="flex-1 p-8 relative z-10 lg:min-h-[220px]">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold text-foreground shadow-[0_0_15px_rgba(255,255,255,0.08)]">
                            {i + 1}
                          </span>
                          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{item.step}</p>
                        </div>
                        <h3 className="mt-6 text-2xl font-semibold text-foreground/90">{item.title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-foreground/50 sm:text-base">
                          {item.text}
                        </p>
                      </div>
                      
                      <div className="px-8 pb-8 mt-auto flex-shrink-0">
                        {i === 0 && (
                          <img
                            alt="Пауза"
                            className="h-48 w-full object-contain"
                            src="/pause-stop.svg?v=4"
                          />
                        )}
                        {i === 1 && (
                          <img
                            alt="Процесс проверки"
                            className="h-48 w-full object-contain"
                            src="/process-flow.svg?v=4"
                          />
                        )}
                        {i === 2 && (
                          <img
                            alt="Действие"
                            className="h-48 w-full object-contain"
                            src="/action-go.svg?v=4"
                          />
                        )}
                      </div>
                    </div>
                  </BorderGlow>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ══════════ HOME PROOF ══════════ */}
      <section className="relative w-full bg-background pb-16 sm:pb-20 pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="mb-14">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Что даёт сервис</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              Простой интерфейс, рабочий инструмент
            </h2>
          </div>
          
          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {homeProof.map((item, index) => {
              const cardColors = [
                'rgba(250,204,21,0.08)', // Yellow for speed
                'rgba(59,130,246,0.08)', // Blue for verified
                'rgba(168,85,247,0.08)'  // Purple for global network
              ];
              return (
                <GlassCard key={item.title} delay={index * 0.1} className="overflow-hidden p-0" glow={`radial-gradient(circle at 50% 100%, ${cardColors[index]}, transparent 60%)`}>
                  <div className="p-8 pb-2">
                    <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-3 text-base leading-relaxed text-foreground/50">
                      {item.text}
                    </p>
                  </div>
                  <div className="px-8 pb-8 pt-4">
                    {index === 0 && (
                      <img alt="Быстрый старт" className="h-48 w-full object-contain mix-blend-screen" src="/speed-fast.svg?v=4" />
                    )}
                    {index === 1 && (
                      <img alt="Объяснимый результат" className="h-48 w-full object-contain mix-blend-screen" src="/verified-check.svg?v=4" />
                    )}
                    {index === 2 && (
                      <img alt="Безопасная публикация" className="h-48 w-full object-contain mix-blend-screen" src="/global-network.svg?v=4" />
                    )}
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════ STATS SECTION ══════════ */}
      {stats && (
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
      )}

      {/* ══════════ CTA SECTION ══════════ */}
      <section className="relative w-full bg-background py-16 pb-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <GlassCard className="flex flex-col items-center justify-center p-12 text-center sm:p-20" glow="radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.05) 0%, transparent 70%)">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Есть подозрительная ссылка?</h2>
            <p className="mt-5 max-w-xl text-lg text-foreground/50">
              Вставьте её и посмотрите, что найдет анализатор.
            </p>
            <Button 
              className="mt-10 h-14 w-full sm:w-auto shrink-0 rounded-[1.5rem] bg-foreground text-black px-10 text-base font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 hover:bg-foreground hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.05] active:scale-95"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                document.getElementById('domain-input')?.focus();
              }}
            >
              Начать анализ
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
