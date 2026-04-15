import { motion, MotionValue } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeroTitle } from "@/components/HeroTitle";
import { HeroSearchForm } from "@/components/HeroSearchForm";
import { heroVideo, homeManifest } from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.1 },
  transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] }, // Stronger ease-out
};

const stagger = {
  whileInView: { transition: { staggerChildren: 0.06 } }, // Faster stagger
  viewport: { once: true },
};

export function HeroSection({ orb1Y, orb2Y }: { orb1Y: MotionValue<number>; orb2Y: MotionValue<number> }) {
  return (
    <section className="relative isolate min-h-[90svh] overflow-hidden">
      {/* Background Video & Overlays */}
      <video
        autoPlay
        className="absolute inset-0 z-0 h-full w-full object-cover scale-105"
        loop
        muted
        playsInline
        src={heroVideo}
      />
      <div className="absolute inset-0 z-[1] bg-black/40 dark:bg-background/70" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/20 to-background dark:to-black" />

      {/* Animated Mesh Orbs (Hero Only) */}
      <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
        <motion.div style={{ y: orb1Y }} className="absolute -top-[10%] left-[10%] h-[700px] w-[700px]">
          <motion.div
            animate={{ x: [0, 40, -30, 0], y: [0, -50, 30, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-blue-500/10 opacity-40 blur-[150px]"
          />
        </motion.div>
        <motion.div style={{ y: orb2Y }} className="absolute bottom-0 right-[5%] h-[600px] w-[600px]">
          <motion.div
            animate={{ x: [0, -40, 30, 0], y: [0, 50, -30, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-full rounded-full bg-violet-500/10 opacity-30 blur-[120px]"
          />
        </motion.div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[90svh] w-full max-w-7xl flex-col items-center justify-center px-4 pb-20 pt-32 text-center sm:px-6">
        <motion.div
          variants={stagger}
          initial="initial"
          whileInView="whileInView"
          className="max-w-5xl"
        >
          <motion.p variants={fadeUp} className="text-xs font-medium uppercase tracking-[0.26em] text-foreground/50 sm:text-sm">
            Мгновенный AI Анализатор Доменов
          </motion.p>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-6xl md:text-7xl lg:text-[84px]"
          >
            <HeroTitle />
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-foreground/60 sm:text-lg">
            Проверяйте ссылки до ввода паролей. Сервис показывает уровень риска и объясняет, почему домен подозрительный.
          </motion.p>

          <motion.div variants={fadeUp} className="mx-auto mt-12 w-full max-w-3xl">
            <HeroSearchForm />

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
                {homeManifest.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 text-sm text-foreground/50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-foreground/40" />
                    {item}
                  </span>
                ))}
              </div>

              <Button asChild className="h-10 px-0 text-sm text-foreground/50 hover:text-foreground hover:bg-transparent" variant="ghost">
                <a href={routeHref("/method")}>Как работает проверка</a>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
