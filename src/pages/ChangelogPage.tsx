import { GitCommit, Star, Sparkles } from "lucide-react";

const changelogData = [
  {
    version: "v1.2.0",
    date: "Апрель 2026",
    title: "Возврат Next.js-структуры",
    changes: [
      "Восстановлены удалённые файлы app/layout, app/page, app/globals.css, next.config.js и next-env.d.ts.",
      "Отменены случайные удаления в обеих реализациях layout/page (.js, .jsx, .tsx).",
      "Проект снова собирается вокруг исходной Next.js-структуры.",
      "Серия revert-коммитов зафиксирована в changelog.",
    ],
    icon: Sparkles,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    version: "v1.1.0",
    date: "Апрель 2026",
    title: "Сужение конфигурации TypeScript",
    changes: [
      "tsconfig.json теперь включает только app/**/*.ts(x), src/pages/**/*.ts(x) и .next/types/**/*.ts.",
      "Из сборки исключены presentation-remotion, video-remotion, scripts, server и api.",
      "Меньше лишних файлов попадает в проверку TypeScript.",
      "Настройки проекта стали точнее для основной кодовой базы.",
    ],
    icon: Star,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    version: "v1.0.0",
    date: "Апрель 2026",
    title: "Переезд на Vite и новую структуру приложения",
    changes: [
      "package.json переведён на Vite-сценарии dev:web, dev:api, preview и test.",
      "Добавлены зависимости для Express, React Three Fiber, Upstash Redis, Framer Motion и Vercel Analytics.",
      "Обновлены страницы Admin, Analyzer, Brand Kit, Changelog, Home, Method, NotFound, Presentation и Safety.",
      "Tailwind и TypeScript конфиги синхронизированы с новой архитектурой.",
    ],
    icon: GitCommit,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
];

export function ChangelogPage() {
  return (
    <section className="relative min-h-[calc(100vh-6rem)] w-full bg-background px-4 pb-16 pt-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/60 mb-4">
            <GitCommit className="h-3.5 w-3.5" />
            История обновлений
          </div>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Changelog
          </h1>
          <p className="mt-4 text-lg text-foreground/60 max-w-2xl">
            Следите за развитием проекта. Здесь мы публикуем информацию о новых функциях, улучшениях и исправлениях.
          </p>
        </div>

        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
          {changelogData.map((release, index) => {
            const Icon = release.icon;
            return (
              <div key={release.version} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Timeline Marker */}
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border ${release.borderColor} ${release.bgColor} shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(0,0,0,0.2)] z-10 relative`}>
                  <Icon className={`w-5 h-5 ${release.color}`} />
                </div>

                {/* Content Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.04]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h3 className="text-xl font-bold text-white">{release.title}</h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-0.5 rounded-full bg-white/10 ${release.color} font-medium`}>{release.version}</span>
                      <span className="text-white/40">{release.date}</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {release.changes.map((change, i) => (
                      <li key={i} className="flex gap-3 text-white/70 text-sm md:text-base leading-relaxed">
                        <span className="text-white/20 mt-1.5">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
