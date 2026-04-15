import { GlassCard } from "@/components/GlassCard";
import { homeProof } from "@/lib/site-content";

export function HomeProofSection() {
  return (
    <section className="relative w-full bg-background pb-16 sm:pb-20 pt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <div className="mb-14">
          <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Что даёт сервис</p>
          <h2 className="mt-5 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Простой интерфейс, рабочий инструмент
          </h2>
        </div>

        <div className="grid gap-5 sm:gap-6 md:grid-cols-3">
          {homeProof.map((item, index) => {
            const cardColors = [
              'rgba(250,204,21,0.08)', // Yellow for speed
              'rgba(59,130,246,0.08)', // Blue for verified
              'rgba(168,85,247,0.08)'  // Purple for global network
            ];
            return (
              <GlassCard key={item.title} delay={index * 0.1} className="overflow-hidden p-0" glow={`radial-gradient(circle at 50% 100%, ${cardColors[index]}, transparent 60%)`}>
                <div className="p-8 pb-2">
                  <h3 className="text-xl font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-foreground/50">
                    {item.text}
                  </p>
                </div>
                <div className="px-8 pb-8 pt-4">
                  {index === 0 && (
                    <img alt="Быстрый старт" className="h-48 w-full object-contain mix-blend-screen" src="/speed-fast.svg?v=4" />
                  )}
                  {index === 1 && (
                    <img alt="Объяснимый результат" className="h-48 w-full object-contain mix-blend-screen" src="/verified-check.svg?v=4" />
                  )}
                  {index === 2 && (
                    <img alt="Безопасная публикация" className="h-48 w-full object-contain mix-blend-screen" src="/global-network.svg?v=4" />
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
