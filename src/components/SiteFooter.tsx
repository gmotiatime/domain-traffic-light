import { navItems } from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

export function SiteFooter() {
  return (
    <footer className="mt-8 pb-8 sm:pb-12 md:pb-16 px-4 sm:px-5 md:px-8">
      <div className="liquid-glass mx-auto grid w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-8 md:grid-cols-[1fr_auto] md:p-10 lg:p-12">
        <div className="max-w-xl">
          <p className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs">●</span>
            Доменный светофор
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/50 sm:text-base">
            Конкурсный веб-проект про проверку доменов до ввода данных. Основной
            акцент — мгновенная пауза, безопасные учебные примеры и чистый
            минималистичный интерфейс.
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-3 text-sm font-medium text-white/50 md:mt-0 md:items-end">
          {navItems.map((item) => (
            <a key={item.path} href={routeHref(item.path)} className="transition-colors hover:text-white">
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
