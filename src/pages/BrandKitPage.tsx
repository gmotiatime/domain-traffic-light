import { CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BrandKitPage() {
  return (
    <section className="relative min-h-[calc(100vh-6rem)] w-full bg-background px-4 pb-16 pt-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Brand Kit
          </h1>
          <p className="mt-4 text-lg text-foreground/60">
            Визуальный стиль, типографика и компоненты проекта.
          </p>
        </div>

        <div className="space-y-16">
          {/* Colors Section */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold border-b border-foreground/10 pb-2">
              Цветовая палитра
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <div className="h-24 w-full rounded-2xl bg-background border border-foreground/20 shadow-sm flex items-end p-3">
                  <span className="text-xs font-mono text-foreground/50">Background</span>
                </div>
                <div>
                  <div className="font-medium">Background</div>
                  <div className="text-sm text-foreground/50">Основной фон (тёмный)</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-24 w-full rounded-2xl bg-foreground shadow-sm flex items-end p-3">
                  <span className="text-xs font-mono text-background/50">Foreground</span>
                </div>
                <div>
                  <div className="font-medium">Foreground</div>
                  <div className="text-sm text-foreground/50">Текст и акценты (светлый)</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-24 w-full rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-end p-3">
                  <span className="text-xs font-mono text-white/50">Cards / Surfaces</span>
                </div>
                <div>
                  <div className="font-medium">Surface</div>
                  <div className="text-sm text-foreground/50">Фон карточек и панелей</div>
                </div>
              </div>
            </div>

            <h3 className="mt-8 mb-4 text-lg font-medium">Вердикты (Светофор)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-green-400">Low Risk</div>
                  <div className="text-sm text-green-400/60">Безопасно</div>
                </div>
              </div>
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-yellow-400">Medium Risk</div>
                  <div className="text-sm text-yellow-400/60">Подозрительно</div>
                </div>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-semibold text-red-400">High Risk</div>
                  <div className="text-sm text-red-400/60">Опасно</div>
                </div>
              </div>
            </div>
          </section>

          {/* Typography Section */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold border-b border-foreground/10 pb-2">
              Типографика
            </h2>
            <div className="space-y-8 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
              <div>
                <div className="text-sm text-foreground/40 mb-2">Heading 1 / 4xl-5xl</div>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Доменный светофор</h1>
              </div>
              <div>
                <div className="text-sm text-foreground/40 mb-2">Heading 2 / 3xl</div>
                <h2 className="text-3xl font-semibold tracking-tight">Анализ безопасности ссылок</h2>
              </div>
              <div>
                <div className="text-sm text-foreground/40 mb-2">Heading 3 / 2xl</div>
                <h3 className="text-2xl font-medium tracking-tight">Как работает оценка риска</h3>
              </div>
              <div>
                <div className="text-sm text-foreground/40 mb-2">Body / base</div>
                <p className="text-base leading-relaxed text-foreground/80 max-w-2xl">
                  Мы используем искусственный интеллект для проверки доменов на наличие признаков фишинга, скама и вредоносного контента. Система анализирует структуру URL, историю регистрации и множество других факторов.
                </p>
              </div>
              <div>
                <div className="text-sm text-foreground/40 mb-2">Caption / sm</div>
                <p className="text-sm text-foreground/50">
                  Этот инструмент создан в образовательных целях. Результаты анализа носят рекомендательный характер.
                </p>
              </div>
            </div>
          </section>

          {/* UI Components Section */}
          <section>
            <h2 className="mb-6 text-2xl font-semibold border-b border-foreground/10 pb-2">
              UI Компоненты
            </h2>

            <div className="space-y-12">
              {/* Buttons */}
              <div>
                <h3 className="mb-4 text-lg font-medium">Кнопки</h3>
                <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
                  <Button>Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>

              {/* Inputs */}
              <div>
                <h3 className="mb-4 text-lg font-medium">Поля ввода</h3>
                <div className="max-w-md space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
                  <div>
                    <label className="mb-2 block text-sm font-medium">Стандартный инпут</label>
                    <input
                      type="text"
                      placeholder="Введите домен..."
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/50">С ошибкой</label>
                    <input
                      type="text"
                      defaultValue="неправильный формат"
                      className="w-full rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-100 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Badges / Chips */}
              <div>
                <h3 className="mb-4 text-lg font-medium">Бейджи</h3>
                <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/60">
                    Стандартный
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                    Успех
                  </span>
                  <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                    Внимание
                  </span>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </section>
  );
}
