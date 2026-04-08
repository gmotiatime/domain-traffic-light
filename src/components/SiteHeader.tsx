import { useState } from "react";

import { motion } from "framer-motion";
import { Menu, Moon, Shield, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { navItems } from "@/lib/site-content";
import { routeHref, type SitePath } from "@/lib/site-router";

type SiteHeaderProps = {
  activePath: SitePath;
};

function navLinkClass(active: boolean) {
  return [
    "relative px-4 py-2 rounded-[1rem] whitespace-nowrap text-sm font-medium transition-colors",
    active 
      ? "text-white bg-white/5" 
      : "text-white/50 hover:text-white hover:bg-white/[0.03]",
  ].join(" ");
}

export function SiteHeader({ activePath }: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-5 sm:pt-5 md:px-8 md:pt-6">
        <div
          className="liquid-glass overflow-hidden rounded-[1.75rem] bg-background/50 px-4 py-3 sm:px-5 md:px-6 md:py-4"
        >
          <div className="flex items-center justify-between gap-4">
            <a
              className="flex min-w-0 items-center gap-3 text-foreground"
              href={routeHref("/")}
              onClick={() => setIsMenuOpen(false)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/5">
                <Shield className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 items-end gap-1.5">
                <span className="truncate text-[1.05rem] font-bold tracking-[-0.03em] sm:text-[1.15rem] md:text-[1.28rem] bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                  Доменный светофор
                </span>
                <span className="mb-0.5 shrink-0 text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground sm:text-[0.68rem]">
                  .ai
                </span>
              </span>
            </a>

            <nav className="hidden items-center gap-2 lg:flex">
              {navItems.map((item) => {
                const active = item.path === activePath;
                return (
                  <a
                    key={item.path}
                    className={navLinkClass(active)}
                    href={routeHref(item.path)}
                  >
                    {item.label}
                    {active && (
                      <motion.div
                        layoutId="active-nav-indicator"
                        className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-white shadow-[0_0_10px_hsl(var(--color-white)/0.8)]"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                      />
                    )}
                  </a>
                );
              })}
            </nav>

            <div className="hidden lg:flex lg:items-center lg:gap-2">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-white/70" /> : <Moon className="h-4 w-4 text-white/70" />}
              </button>
              <Button asChild className="h-10 rounded-xl bg-white text-black px-5 text-sm font-bold tracking-tight transition-all duration-300 hover:bg-white hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_hsl(var(--color-white)/0.15)] hover:shadow-[0_0_25px_hsl(var(--color-white)/0.3)]">
                <a href={routeHref("/analyzer")}>
                  Открыть анализатор
                </a>
              </Button>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-white/70" /> : <Moon className="h-4 w-4 text-white/70" />}
              </button>
              <button
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition-colors hover:bg-white/10"
                onClick={() => setIsMenuOpen((value) => !value)}
                type="button"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isMenuOpen ? (
            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-background/40 p-3 lg:hidden">
              <nav className="grid gap-2">
                {navItems.map((item) => {
                  const active = item.path === activePath;
                  return (
                    <a
                      key={item.path}
                      className={[
                        "rounded-[1rem] border px-4 py-3 text-sm transition-colors",
                        active
                          ? "border-white/18 bg-white/10 text-foreground"
                          : "border-white/8 bg-transparent text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                      href={routeHref(item.path)}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-3">
                <Button asChild className="w-full rounded-xl bg-white text-black font-bold shadow-[0_0_15px_hsl(var(--color-white)/0.15)]">
                  <a href={routeHref("/analyzer")} onClick={() => setIsMenuOpen(false)}>
                    Открыть анализатор
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
