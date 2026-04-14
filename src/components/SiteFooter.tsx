import { navItems } from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

export function SiteFooter() {
  return (
    <footer className="mt-8 pb-8 sm:pb-12 md:pb-16 px-4 sm:px-5 md:px-8">
      <div className="liquid-glass mx-auto grid w-full max-w-7xl overflow-hidden rounded-[2rem] border border-foreground/[0.06] bg-background/40 p-8 md:grid-cols-[1fr_auto] md:p-10 lg:p-12 transition-all hover:border-foreground/[0.1] hover:shadow-[0_0_40px_rgba(255,255,255,0.02)] relative group">
        
        {/* subtle floating glow inside footer */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.02),transparent_60%)] opacity-0 transition-opacity duration-1000 group-hover:opacity-100" />
        
        <div className="max-w-xl relative z-10">
          <p className="flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground group-hover:drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5 border border-foreground/10 text-xs shadow-inner">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </span>
            Доменный светофор <span className="text-[0.6em] font-medium text-foreground/30 uppercase tracking-[0.2em] transform -translate-y-2">.ai</span>
          </p>
          <p className="mt-5 text-sm leading-relaxed text-foreground/50 sm:text-base">
            Конкурсный веб-проект про проверку доменов до ввода данных. Основной
            акцент — мгновенная пауза, безопасные учебные примеры и чистый
            минималистичный интерфейс.
          </p>
        </div>
        <div className="mt-10 flex flex-col gap-3.5 text-sm font-medium text-foreground/40 md:mt-0 md:items-end relative z-10">
          {navItems.map((item) => (
            <a key={item.path} href={routeHref(item.path)} className="transition-all hover:text-foreground hover:translate-x-1 md:hover:-translate-x-1">
              {item.label}
            </a>
          ))}
          <div className="mt-2 h-px w-12 bg-foreground/10 md:mr-0 md:ml-auto" />
          <a href={routeHref("/changelog")} className="transition-all hover:text-foreground hover:translate-x-1 md:hover:-translate-x-1">
            Changelog
          </a>
        </div>
      </div>
    </footer>
  );
}
