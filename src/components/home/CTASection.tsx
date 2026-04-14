import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";

export function CTASection() {
  return (
    <section className="relative w-full bg-background py-16 pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <GlassCard className="flex flex-col items-center justify-center p-12 text-center sm:p-20" glow="radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.05) 0%, transparent 70%)">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Есть подозрительная ссылка?</h2>
          <p className="mt-5 max-w-xl text-lg text-foreground/50">
            Вставьте её и посмотрите, что найдет анализатор.
          </p>
          <Button
            className="mt-10 h-14 w-full sm:w-auto shrink-0 rounded-[1.5rem] bg-foreground text-black px-10 text-base font-bold tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-300 hover:bg-foreground hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-[1.05] active:scale-95"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
              document.getElementById('domain-input')?.focus();
            }}
          >
            Начать анализ
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </GlassCard>
      </div>
    </section>
  );
}
