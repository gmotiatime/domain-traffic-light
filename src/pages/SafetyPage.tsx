import { motion } from "framer-motion";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { faqItems, officialRoutes, safetyPrinciples } from "@/lib/site-content";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export function SafetyPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-14 md:px-8 md:py-20">
      <motion.div className="max-w-3xl" {...reveal}>
        <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
          Безопасность
        </p>
        <h1
          className="mt-4 text-4xl leading-tight text-foreground md:text-6xl"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Отдельный экран про приватность, границы MVP и официальные маршруты помощи.
        </h1>
      </motion.div>

      <section className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {safetyPrinciples.map((item, index) => (
          <motion.div
            key={item.title}
            className="grid gap-3 py-6 md:grid-cols-[280px_1fr]"
            {...reveal}
            transition={{ ...reveal.transition, delay: index * 0.04 }}
          >
            <p className="text-lg text-foreground">{item.title}</p>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </motion.div>
        ))}
      </section>

      <section className="mt-16 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div {...reveal}>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Куда направлять пользователя
          </p>
          <h2
            className="mt-4 text-4xl leading-tight text-foreground"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            После сигнала риска нужен не только цвет, но и понятный следующий шаг.
          </h2>
        </motion.div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {officialRoutes.map((route, index) => (
            <motion.a
              key={route.title}
              className="flex items-start justify-between gap-4 py-6"
              href={route.href}
              rel="noreferrer"
              target="_blank"
              {...reveal}
              transition={{ ...reveal.transition, delay: index * 0.04 }}
            >
              <div>
                <p className="text-lg text-foreground">{route.title}</p>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {route.text}
                </p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 text-muted-foreground" />
            </motion.a>
          ))}
        </div>
      </section>

      <section className="mt-16">
        <motion.p className="text-sm uppercase tracking-[0.24em] text-muted-foreground" {...reveal}>
          FAQ
        </motion.p>
        <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {faqItems.map((item, index) => (
            <motion.details
              key={item.title}
              className="group py-5"
              {...reveal}
              transition={{ ...reveal.transition, delay: index * 0.04 }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-lg text-foreground">
                <span>{item.title}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </motion.details>
          ))}
        </div>
      </section>
    </div>
  );
}
