import { GlassCard } from "@/components/GlassCard";
import BorderGlow from "@/components/BorderGlow";
import { behaviorSteps } from "@/lib/site-content";

export function BehaviorLogicSection() {
  return (
    <section className="relative w-full bg-[#000000] py-16 sm:py-20 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 relative z-10">
        <GlassCard className="p-8 sm:p-12 md:p-14">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-foreground/40">Логика сервиса</p>
            <h2 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Три шага: <span className="text-foreground/50">остановка, проверка, решение</span>
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {behaviorSteps.map((item, i) => (
              <div key={item.step} className="flex flex-col">
                <BorderGlow
                  className="rounded-[2rem] h-full w-full border-white/5 shadow-2xl p-0 overflow-hidden"
                  borderRadius={32}
                  glowRadius={30}
                  fillOpacity={0}
                  backgroundColor="#000000"
                >
                  <div className="relative flex flex-col justify-between h-full w-full">
                    {/* Big glowing background number */}
                    <span className="absolute -top-6 -right-2 text-[10rem] font-bold leading-none text-foreground/[0.03] select-none pointer-events-none z-0">
                      {i + 1}
                    </span>

                    <div className="flex-1 p-8 relative z-10 lg:min-h-[220px]">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-xs font-bold text-foreground shadow-[0_0_15px_rgba(255,255,255,0.08)]">
                          {i + 1}
                        </span>
                        <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">{item.step}</p>
                      </div>
                      <h3 className="mt-6 text-2xl font-semibold text-foreground/90">{item.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-foreground/50 sm:text-base">
                        {item.text}
                      </p>
                    </div>

                    <div className="px-8 pb-8 mt-auto flex-shrink-0">
                      {i === 0 && (
                        <img
                          alt="Пауза"
                          className="h-48 w-full object-contain"
                          src="/pause-stop.svg?v=4"
                        />
                      )}
                      {i === 1 && (
                        <img
                          alt="Процесс проверки"
                          className="h-48 w-full object-contain"
                          src="/process-flow.svg?v=4"
                        />
                      )}
                      {i === 2 && (
                        <img
                          alt="Действие"
                          className="h-48 w-full object-contain"
                          src="/action-go.svg?v=4"
                        />
                      )}
                    </div>
                  </div>
                </BorderGlow>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
