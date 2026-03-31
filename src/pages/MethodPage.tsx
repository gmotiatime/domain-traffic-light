import { motion } from "framer-motion";

import { methodBlocks } from "@/lib/site-content";

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
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </motion.div>
  );
}

export function MethodPage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-black text-white selection:bg-white/20">
      
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
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/40">
              Методика
            </p>
            <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl text-white">
              Защита, а не просто <span className="text-white/40">интерфейс.</span>
            </h1>
          </motion.div>
          <motion.p variants={fadeUp} className="max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
            Здесь собрана короткая логика проекта: что он решает, как работает
            и почему это уже выглядит как готовый инструмент, а не просто как
            презентация идеи.
          </motion.p>
        </motion.div>

        {/* Bento Grid Logic */}
        <div className="mt-16 grid gap-5 sm:mt-20 sm:gap-6 md:grid-cols-2">
          {methodBlocks.map((item, index) => (
            <GlassCard key={item.title} delay={index * 0.1} className="p-7 sm:p-8 flex flex-col">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] text-xs font-bold text-white/60">
                0{index + 1}
              </span>
              <h2 className="mt-6 text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-4 flex-1 text-base leading-relaxed text-white/50">
                {item.text}
              </p>
            </GlassCard>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <GlassCard className="overflow-hidden p-0" delay={0.25}>
            <div className="flex h-full flex-col">
              <div className="p-8 sm:p-10">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Визуальный образ</p>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Доменный светофор</h2>
                <p className="mt-4 text-base leading-relaxed text-white/55">
                  Главная метафора проекта: зелёный, жёлтый и красный сигналы
                  помогают быстро понять риск ещё до ввода данных.
                </p>
              </div>
              <div className="flex-1 border-t border-white/[0.06] bg-[radial-gradient(circle_at_center,rgba(88,191,255,0.1),transparent_70%)] p-4 sm:p-6">
                <img
                  alt="Светофор риска"
                  className="h-full w-full object-cover"
                  src="/traffic-light.svg"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden p-0" delay={0.35}>
            <div className="flex h-full flex-col">
              <div className="p-8 sm:p-10">
                <p className="text-xs uppercase tracking-[0.24em] text-white/40">Просветительский акцент</p>
                <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">#КиберПраво</h2>
                <p className="mt-4 text-base leading-relaxed text-white/55">
                  Отдельный визуальный маркер для темы цифровой безопасности,
                  прав пользователя и официальных маршрутов помощи.
                </p>
              </div>
              <div className="flex-1 border-t border-white/[0.06] bg-[radial-gradient(circle_at_center,rgba(124,199,255,0.1),transparent_70%)] p-4 sm:p-6">
                <img
                  alt="Иллюстрация КиберПраво"
                  className="h-full w-full object-cover"
                  src="/cyber-law.svg"
                />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
