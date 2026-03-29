import { useState } from "react";

import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { writeAnalyzerPrefill } from "@/lib/analyzer-prefill";
import {
  behaviorSteps,
  heroVideo,
  homeManifest,
  homeProof,
} from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export function HomePage() {
  const [heroInput, setHeroInput] = useState("");

  function openAnalyzerWithInput(input: string) {
    writeAnalyzerPrefill(input);
    window.location.hash = routeHref("/analyzer");
  }

  return (
    <div>
      <section className="relative isolate min-h-[84svh] overflow-hidden">
        <video
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
          loop
          muted
          playsInline
          src={heroVideo}
        />

        <div className="relative mx-auto flex min-h-[84svh] w-full max-w-7xl flex-col items-center justify-center px-4 pb-14 pt-28 text-center sm:px-5 sm:pb-16 sm:pt-32 md:px-8 md:pb-20 md:pt-36">
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="max-w-5xl"
            initial={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            viewport={{ once: true }}
            whileInView={{ opacity: 1, y: 0 }}
          >
            <p className="text-xs uppercase tracking-[0.26em] text-slate-200/72 sm:text-sm">
              Учебный конкурсный проект для Беларуси
            </p>
            <h1
              className="mt-5 text-4xl font-normal leading-[0.95] tracking-[-1.5px] text-white sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Проверяй <em className="not-italic text-slate-200/72">домен</em>
              <br />
              <em className="not-italic text-slate-200/72">до ввода данных.</em>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-slate-200/78 sm:text-base md:text-lg">
              Сервис помогает быстро оценить риск ссылки, понять причину сигнала и
              перейти к безопасному действию до того, как пользователь введёт
              данные.
            </p>

            <div className="mx-auto mt-8 w-full max-w-4xl rounded-[1.7rem] border border-white/12 bg-background/28 p-4 backdrop-blur-md sm:mt-10 sm:p-5">
              <form
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  openAnalyzerWithInput(heroInput);
                }}
              >
                <div className="flex items-center gap-3 rounded-[1.3rem] border border-white/12 bg-background/72 px-4 py-3.5">
                  <Search className="h-4 w-4 shrink-0 text-slate-200/60" />
                  <input
                    className="w-full bg-transparent text-base text-white outline-none placeholder:text-slate-200/46"
                    onChange={(event) => setHeroInput(event.target.value)}
                    placeholder="Вставьте домен или ссылку"
                    value={heroInput}
                  />
                </div>
                <Button className="h-12 px-8 text-base sm:h-14 sm:px-10" type="submit">
                  Проверить домен
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-start">
                  {homeManifest.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 text-sm text-slate-200/72"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-white/55" />
                      {item}
                    </span>
                  ))}
                </div>

                <Button asChild className="h-10 px-0 text-sm text-slate-200/72 hover:text-white" variant="ghost">
                  <a href={routeHref("/method")}>Как работает проверка</a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-18 sm:px-5 sm:py-20 md:px-8">
        <motion.div
          className="rounded-[2rem] border border-white/10 bg-card/46 p-6 sm:p-7 md:p-8"
          {...reveal}
        >
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Логика сервиса
            </p>
            <h2
              className="mt-4 text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Пауза, проверка и действие — в одном коротком сценарии.
            </h2>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {behaviorSteps.map((item) => (
              <div
                key={item.step}
                className="rounded-[1.5rem] border border-white/10 bg-background/32 p-5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  {item.step}
                </p>
                <h3 className="mt-3 text-2xl text-foreground">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-18 sm:px-5 sm:py-20 md:px-8">
        <motion.div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16" {...reveal}>
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Что даёт сервис
            </p>
            <h2
              className="mt-4 max-w-md text-3xl leading-tight text-foreground sm:text-4xl md:text-5xl"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Понятный вход в реальный инструмент проверки.
            </h2>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {homeProof.map((item) => (
              <div
                key={item.title}
                className="grid gap-3 py-5 sm:py-6 md:grid-cols-[220px_1fr]"
              >
                <p className="text-lg text-foreground">{item.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
