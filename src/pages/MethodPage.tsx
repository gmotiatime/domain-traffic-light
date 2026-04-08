import { motion } from "framer-motion";

import { methodBlocks, ruleReference } from "@/lib/site-content";
import BorderGlow from "@/components/BorderGlow";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
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
      className={`relative transition-all hover:-translate-y-1 ${containerClassName}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
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

export function MethodPage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-background text-foreground selection:bg-foreground/20">
      
      {/* Animated Mesh Orbs */}
      <div className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden">
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] right-[10%] h-[700px] w-[700px] rounded-full bg-blue-500/10 opacity-30 blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, -40, 30, 0], y: [0, 50, -30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[10%] left-[5%] h-[600px] w-[600px] rounded-full bg-violet-500/10 opacity-20 blur-[120px]"
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-5 py-14 pb-32 md:px-8 md:py-24">
        {/* Header */}
        <motion.div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14" initial="initial" whileInView="whileInView" variants={stagger} viewport={{ once: true }}>
          <motion.div variants={fadeUp}>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/40">
              Методика
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-5xl md:text-6xl text-foreground">
              Защита, а не просто <span className="text-foreground/40">интерфейс.</span>
            </h1>
          </motion.div>
          <motion.p variants={fadeUp} className="max-w-xl text-base leading-relaxed text-foreground/50 sm:text-lg">
            Здесь собрана короткая логика проекта: что он решает, как работает
            и почему это уже выглядит как готовый инструмент, а не просто как
            презентация идеи.
          </motion.p>
        </motion.div>

        {/* Bento Grid Logic */}
        <div className="mt-16 grid gap-5 sm:mt-20 sm:gap-6 md:grid-cols-2">
          {methodBlocks.map((item, index) => (
            <GlassCard key={item.title} delay={index * 0.1} containerClassName="flex flex-col h-full" className="p-7 sm:p-8 flex flex-col h-full">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground/[0.04] text-xs font-bold text-foreground/60">
                0{index + 1}
              </span>
              <h2 className="mt-6 text-2xl font-semibold text-foreground">{item.title}</h2>
              <p className="mt-4 flex-1 text-base leading-relaxed text-foreground/50">
                {item.text}
              </p>
            </GlassCard>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <GlassCard containerClassName="flex h-full" className="overflow-hidden p-0 h-full" delay={0.25}>
            <div className="flex h-full flex-col">
              <div className="p-8 sm:p-10">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Визуальный образ</p>
                <h2 className="mt-5 text-3xl font-semibold text-foreground sm:text-4xl">Доменный светофор</h2>
                <p className="mt-4 text-base leading-relaxed text-foreground/55">
                  Главная метафора проекта: зелёный, жёлтый и красный сигналы
                  помогают быстро понять риск ещё до ввода данных.
                </p>
              </div>
              <div className="flex-1 p-4 sm:p-6">
                <img
                  alt="Светофор риска"
                  className="h-full w-full object-cover"
                  src="/traffic-light.svg"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard containerClassName="flex h-full" className="overflow-hidden p-0 h-full" delay={0.35}>
            <div className="flex h-full flex-col">
              <div className="p-8 sm:p-10">
                <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Просветительский акцент</p>
                <h2 className="mt-5 text-3xl font-semibold text-foreground sm:text-4xl">#КиберПраво</h2>
                <p className="mt-4 text-base leading-relaxed text-foreground/55">
                  Отдельный визуальный маркер для темы цифровой безопасности,
                  прав пользователя и официальных маршрутов помощи.
                </p>
              </div>
              <div className="flex-1 p-4 sm:p-6">
                <img
                  alt="Иллюстрация КиберПраво"
                  className="h-full w-full object-cover"
                  src="/cyber-law.svg"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Heuristics Logic */}
        <section className="mt-24 sm:mt-32">
          <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/40">
              Эвристический анализ
            </p>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground/90 sm:text-4xl">
              На что мы <span className="text-foreground/40">обращаем внимание</span>
            </h2>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/50">
              Встроенный локальный набор правил (Ruleset) не обращается к базам данных, 
              а оценивает паттерны и слова-маркеры в доменном имени.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {ruleReference.map((rule, idx) => (
              <GlassCard key={rule.title} delay={idx * 0.1} containerClassName="flex flex-col h-full" className="p-6 h-full flex flex-col">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/[0.04] text-foreground">
                  {idx === 0 ? "🔍" : idx === 1 ? "🎭" : idx === 2 ? "🪤" : "🧩"}
                </div>
                <h3 className="mt-5 text-lg font-medium text-foreground">{rule.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/50">{rule.detail}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
