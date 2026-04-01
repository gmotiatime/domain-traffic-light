import { useState, useEffect, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, Zap, Shield, Globe, Cpu, Database, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { writeAnalyzerPrefill } from "@/lib/analyzer-prefill";
import {
  behaviorSteps,
  heroVideo,
  homeManifest,
  homeProof,
} from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

/* ─── animation presets ─── */
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

/* ─── glass card wrapper ─── */
function GlassCard({
  children,
  className = "",
  delay = 0,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  glow?: string;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] backdrop-blur-2xl transition-all hover:bg-foreground/[0.04] hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] hover:border-foreground/[0.1] ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, amount: 0.1 }}
      style={glow ? { background: glow } : undefined}
    >
      {/* top edge highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
      {/* dynamic glow overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 transition-opacity hover:opacity-100" />
      {children}
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

export function HomePage() {
  const [heroInput, setHeroInput] = useState("");
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [currentVerb, setCurrentVerb] = useState(0);
  const [currentWord, setCurrentWord] = useState(0);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const verbs = ["Проверяй", "Анализируй", "Сканируй", "Изучай", "Оценивай"];
  const words = ["домен", "ссылку", "сервис", "URL", "сайт"];
  const placeholders = [
    "Вставьте домен или ссылку...",
    "Например: example.com",
    "Проверьте подозрительный URL",
    "https://suspicious-site.com",
    "Введите адрес для анализа"
  ];

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

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const verbInterval = setInterval(() => {
      setCurrentVerb((prev) => (prev + 1) % verbs.length);
    }, 3000);

    return () => clearInterval(verbInterval);
  }, []);

  useEffect(() => {
    const wordInterval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 3000);

    return () => clearInterval(wordInterval);
  }, []);

  useEffect(() => {
    const placeholderInterval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 4000);

    return () => clearInterval(placeholderInterval);
  }, []);

  function openAnalyzerWithInput(input: string) {
    writeAnalyzerPrefill(input);
    window.location.hash = routeHref("/analyzer");
  }

  return (
    <div className="bg-background text-foreground selection:bg-foreground/20">
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
          <motion.div
            animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-[10%] left-[10%] h-[700px] w-[700px] rounded-full bg-blue-500/10 opacity-40 blur-[150px]"
            style={{ transform: `translateY(${scrollY * 0.3}px)` }}
          />
          <motion.div
            animate={{ x: [0, -40, 30, 0], y: [0, 50, -30, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 right-[5%] h-[600px] w-[600px] rounded-full bg-violet-500/10 opacity-30 blur-[120px]"
            style={{ transform: `translateY(${scrollY * 0.2}px)` }}
          />
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
              <span className="relative inline-block">
                <motion.span
                  key={currentVerb}
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="inline-block"
                >
                  {verbs[currentVerb]}
                </motion.span>
              </span>{" "}
              <span className="relative inline-block">
                <motion.span
                  key={currentWord}
                  initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="inline-block bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent"
                >
                  {words[currentWord]}
                </motion.span>
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent">
                до ввода данных
              </span>
            </motion.h1>
            
            <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/60 sm:text-lg">
              Сервис помогает быстро оценить риск ссылки, понять причину сигнала и
              перейти к безопасному действию до того, как пользователь введёт
              данные.
            </motion.p>

            <motion.div variants={fadeUp} className="mx-auto mt-12 w-full max-w-3xl">
              <form
                className="relative flex flex-col items-center gap-3 sm:flex-row sm:gap-2 rounded-[2rem] border border-foreground/10 bg-foreground/[0.04] p-3 backdrop-blur-2xl transition-all focus-within:border-foreground/20 focus-within:bg-foreground/[0.06] focus-within:shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                onSubmit={(event) => {
                  event.preventDefault();
                  openAnalyzerWithInput(heroInput);
                }}
              >
                <div className="flex flex-1 items-center gap-3 px-4 w-full h-14 relative z-20">
                  <Globe className="h-6 w-6 shrink-0 text-foreground/30" />
                  <div className="relative w-full">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPlaceholder}
                        initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        className="pointer-events-none absolute inset-0 flex items-center text-lg text-foreground/30"
                      >
                        {!heroInput && placeholders[currentPlaceholder]}
                      </motion.div>
                    </AnimatePresence>
                    <input
                      id="domain-input"
                      className="w-full bg-transparent text-lg text-foreground outline-none relative z-10 transition-shadow focus:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                      onChange={(event) => setHeroInput(event.target.value)}
                      value={heroInput}
                    />
                  </div>
                </div>
                <Button className="h-14 w-full sm:w-auto rounded-xl bg-foreground text-black px-8 text-base font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-foreground/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95" type="submit">
                  Анализ
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

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
      <section className="relative w-full bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.26em] text-foreground/40">Подкапотная магия</p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Множественный <span className="text-foreground/50">анализ в реальном времени</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <GlassCard delay={0.1} className="overflow-hidden p-0">
              <div className="p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04]">
                  <Shield className="h-6 w-6 text-foreground/60" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold">Фиды фишинга</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground/50">
                  Моментальная сверка с актуальными базами OpenPhish и URLAbuse. Если домен уже засветился в малвари — вы узнаете об этом первыми.
                </p>
              </div>
              <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_70%)] p-8">
                <img
                  alt="Защита от фишинга"
                  className="h-48 w-full object-contain"
                  src="/shield-protection.svg"
                />
              </div>
            </GlassCard>

            <GlassCard delay={0.2} className="overflow-hidden p-0">
              <div className="p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04]">
                  <Cpu className="h-6 w-6 text-foreground/60" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold">Локальный Ruleset</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground/50">
                  Быстрый разбор структуры URL, проверка на опечатки популярных брендов и подозрительные TLD-зоны. Срабатывает мгновенно.
                </p>
              </div>
              <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_70%)] p-8">
                <img
                  alt="Сканирование базы данных"
                  className="h-48 w-full object-contain"
                  src="/database-scan.svg"
                />
              </div>
            </GlassCard>

            <GlassCard delay={0.3} className="overflow-hidden p-0 md:col-span-2 lg:col-span-1 border-violet-500/20 bg-violet-500/[0.02]">
              <div className="p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/[0.08]">
                  <Zap className="h-6 w-6 text-violet-400" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-foreground">Умный AI-слой</h3>
                <p className="mt-3 text-base leading-relaxed text-violet-100/60">
                  После быстрой проверки языковая модель сводит все сигналы воедино, объясняет причину риска простым языком и даёт чёткую рекомендацию.
                </p>
              </div>
              <div className="border-t border-violet-500/[0.15] bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1),transparent_70%)] p-8">
                <img
                  alt="AI анализ"
                  className="h-48 w-full object-contain"
                  src="/ai-analysis.svg"
                />
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ══════════ BEHAVIOR LOGIC ══════════ */}
      <section className="relative w-full bg-background py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <GlassCard className="p-8 sm:p-12 md:p-14">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Логика сервиса</p>
              <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Пауза, проверка и действие <span className="text-foreground/50">— в одном сценарии</span>
              </h2>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {behaviorSteps.map((item, i) => (
                <div key={item.step} className="relative overflow-hidden rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] transition-colors hover:bg-foreground/[0.03]">
                  {/* Big glowing background number */}
                  <span className="absolute -top-6 -right-2 text-[10rem] font-bold leading-none text-foreground/[0.03] select-none pointer-events-none z-0">
                    {i + 1}
                  </span>
                  
                  <div className="p-8 relative z-10">
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
                  {i === 0 && (
                    <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.08),transparent_70%)] p-8">
                      <img
                        alt="Пауза"
                        className="h-48 w-full object-contain"
                        src="/pause-stop.svg"
                      />
                    </div>
                  )}
                  {i === 1 && (
                    <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08),transparent_70%)] p-8">
                      <img
                        alt="Процесс проверки"
                        className="h-48 w-full object-contain"
                        src="/process-flow.svg"
                      />
                    </div>
                  )}
                  {i === 2 && (
                    <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_70%)] p-8">
                      <img
                        alt="Действие"
                        className="h-48 w-full object-contain"
                        src="/action-go.svg"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ══════════ HOME PROOF ══════════ */}
      <section className="relative w-full bg-background pb-24 sm:pb-32 pt-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
          <div className="mb-14">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Что даёт сервис</p>
            <h2 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
              Понятный вход в реальный инструмент
            </h2>
          </div>
          
          <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
            {homeProof.map((item, index) => (
              <GlassCard key={item.title} delay={index * 0.1} className="overflow-hidden p-0">
                <div className="p-8">
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-foreground/50">
                    {item.text}
                  </p>
                </div>
                {index === 0 && (
                  <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.08),transparent_70%)] p-8">
                    <img
                      alt="Быстрый старт"
                      className="h-48 w-full object-contain"
                      src="/speed-fast.svg"
                    />
                  </div>
                )}
                {index === 1 && (
                  <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08),transparent_70%)] p-8">
                    <img
                      alt="Объяснимый результат"
                      className="h-48 w-full object-contain"
                      src="/verified-check.svg"
                    />
                  </div>
                )}
                {index === 2 && (
                  <div className="border-t border-foreground/[0.06] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.08),transparent_70%)] p-8">
                    <img
                      alt="Безопасная публикация"
                      className="h-48 w-full object-contain"
                      src="/global-network.svg"
                    />
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ STATS SECTION ══════════ */}
      {stats && (
        <section className="relative w-full bg-background py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
            <div className="text-center mb-14">
              <p className="text-xs uppercase tracking-[0.26em] text-foreground/40">Статистика в реальном времени</p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
                Проверено доменов: <AnimatedCounter end={stats.total || stats.size || 0} className="inline-block bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent" />
              </h2>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <GlassCard delay={0.1} className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/[0.08]">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">Безопасные</div>
                <AnimatedCounter end={stats.verdicts?.low || 0} className="mt-2 text-3xl font-bold text-green-400" duration={1500} />
                <p className="mt-2 text-sm text-foreground/40">Домены с низким риском</p>
              </GlassCard>

              <GlassCard delay={0.2} className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/[0.08]">
                  <Search className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">Подозрительные</div>
                <AnimatedCounter end={stats.verdicts?.medium || 0} className="mt-2 text-3xl font-bold text-yellow-400" duration={1500} />
                <p className="mt-2 text-sm text-foreground/40">Требуют внимания</p>
              </GlassCard>

              <GlassCard delay={0.3} className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/[0.08]">
                  <TrendingUp className="h-6 w-6 text-red-400" />
                </div>
                <div className="mt-4 text-xs uppercase tracking-wider text-foreground/50">Опасные</div>
                <AnimatedCounter end={stats.verdicts?.high || 0} className="mt-2 text-3xl font-bold text-red-400" duration={1500} />
                <p className="mt-2 text-sm text-foreground/40">Высокий риск фишинга</p>
              </GlassCard>

              <GlassCard delay={0.4} className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/[0.08]">
                  <Database className="h-6 w-6 text-violet-400" />
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
      <section className="relative w-full bg-background py-20 pb-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <GlassCard className="flex flex-col items-center justify-center p-12 text-center sm:p-20" glow="radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.05) 0%, transparent 70%)">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Готовы проверить ссылку?</h2>
            <p className="mt-5 max-w-xl text-lg text-foreground/50">
              Вставьте любой подозрительный домен и посмотрите, как работает алгоритм в реальном времени.
            </p>
            <Button 
              className="mt-10 h-14 rounded-full px-10 text-base font-semibold shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-transform hover:scale-105"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                document.getElementById('domain-input')?.focus();
              }}
            >
              Начать анализ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
