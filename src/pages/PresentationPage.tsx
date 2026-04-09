import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Sparkles, Database, Search, ArrowRight, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground";
import Dither from "@/components/Dither";
import Beams from "@/components/Beams";
import { routeHref } from "@/lib/site-router";

const slides = [
  {
    id: "intro",
    title: "Доменный светофор",
    subtitle: "Проверка ссылок перед кликом",
    content: (
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Search className="h-8 w-8 text-amber-400" />
          </div>
          <div className="h-16 w-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-rose-400" />
          </div>
        </div>
        <p className="text-xl md:text-3xl text-foreground/70 max-w-2xl font-light leading-relaxed">
          Простой и понятный инструмент для подростков, который помогает распознать фишинг и мошеннические сайты.
        </p>
      </div>
    )
  },
  {
    id: "problem",
    title: "Проблема",
    subtitle: "Почему это важно",
    content: (
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl text-left">
        <div className="rounded-[2rem] border border-rose-500/20 bg-rose-500/5 p-8 flex flex-col justify-center">
          <ShieldAlert className="h-12 w-12 text-rose-400 mb-6" />
          <h3 className="text-2xl font-semibold mb-4 text-foreground">Рост киберпреступности</h3>
          <p className="text-foreground/70 text-lg leading-relaxed">
            Подростки часто становятся жертвами скама в играх (Roblox, Steam), при покупке игровой валюты или переходе по ссылкам в мессенджерах.
          </p>
        </div>
        <div className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-8 flex flex-col justify-center">
          <Search className="h-12 w-12 text-amber-400 mb-6" />
          <h3 className="text-2xl font-semibold mb-4 text-foreground">Сложность анализа</h3>
          <p className="text-foreground/70 text-lg leading-relaxed">
            Обычные антивирусы не всегда успевают блокировать новые сайты (typo-squatting). Нужен быстрый анализ "на лету" понятным языком.
          </p>
        </div>
      </div>
    )
  },
  {
    id: "solution",
    title: "Наше решение",
    subtitle: "Как работает система",
    content: (
      <div className="grid md:grid-cols-3 gap-6 w-full max-w-5xl">
        <div className="rounded-[2rem] border border-foreground/[0.06] bg-foreground/[0.02] p-6 text-center flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-foreground/60" />
          </div>
          <h4 className="text-xl font-medium mb-3">Локальный анализ</h4>
          <p className="text-sm text-foreground/60">Быстрая проверка по правилам: TLD, длина, цифры, опечатки брендов.</p>
        </div>
        <div className="rounded-[2rem] border border-violet-500/20 bg-violet-500/5 p-6 text-center flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
            <Sparkles className="h-6 w-6 text-violet-400" />
          </div>
          <h4 className="text-xl font-medium mb-3 text-violet-100">AI Модели</h4>
          <p className="text-sm text-violet-200/60">Нейросети LLaMA и Groq анализируют контекст и выдают простое объяснение.</p>
        </div>
        <div className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-6 text-center flex flex-col items-center">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Database className="h-6 w-6 text-emerald-400" />
          </div>
          <h4 className="text-xl font-medium mb-3 text-emerald-100">База знаний</h4>
          <p className="text-sm text-emerald-200/60">Общий кэш результатов (Upstash Redis) и данные OpenPhish.</p>
        </div>
      </div>
    )
  },
  {
    id: "demo",
    title: "Демонстрация",
    subtitle: "Попробуйте сами",
    content: (
      <div className="w-full max-w-2xl text-center space-y-8">
        <p className="text-xl text-foreground/70">
          Давайте проверим подозрительный домен в реальном времени.
        </p>
        <a
          href={routeHref("/analyzer")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 rounded-full bg-foreground text-background px-8 py-4 text-lg font-medium transition-transform hover:scale-105"
        >
          <Play className="h-5 w-5" />
          Открыть анализатор
        </a>
      </div>
    )
  },
  {
    id: "future",
    title: "Планы развития",
    subtitle: "Что дальше",
    content: (
      <div className="w-full max-w-3xl text-left space-y-6">
        {[
          { title: "Обучение на Feedback", text: "Сбор жалоб пользователей для улучшения алгоритмов предсказания новых паттернов." },
          { title: "Браузерное расширение", text: "Автоматическое предупреждение при переходе на опасный сайт." },
          { title: "Интеграция с мессенджерами", text: "Telegram-бот для быстрой проверки ссылок прямо в чате." }
        ].map((item, i) => (
          <div key={i} className="flex gap-4 items-start rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 text-sm font-medium">
              {i + 1}
            </div>
            <div>
              <h4 className="text-lg font-medium text-foreground">{item.title}</h4>
              <p className="mt-1 text-foreground/60">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }
];

export function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide(prev => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 bg-[#050505] overflow-hidden flex flex-col">
      <div className="absolute inset-0 z-0">
        <ParticleBackground />
        <Dither />
        <Beams />
      </div>

      <header className="relative z-10 flex justify-between items-center p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg">
            <div className="h-3 w-3 rounded-full bg-white shadow-inner" />
          </div>
          <span className="font-bold tracking-tight text-white/80">СВЕТОФОР</span>
        </div>
        <div className="text-white/40 text-sm font-medium uppercase tracking-widest">
          Слайд {currentSlide + 1} / {slides.length}
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 md:p-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex flex-col items-center"
          >
            <div className="text-center mb-12">
              <span className="inline-block mb-4 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-white/60 uppercase tracking-widest">
                {slide.subtitle}
              </span>
              <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">
                {slide.title}
              </h2>
            </div>

            {slide.content}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 p-8 flex justify-between items-center">
        <button
          onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
          disabled={currentSlide === 0}
          className="p-3 rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
          disabled={currentSlide === slides.length - 1}
          className="p-3 rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </footer>
    </div>
  );
}
