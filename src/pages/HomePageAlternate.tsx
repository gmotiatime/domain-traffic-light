import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, Zap, Shield, Globe, Cpu, TrendingUp, Sparkles, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { writeAnalyzerPrefill } from "@/lib/analyzer-prefill";
import { routeHref } from "@/lib/site-router";

import BorderGlow from "@/components/BorderGlow";
import Dither from "@/components/Dither";

/* ─── animation presets ─── */
const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.7, ease: "easeOut" },
};

const stagger = {
  whileInView: { transition: { staggerChildren: 0.1 } },
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
      className={`relative transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.01] ${containerClassName}`}
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
      viewport={{ once: true, amount: 0.1 }}
    >
      <BorderGlow
        className={`w-full h-full rounded-[2.5rem] border-white/5 shadow-2xl flex flex-col ${className}`}
        borderRadius={40}
        glowRadius={40}
        fillOpacity={0}
        backgroundColor="#050505"
      >
        <div style={glow ? { background: glow, height: "100%" } : { height: "100%" }}>
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
};

export function HomePageAlternate() {
  const [heroInput, setHeroInput] = useState("");
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [scrollY, setScrollY] = useState(0);

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
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function openAnalyzerWithInput(input: string) {
    writeAnalyzerPrefill(input);
    window.location.hash = routeHref("/analyzer");
  }

  return (
    <div className="relative bg-[#020202] text-foreground selection:bg-foreground/20 overflow-hidden font-sans">
      {/* ══════════ DITHER BACKGROUND ══════════ */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Dither
          waveSpeed={0.03}
          waveFrequency={3}
          waveAmplitude={0.5}
          waveColor={[0.1, 0.15, 0.3]} // Deep blue/violet hue
          colorNum={6}
          pixelSize={3}
          enableMouseInteraction={true}
          mouseRadius={1.5}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020202]/50 via-transparent to-[#020202]" />
      </div>

      {/* Background Accent Gradients (keeping some light behind things) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] left-1/2 -translate-x-1/2 h-[800px] w-[1200px] rounded-[100%] bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06),transparent_70%)] blur-[120px]"
          style={{ transform: `translateX(-50%) translateY(${scrollY * 0.4}px)` }}
        />
      </div>

      {/* ══════════ HERO SECTION ══════════ */}
      <section className="relative isolate min-h-[95svh] flex flex-col items-center justify-center px-4 pt-32 pb-20">
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="whileInView"
          className="w-full max-w-4xl text-center flex flex-col items-center relative z-10"
        >
          <motion.div variants={fadeUp} className="mb-6 flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 px-4 backdrop-blur-md">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-medium text-white/70">Новое измерение безопасности</span>
          </motion.div>

          <motion.h1 
            variants={fadeUp}
            className="text-5xl font-semibold leading-[1.1] tracking-[-0.03em] sm:text-6xl md:text-8xl bg-gradient-to-br from-white via-white/90 to-white/30 bg-clip-text text-transparent drop-shadow-sm"
          >
            Распознаёт угрозы <br/> до перехода.
          </motion.h1>

          <motion.p variants={fadeUp} className="mt-8 max-w-2xl text-lg text-white/50 font-light leading-relaxed">
            Вставьте любую ссылку для мгновенного AI-анализа репутации, проверки фишинга и оценки риска.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-12 w-full max-w-2xl">
            <div className="relative p-[1px] rounded-[2rem] bg-gradient-to-b from-white/20 to-white/0 shadow-[0_0_80px_rgba(255,255,255,0.05)] transition-shadow hover:shadow-[0_0_100px_rgba(255,255,255,0.08)]">
              <form
                className="relative flex items-center gap-2 rounded-[2rem] bg-[#0A0A0A] p-2 pr-2 overflow-hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  openAnalyzerWithInput(heroInput);
                }}
              >
                {/* Embedded animated glare */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent w-[200%] animate-[shimmer_5s_infinite] -left-[100%]" />
                
                <div className="flex flex-1 items-center gap-4 px-5 relative z-10 w-full h-16">
                  <Globe className="h-6 w-6 text-white/30" />
                  <input
                    id="domain-input"
                    aria-label="Введите домен или ссылку для проверки"
                    className="w-full bg-transparent text-xl font-medium text-white placeholder:text-white/20 outline-none"
                    placeholder="example.com или полный URL..."
                    value={heroInput}
                    onChange={(e) => setHeroInput(e.target.value)}
                  />
                </div>
                <Button className="h-14 shrink-0 rounded-[1.5rem] bg-white text-black px-8 text-base font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-transform" type="submit">
                  Анализ
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════ BENTO BOX FEATURES ══════════ */}
      <section className="relative w-full py-20 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-medium tracking-tight sm:text-5xl bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
              Точная нейронная аналитика
            </h2>
            <p className="mt-4 text-white/40">Под капотом работают три мощные системы проверки.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 md:grid-rows-2">
            {/* Cell 1: Large Wide AI Analysis */}
            <GlassCard delay={0.1} containerClassName="md:col-span-2 md:row-span-1" className="p-0 overflow-hidden group" glow="radial-gradient(circle at 80% 20%, rgba(139,92,246,0.1), transparent 60%)">
              <div className="flex flex-col sm:flex-row h-full">
                <div className="p-10 flex-1 flex flex-col justify-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/5 border border-white/10 mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="h-6 w-6 text-violet-400" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">AI-слой и Эвристика</h3>
                  <p className="text-white/50 leading-relaxed max-w-sm">
                    Умный алгоритм разбирает структуру URL, анализирует контекст доменной зоны и оценивает риски тайпсквоттинга.
                  </p>
                </div>
                <div className="w-full sm:w-2/5 p-6 relative flex items-center justify-center min-h-[250px]">
                  <div className="absolute inset-0 bg-gradient-to-l from-violet-500/10 to-transparent" />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="w-48 h-48 rounded-full border border-violet-500/20 border-dashed absolute" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} className="w-32 h-32 rounded-full border border-violet-400/30 border-dotted absolute" />
                  <Network className="h-16 w-16 text-violet-300 relative z-10 opacity-80" />
                </div>
              </div>
            </GlassCard>

            {/* Cell 2: Anti-Phishing DBs */}
            <GlassCard delay={0.2} containerClassName="md:col-span-1 md:row-span-1" className="p-10 flex flex-col justify-between group" glow="radial-gradient(circle at 100% 100%, rgba(34,197,94,0.08), transparent 70%)">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/5 border border-white/10 mb-6 group-hover:scale-110 transition-transform">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Фиды фишинга</h3>
                <p className="text-white/50 leading-relaxed">
                  Мгновенная сверка с базами OpenPhish, URLAbuse и другими OSINT-базами.
                </p>
              </div>
              <div className="mt-8 flex items-center gap-3">
                <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                <span className="text-xs uppercase tracking-wider text-green-400/80">Базы обновлены</span>
              </div>
            </GlassCard>

            {/* Cell 3: Realtime Database Stats */}
            <GlassCard delay={0.3} containerClassName="md:col-span-1 md:row-span-1" className="p-10 group" glow="radial-gradient(circle at 0% 100%, rgba(59,130,246,0.08), transparent 70%)">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-white/5 border border-white/10 mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Быстрый кэш</h3>
              <p className="text-white/50 leading-relaxed mb-6">
                Все проверки кэшируются. Повторный скан мгновенен и не тратит токены.
              </p>
              <div className="text-4xl font-bold font-mono tracking-tight text-white/90">
                {stats?.total ? <AnimatedCounter end={stats.total} duration={2000} /> : "..."}
                <span className="text-lg text-white/30 ml-2 font-sans">доменов</span>
              </div>
            </GlassCard>

            {/* Cell 4: Security Veridcts Focus */}
            <GlassCard delay={0.4} containerClassName="md:col-span-2 md:row-span-1" className="p-10 flex flex-col sm:flex-row justify-between items-center group" glow="radial-gradient(circle at 50% 100%, rgba(250,204,21,0.06), transparent 80%)">
              <div className="max-w-md w-full mb-8 sm:mb-0">
                <h3 className="text-2xl font-semibold mb-3">Оценка по 3 уровням риска</h3>
                <p className="text-white/50 leading-relaxed">
                  Сервис сразу дает вердикт: Low, Medium или High, чтобы вы четко понимали, переходить по ссылке или закрыть страницу.
                </p>
              </div>
              <div className="flex flex-col gap-4 w-full sm:w-auto">
                <div className="flex items-center justify-between w-48 bg-white/5 rounded-xl border border-white/10 p-3 px-4">
                  <span className="text-xs font-semibold uppercase text-green-400">Low Risk</span>
                  <span className="text-sm text-white/60 font-mono">{stats?.verdicts?.low || 0}</span>
                </div>
                <div className="flex items-center justify-between w-48 bg-white/5 rounded-xl border border-white/10 p-3 px-4">
                  <span className="text-xs font-semibold uppercase text-yellow-400">Medium</span>
                  <span className="text-sm text-white/60 font-mono">{stats?.verdicts?.medium || 0}</span>
                </div>
                <div className="flex items-center justify-between w-48 bg-white/5 rounded-xl border border-white/10 p-3 px-4">
                  <span className="text-xs font-semibold uppercase text-red-400">High Risk</span>
                  <span className="text-sm text-white/60 font-mono">{stats?.verdicts?.high || 0}</span>
                </div>
              </div>
            </GlassCard>
            
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="relative w-full py-24 z-10 flex flex-col items-center">
        <h2 className="text-3xl font-semibold tracking-tight text-white/80">Готовы к безопасной сети?</h2>
        <Button 
            className="mt-8 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white px-10 text-base shadow-xl transition-all"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              document.getElementById("domain-input")?.focus();
            }}
          >
            Начать анализ
            <Search className="ml-2 h-5 w-5" />
        </Button>
      </section>
      
      {/* Tailwind specific animations strictly for this page if needed (usually in global css, but shimmer is generic) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% { left: 100%; }
        }
      `}} />
    </div>
  );
}
