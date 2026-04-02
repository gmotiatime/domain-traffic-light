import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown, Scale } from "lucide-react";

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
      className={`relative overflow-hidden rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] backdrop-blur-2xl ${className}`}
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
    <div className="relative isolate min-h-[calc(100vh-6rem)] w-full overflow-hidden bg-background text-foreground selection:bg-foreground/20">
      
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
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-foreground/40">
            Безопасность
          </p>
          <h1 className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl text-foreground">
            Приватность и границы <span className="text-foreground/40">инструмента.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-foreground/50 sm:text-lg">
            Отдельный экран, чтобы прояснить официальные маршруты помощи и
            гарантировать, что анализатор не хранит ваши данные.
          </p>
        </motion.div>

        {/* Safety Principles */}
        <section className="mt-16 sm:mt-24 grid gap-5 sm:gap-6 lg:grid-cols-2">
          {safetyPrinciples.map((item, index) => (
            <GlassCard key={item.title} delay={index * 0.1} className="overflow-hidden p-0">
              <div className="p-8">
                <h2 className="text-2xl font-semibold text-foreground">{item.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-foreground/50">
                  {item.text}
                </p>
              </div>
              {index === 0 && (
                <div className="p-8">
                  <img
                    alt="Без регистрации"
                    className="h-48 w-full object-contain"
                    src="/privacy-lock.svg"
                  />
                </div>
              )}
              {index === 1 && (
                <div className="p-8">
                  <img
                    alt="Без хранения запросов"
                    className="h-48 w-full object-contain"
                    src="/database-scan.svg"
                  />
                </div>
              )}
              {index === 2 && (
                <div className="p-8">
                  <img
                    alt="Без реальных вредоносных доменов"
                    className="h-48 w-full object-contain"
                    src="/verified-check.svg"
                  />
                </div>
              )}
              {index === 3 && (
                <div className="p-8">
                  <img
                    alt="С официальными маршрутами"
                    className="h-48 w-full object-contain"
                    src="/security-alert.svg"
                  />
                </div>
              )}
            </GlassCard>
          ))}
        </section>

        {/* Context / Urgency section */}
        <section className="mt-24 sm:mt-32">
          <motion.div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between" variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-400/60">
                Контекст проблемы
              </p>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground/90 sm:text-4xl">
                Меньше секунды <span className="text-foreground/40">на ошибку</span>
              </h2>
              <p className="mt-6 text-base leading-relaxed text-foreground/50">
                Социальная инженерия работает за счёт спешки и страха. Жертва получает сообщение
                о взломе, переходит по ссылке и сразу вводит код. Анализатор проектировался
                с единственной целью — прервать этот автоматизм.
              </p>
            </div>
            <div className="flex gap-4 sm:flex-row flex-col">
              <div className="rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-6 backdrop-blur-sm">
                <p className="text-3xl font-bold text-foreground">88%</p>
                <p className="mt-2 text-sm text-foreground/50">Скам-атак начинаются<br/>с фишинговой ссылки</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/[0.15] bg-emerald-500/[0.02] p-6 backdrop-blur-sm">
                <p className="text-3xl font-bold text-emerald-400">0</p>
                <p className="mt-2 text-sm text-emerald-400/70">Личных данных<br/>сохраняется у нас</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Official Routes */}
        <section className="mt-32 grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-400/60">
              Куда направлять пользователя
            </p>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-foreground/90 sm:text-5xl">
              После сигнала риска нужен <span className="text-foreground/40">следующий шаг.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-foreground/50">
              Мы не банк и не полиция. Наша цель — быстро указать на опасность и
              маршрутизировать юзера туда, где ему окажут компетентную помощь.
            </p>
          </motion.div>

          <div className="flex flex-col gap-4">
            {officialRoutes.map((route, index) => (
              <GlassCard key={route.title} delay={index * 0.1} className="p-5 sm:p-6 transition-colors hover:bg-foreground/[0.04] group">
                <a
                  className="flex items-start justify-between gap-4 outline-none"
                  href={route.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <div>
                    <p className="text-xl font-medium text-foreground group-hover:text-rose-200 transition-colors">{route.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground/50 sm:text-base">
                      {route.text}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </a>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* CyberLaw (#КиберПраво) Section */}
        <section className="mt-32">
          <motion.div variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }} className="max-w-3xl">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                <Scale className="h-4 w-4" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-400/80">
                #КиберПраво
              </p>
            </div>
            <h2 className="mt-5 text-4xl font-bold tracking-tight text-foreground/90 sm:text-5xl">
              Правовой контекст <span className="text-foreground/40">и защита.</span>
            </h2>
            <p className="mt-6 text-base leading-relaxed text-foreground/50">
              Фишинг — это не просто вид мошенничества, это уголовно наказуемое деяние по законодательству Республики Беларусь. Каждый пользователь сети обладает неотъемлемым правом на тайну, защиту своих данных и правовую помощь.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <GlassCard delay={0.1} className="p-8 border-violet-500/10 bg-violet-500/[0.02]">
              <h3 className="text-2xl font-semibold text-foreground">Закон о защите персональных данных</h3>
              <p className="mt-4 text-base leading-relaxed text-foreground/50">
                В соответствии с Законом Республики Беларусь «О защите персональных данных», вы являетесь полноправным субъектом персональных данных. Никто не имеет права собирать, обрабатывать и использовать ваши данные (включая связки логин-пароль, ФИО, телефон) без вашего явного и осознанного согласия. Фишинговые ресурсы грубо нарушают этот закон, собирая данные неправомерно.
              </p>
            </GlassCard>

            <GlassCard delay={0.2} className="p-8 border-rose-500/10 bg-rose-500/[0.02]">
              <h3 className="text-2xl font-semibold text-foreground">Куда обращаться пострадавшему?</h3>
              <p className="mt-4 text-base leading-relaxed text-foreground/50">
                Юридическая фиксация инцидента критически важна для защиты ваших прав, возврата средств и блокировки активов злоумышленников. При утечке данных или мошенничестве:
              </p>
              <ul className="mt-5 space-y-4">
                <li className="flex items-start gap-4">
                  <div className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-rose-500/50" />
                  <p className="text-base text-foreground/80">
                    <a href="https://cpd.by" target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:text-rose-400 transition-colors underline decoration-foreground/20 underline-offset-4">НЦЗПД (cpd.by)</a> — при незаконно собранных контактных и личных данных.
                  </p>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-rose-500/50" />
                  <p className="text-base text-foreground/80">
                    <a href="https://cert.by" target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:text-rose-400 transition-colors underline decoration-foreground/20 underline-offset-4">CERT.BY (cert.by)</a> — национальный центр реагирования на компьютерные инциденты для блокировки вредоносного ресурса.
                  </p>
                </li>
              </ul>
            </GlassCard>
          </div>
        </section>

        {/* FAQ Area */}
        <section className="mt-32">
          <motion.p className="text-xs font-semibold uppercase tracking-[0.24em] text-foreground/40" variants={fadeUp} initial="initial" whileInView="whileInView" viewport={{ once: true }}>
            FAQ
          </motion.p>
          <div className="mt-6 space-y-4">
            {faqItems.map((item, index) => (
              <GlassCard key={item.title} delay={index * 0.1} className="p-6">
                <details className="group marker:content-['']">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-medium text-foreground/90 outline-none">
                    <span>{item.title}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05] group-open:bg-foreground/10 transition-colors">
                      <ChevronDown className="h-4 w-4 text-foreground/50 transition-transform group-open:rotate-180" />
                    </span>
                  </summary>
                  <p className="mt-4 pt-4 border-t border-foreground/[0.05] text-base leading-relaxed text-foreground/50">
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
