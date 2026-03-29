import { navItems } from "@/lib/site-content";
import { routeHref } from "@/lib/site-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 md:grid-cols-[1fr_auto] md:px-8">
        <div>
          <p
            className="text-2xl text-foreground"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Доменный светофор
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Конкурсный веб-проект про проверку доменов до ввода данных. Основной
            акцент — понятный интерфейс, безопасные учебные примеры и отсутствие
            лишней инфраструктуры в MVP.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-4 text-sm text-muted-foreground md:justify-end">
          {navItems.map((item) => (
            <a key={item.path} href={routeHref(item.path)}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
