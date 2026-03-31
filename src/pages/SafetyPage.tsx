import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { faqItems, officialRoutes, safetyPrinciples } from "@/lib/site-content";

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

export function SafetyPage() {
  return (
    <div className="relative isolate min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-black text-white selection:bg-white/20">
      
      {/* Animated Mesh Orbs */}
      <div className="pointer-events-none absolute inset-0 -z-[5] overflow-hidden">
        <motion.div
          animate={{ x: [0, -30, 20, 0], y: [0, 40, -20, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[5%] left-[10%] h-[700px] w-[700px] rounded-full bg-emerald-500/10 opacity-30 blur-[150px]"
        />
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -40, 30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[0%] right-[5%] h-[600px] w-[600px] rounded-full bg-rose-500/10 opacity-20 blur-[120px]"
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-14 pb-32 sm:px-6 md:px-8 md:py-24">
        
        {/* Header */}
        <motion.div className="max-w-3xl" initial="initial" whileInView="whileInView" variants={fadeUp} viewport={{ once: true }}>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/40">
            Безопасность
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl text-white">
            Приватность и границы <span className="text-white/40">инструмента.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/50 sm:text-lg">
            Отдельный экран, чтобы прояснить официальные маршруты помощи и
            гарантировать, что анализатор не хранит ваши данные.
          </p>
        </motion.div>

        {/* Safety Principles */}
        <section className="mt-16 sm:mt-24 grid gap-5 sm:gap-6 lg:grid-cols-2">
          {safetyPrinciples.map((item, index) => (
            <GlassCard key={item.title} delay={index * 0.1} className="p-7 sm:p-8 flex flex-col justify-center">
              <h2 className="text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-base leading-relaxed text-white/50">
                {item.text}
              </p>
            </GlassCard>
          ))}
        </section>

        {/* Official Routes */}
        <section className="mt-24 grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-400/60">
              Куда направлять пользователя
            </p>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-white/90 sm:text-5xl">
              После сигнала риска нужен <span className="text-white/40">следующий шаг.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/50">
              Мы не банк и не полиция. Наша цель — быстро указать на опасность и
              маршрутизировать юзера туда, где ему окажут компетентную помощь.
            </p>
          </motion.div>

          <div className="flex flex-col gap-4">
            {officialRoutes.map((route, index) => (
              <GlassCard key={route.title} delay={index * 0.1} className="p-5 sm:p-6 transition-colors hover:bg-white/[0.04] group">
                <a
                  className="flex items-start justify-between gap-4 outline-none"
                  href={route.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div>
                    <p className="text-xl font-medium text-white group-hover:text-rose-200 transition-colors">{route.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-white/50 sm:text-base">
                      {route.text}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </a>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* FAQ Area */}
        <section className="mt-32">
          <motion.p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40" variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            FAQ
          </motion.p>
          <div className="mt-6 space-y-4">
            {faqItems.map((item, index) => (
              <GlassCard key={item.title} delay={index * 0.1} className="p-6">
                <details className="group marker:content-['']">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-medium text-white/90 outline-none">
                    <span>{item.title}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] group-open:bg-white/10 transition-colors">
                      <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <p className="mt-4 pt-4 border-t border-white/[0.05] text-base leading-relaxed text-white/50">
                    {item.text}
                  </p>
                </details>
              </GlassCard>
            ))}
          </div>
        </section>
        
      </div>
    </div>
  );
}
