import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Sparkles, Database, Search, ArrowRight, ChevronLeft, ChevronRight, Play, Cpu, Globe, Lock } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { routeHref } from "@/lib/site-router";

const slides = [
  {
    id: "intro",
    title: "Доменный светофор.AI",
    subtitle: "Проверка ссылок перед кликом",
    content: (
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="flex items-center justify-center gap-6 mb-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
            className="h-20 w-20 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            <ShieldCheck className="h-10 w-10 text-emerald-400" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="h-20 w-20 rounded-[2rem] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)]"
          >
            <Search className="h-10 w-10 text-amber-400" />
          </motion.div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
            className="h-20 w-20 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.2)]"
          >
            <ShieldAlert className="h-10 w-10 text-rose-400" />
          </motion.div>
        </div>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-2xl md:text-4xl text-foreground/80 max-w-3xl font-light leading-relaxed"
        >
          Умный AI-инструмент для подростков, помогающий <span className="text-emerald-400 font-medium">распознать фишинг</span> и избежать потери данных.
        </motion.p>
      </div>
    )
  },
  {
    id: "problem",
    title: "Актуальность",
    subtitle: "Почему это важно именно сейчас",
    content: (
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl text-left">
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="rounded-[2.5rem] border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent p-10 flex flex-col justify-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="h-32 w-32 text-rose-500" />
          </div>
          <div className="h-16 w-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-8 border border-rose-500/30">
            <ShieldAlert className="h-8 w-8 text-rose-400" />
          </div>
          <h3 className="text-3xl font-semibold mb-4 text-white">Рост киберпреступности</h3>
          <p className="text-white/70 text-xl leading-relaxed">
            Подростки часто становятся жертвами скама в играх (Roblox, Steam), при покупке игровой валюты или переходе по ссылкам от "друзей" в мессенджерах.
          </p>
        </motion.div>
        <motion.div
          whileHover={{ y: -5, scale: 1.02 }}
          className="rounded-[2.5rem] border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-10 flex flex-col justify-center relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Search className="h-32 w-32 text-amber-500" />
          </div>
          <div className="h-16 w-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-8 border border-amber-500/30">
            <Search className="h-8 w-8 text-amber-400" />
          </div>
          <h3 className="text-3xl font-semibold mb-4 text-white">Сложность анализа</h3>
          <p className="text-white/70 text-xl leading-relaxed">
            Антивирусы не всегда успевают блокировать свежие сайты (typo-squatting). Сложный технический язык отчетов отталкивает молодых пользователей.
          </p>
        </motion.div>
      </div>
    )
  },
  {
    id: "solution",
    title: "Наше решение",
    subtitle: "Архитектура проекта",
    content: (
      <div className="grid md:grid-cols-3 gap-8 w-full max-w-6xl">
        <motion.div whileHover={{ y: -5 }} className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center flex flex-col items-center backdrop-blur-xl">
          <div className="h-20 w-20 rounded-3xl bg-white/10 flex items-center justify-center mb-6 shadow-inner border border-white/20">
            <Search className="h-10 w-10 text-white/80" />
          </div>
          <h4 className="text-2xl font-semibold mb-4 text-white">Мгновенный чек</h4>
          <p className="text-lg text-white/60 leading-relaxed">Мгновенная локальная проверка эвристикой: подозрительные TLD, длина домена, опечатки брендов (typo-squatting).</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="rounded-[2rem] border border-violet-500/30 bg-violet-500/10 p-8 text-center flex flex-col items-center backdrop-blur-xl shadow-[0_0_40px_rgba(139,92,246,0.15)]">
          <div className="h-20 w-20 rounded-3xl bg-violet-500/20 flex items-center justify-center mb-6 shadow-inner border border-violet-500/30">
            <Sparkles className="h-10 w-10 text-violet-300" />
          </div>
          <h4 className="text-2xl font-semibold mb-4 text-violet-100">AI-Анализ</h4>
          <p className="text-lg text-violet-200/70 leading-relaxed">Нейросети LLaMA 3.3 через Groq API анализируют сложные паттерны и формируют простые объяснения для пользователя.</p>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="rounded-[2rem] border border-emerald-500/30 bg-emerald-500/10 p-8 text-center flex flex-col items-center backdrop-blur-xl shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <div className="h-20 w-20 rounded-3xl bg-emerald-500/20 flex items-center justify-center mb-6 shadow-inner border border-emerald-500/30">
            <Database className="h-10 w-10 text-emerald-400" />
          </div>
          <h4 className="text-2xl font-semibold mb-4 text-emerald-100">Глобальная база</h4>
          <p className="text-lg text-emerald-200/70 leading-relaxed">Redis кэширование на Upstash для моментальных ответов, проверка по OpenPhish и сбор обратной связи.</p>
        </motion.div>
      </div>
    )
  },
  {
    id: "tech",
    title: "Стек технологий",
    subtitle: "Что под капотом",
    content: (
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">
        <motion.div whileHover={{ scale: 1.02 }} className="flex gap-6 items-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
            <Globe className="h-8 w-8 text-blue-400" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-white mb-2">Frontend</h4>
            <p className="text-white/60">React 18 + Vite, TypeScript, Tailwind CSS, Framer Motion для плавных UI/UX анимаций.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="flex gap-6 items-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <Database className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-white mb-2">Backend & База</h4>
            <p className="text-white/60">Node.js (Express) + Vercel Serverless, Upstash Redis для Threat Cache базы и статистики.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="flex gap-6 items-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
            <Cpu className="h-8 w-8 text-violet-400" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-white mb-2">AI-Провайдер</h4>
            <p className="text-white/60">Groq API с моделями LLaMA 3.3 (70B), оптимизированными для сверхбыстрого вывода.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="flex gap-6 items-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <Lock className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h4 className="text-2xl font-semibold text-white mb-2">Кибербезопасность</h4>
            <p className="text-white/60">Интеграция с комьюнити фидами OpenPhish и локальный TLD/Punycode эвристический анализ.</p>
          </div>
        </motion.div>
      </div>
    )
  },
  {
    id: "demo",
    title: "Демонстрация",
    subtitle: "Работа в реальном времени",
    content: (
      <div className="w-full max-w-3xl text-center space-y-12">
        <div className="p-10 rounded-[3rem] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent backdrop-blur-2xl shadow-[0_0_80px_rgba(16,185,129,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-50" />
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/40 blur-[50px] rounded-full" />
              <ShieldCheck className="h-28 w-28 text-emerald-400 relative z-10" />
            </div>
          </div>
          <p className="text-2xl text-emerald-100/90 mb-10 font-light leading-relaxed">
            Проверьте подозрительную ссылку и посмотрите, как AI объясняет свое решение <span className="font-semibold text-white">простым языком</span>.
          </p>
          <a
            href={routeHref("/analyzer")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-4 rounded-full bg-emerald-400 text-emerald-950 px-12 py-5 text-xl font-bold transition-all hover:scale-105 hover:bg-emerald-300 hover:shadow-[0_0_50px_rgba(52,211,153,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Play className="h-6 w-6 fill-current" />
            Запустить анализатор
          </a>
        </div>
      </div>
    )
  },
  {
    id: "future",
    title: "Развитие & Улучшения",
    subtitle: "Что мы внедрили к конкурсу",
    content: (
      <div className="w-full max-w-4xl text-left space-y-6">
        {[
          {
            title: "Улучшенные AI-объяснения",
            text: "Нейросеть теперь выдает 3-5 четких причин вердикта на понятном подросткам языке с подсветкой критичных угроз.",
            icon: Sparkles,
            color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20"
          },
          {
            title: "Система жалоб и Feedback",
            text: "Добавлена кнопка «Неверный вердикт?». Пользователи помогают обучать систему, сообщая об ошибках.",
            icon: ArrowRight,
            color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20"
          },
          {
            title: "Предсказание новых угроз",
            text: "Мощная админ-панель автоматически выявляет «Подозрительные паттерны», анализируя жалобы на безопасные домены.",
            icon: Search,
            color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20"
          }
        ].map((item, i) => (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 + 0.3 }}
            key={i}
            className="flex gap-6 items-center rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border ${item.border} ${item.bg}`}>
              <item.icon className={`h-8 w-8 ${item.color}`} />
            </div>
            <div>
              <h4 className="text-2xl font-semibold text-white mb-2">{item.title}</h4>
              <p className="text-lg text-white/60 leading-relaxed">{item.text}</p>
            </div>
          </motion.div>
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
    <div className="fixed inset-0 bg-[#020202] text-white overflow-hidden flex flex-col font-sans">
      <div className="absolute inset-0 z-0 opacity-40">
        <ParticleBackground />
      </div>

      <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vh] bg-emerald-500/10 blur-[120px] rounded-full z-0 pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vh] bg-violet-500/10 blur-[100px] rounded-full z-0 pointer-events-none mix-blend-screen" />

      <header className="relative z-10 flex justify-between items-center px-12 py-8">
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

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 md:px-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full flex flex-col items-center max-w-7xl mx-auto"
          >
            <div className="text-center mb-14">
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block mb-6 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-300 font-medium uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              >
                {slide.subtitle}
              </motion.span>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl md:text-7xl font-bold text-white tracking-tight"
              >
                {slide.title}
              </motion.h2>
            </div>

            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.4 }}
               className="w-full flex justify-center"
            >
              {slide.content}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 px-12 py-8 flex justify-between items-center">
        <button
          onClick={() => setCurrentSlide(prev => Math.max(prev - 1, 0))}
          aria-label="Предыдущий слайд"
          disabled={currentSlide === 0}
          className="p-3 rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              aria-label={`Перейти к слайду ${i + 1}`}
              className={`h-2 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${i === currentSlide ? 'w-8 bg-emerald-500' : 'w-2 bg-white/20'}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))}
          aria-label="Следующий слайд"
          disabled={currentSlide === slides.length - 1}
          className="p-3 rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </footer>
    </div>
  );
}
