import { motion } from "framer-motion";

import { methodBlocks } from "@/lib/site-content";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export function MethodPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-14 md:px-8 md:py-20">
      <motion.div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]" {...reveal}>
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Методика
          </p>
          <h1
            className="mt-4 text-4xl leading-tight text-foreground md:text-6xl"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Как проект работает и почему это защита, а не просто интерфейс.
          </h1>
        </div>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Здесь собрана логика проекта для защиты на конкурсе: проблема, решение,
          границы MVP и техническая аргументация. Это отдельный экран, чтобы не
          перегружать главную страницу.
        </p>
      </motion.div>

      <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
        {methodBlocks.map((item, index) => (
          <motion.section
            key={item.title}
            className="grid gap-4 py-8 md:grid-cols-[120px_260px_1fr]"
            {...reveal}
            transition={{ ...reveal.transition, delay: index * 0.04 }}
          >
            <p className="text-sm text-muted-foreground">0{index + 1}</p>
            <h2 className="text-2xl text-foreground">{item.title}</h2>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {item.text}
            </p>
          </motion.section>
        ))}
      </div>

      <motion.section className="mt-16 grid gap-8 lg:grid-cols-2" {...reveal}>
        <div className="border-l border-white/10 pl-6">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Состав MVP
          </p>
          <p className="mt-4 text-lg leading-relaxed text-foreground">
            Статический фронтенд, локальный анализатор, учебные примеры,
            безопасные маршруты помощи и ясная демонстрация пользовательского
            сценария.
          </p>
        </div>
        <div className="border-l border-white/10 pl-6">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Почему это сильнее, чем презентация
          </p>
          <p className="mt-4 text-lg leading-relaxed text-foreground">
            Потому что жюри видит реальный продукт: отдельные страницы, рабочий
            анализатор, продуманный контент и чёткие проектные границы.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
