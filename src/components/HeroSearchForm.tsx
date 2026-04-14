import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { writeAnalyzerPrefill } from "@/lib/analyzer-prefill";
import { routeHref } from "@/lib/site-router";

export function HeroSearchForm() {
  const [heroInput, setHeroInput] = useState("");
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);

  const placeholders = [
    "Вставьте домен или ссылку...",
    "Какую ссылку проверим сегодня? 🐾",
    "Чую подозрительный URL...",
    "https://suspicious-site.com",
    "Бросайте ссылку, я поймаю!"
  ];

  useEffect(() => {
    const placeholderInterval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 4000);

    return () => clearInterval(placeholderInterval);
  }, [placeholders.length]);

  function openAnalyzerWithInput(input: string) {
    writeAnalyzerPrefill(input);
    window.location.hash = routeHref("/analyzer");
  }

  return (
    <form
      className="relative flex flex-col items-center gap-3 sm:flex-row sm:gap-2 rounded-[2.5rem] border border-foreground/10 bg-foreground/[0.03] p-2.5 backdrop-blur-3xl transition-all duration-300 hover:bg-foreground/[0.05] focus-within:border-foreground/20 focus-within:bg-foreground/[0.06] focus-within:shadow-[0_0_50px_rgba(255,255,255,0.07)]"
      onSubmit={(event) => {
        event.preventDefault();
        openAnalyzerWithInput(heroInput);
      }}
    >
      <div className="flex flex-1 items-center gap-3 px-4 w-full h-14 relative z-20">
        <Globe className="h-6 w-6 shrink-0 text-foreground/40 transition-colors group-focus-within:text-foreground/70" />
        <div className="relative w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPlaceholder}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 flex items-center text-xl text-foreground/30"
            >
              {!heroInput && placeholders[currentPlaceholder]}
            </motion.div>
          </AnimatePresence>
          <input
            id="domain-input"
            aria-label="Введите домен или ссылку для проверки"
            className="w-full bg-transparent text-xl font-medium text-foreground outline-none relative z-10 transition-shadow focus:drop-shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            onChange={(event) => setHeroInput(event.target.value)}
            value={heroInput}
          />
        </div>
      </div>
      <Button className="h-14 w-full sm:w-auto shrink-0 rounded-[1.5rem] bg-foreground text-black px-8 text-base font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 hover:bg-foreground hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-95" type="submit">
        Анализ
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </form>
  );
}
