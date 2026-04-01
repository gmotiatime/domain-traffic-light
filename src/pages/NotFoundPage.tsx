import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { routeHref } from "@/lib/site-router";

export function NotFoundPage() {
  return (
    <section className="relative isolate flex min-h-[calc(100vh-6rem)] w-full flex-col items-center justify-center overflow-hidden bg-black px-6 text-center">
      {/* Dynamic Background Noise/Glow */}
      <div className="absolute inset-0 z-0">
        <motion.div
           animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
           transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
           className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,63,94,0.1)_0%,transparent_60%)] blur-[60px]" 
        />
      </div>

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 40 },
          visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, delayChildren: 0.2, duration: 0.6 } }
        }}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex max-w-lg flex-col items-center"
      >
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}>
          <div className="relative flex h-24 w-12 flex-col items-center justify-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 py-3 shadow-[0_0_40px_rgba(244,63,94,0.2)]">
            <span className="absolute inset-0 rounded-full border border-rose-400/30 blur-[2px]"></span>
            <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse" />
            <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-white/[0.05]" />
            <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-white/[0.05]" />
          </div>
        </motion.div>

        <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mt-8 text-[8rem] font-bold leading-[0.85] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 sm:text-[10rem]">
          404
        </motion.h1>
        
        <motion.div variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }} className="mt-4 flex flex-col items-center">
          <p className="text-xl font-medium text-white/90 sm:text-2xl">
            Красный свет. Тупик.
          </p>
          <p className="mt-3 text-base leading-relaxed text-white/40 max-w-[280px] sm:max-w-xs text-balance">
            Кажется, вы свернули не туда. Маршрут не найден или был удалён.
          </p>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mt-10 flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <Button asChild className="h-12 w-full sm:w-auto rounded-xl bg-white text-black px-8 text-base font-semibold shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-white/90 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-[1.02] active:scale-95 group">
            <a href={routeHref("/")}>
              <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Вернуться на главную
            </a>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
