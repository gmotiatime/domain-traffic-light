# Доменный светофор

Учебный конкурсный веб-проект для проверки доменов перед вводом данных.

## Что умеет

- отдельная главная страница с видео-hero
- рабочий экран анализа домена
- локальный fallback-анализатор
- AI-анализ через Groq backend proxy
- проверка по OpenPhish community feed
- страницы методики и безопасности

## Стек

- React + Vite + TypeScript
- Tailwind CSS
- Framer Motion
- Groq + OpenPhish threat-intel
- Express для локальной разработки
- Vercel Functions для продакшена

## Быстрый старт

1. Установите зависимости:

```bash
npm install
```

2. Создайте `.env.local` на основе `.env.example` и добавьте:

```env
GROQ_API_KEY=...
GROQ_MODELS=openai/gpt-oss-120b,llama-3.3-70b-versatile,llama-3.1-8b-instant
OPENPHISH_FEED_URL=https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt
OPENPHISH_REFRESH_MS=1800000
CORS_ORIGIN=http://localhost:5173
```

3. Запустите проект:

```bash
npm run dev
```

Это поднимет:

- фронтенд Vite
- локальный API proxy на `http://localhost:8787`

Если поднят только `vite`, без backend proxy, анализатор покажет `AI proxy выключен` и уйдёт в локальный fallback.

## Vercel

Проект подготовлен под **один Vercel-проект**:

- фронтенд собирается как `Vite`
- API живёт в `api/health.mjs`, `api/analyze.mjs`, `api/cache-stats.mjs`
- дополнительный внешний backend не нужен

### Что нужно один раз в Vercel

Добавить Environment Variables:

```env
GROQ_API_KEY=...
GROQ_MODELS=openai/gpt-oss-120b,llama-3.3-70b-versatile,llama-3.1-8b-instant
OPENPHISH_FEED_URL=https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt
OPENPHISH_REFRESH_MS=1800000
```

`VITE_API_BASE_URL` **не нужен**, если фронтенд и API деплоятся в одном Vercel-проекте.

### Что Vercel подхватит

- build command: `npm run build`
- output directory: `dist`
- serverless functions: `api/*.mjs`

### Важно

Без `GROQ_API_KEY` Vercel всё равно поднимет сайт, но AI-часть не заработает.
Секрет нельзя безопасно зашить в git — его нужно хранить в Vercel env.

## Отдельный фронтенд + отдельный backend

```env
VITE_API_BASE_URL=https://your-backend-domain.example.com
```

Тогда статический сайт будет ходить не в локальный `/api`, а в ваш внешний proxy.

## Продакшен

```bash
npm run build
npm run start
```

`start` поднимает локальный Express-сервер, который отдаёт `dist` и API `/api/analyze`.

## Безопасность

- ключ Groq храните только в `.env.local`
- `.env.local` не должен попадать в git
- клиент не обращается к Groq напрямую

## Диагностика AI

- `AI proxy выключен` — backend не поднят, нужен `npm run dev` или `npm run start`
- `Нужен API ключ` — нет `.env.local` или в нём пустой `GROQ_API_KEY`
- `Local fallback` — AI сейчас недоступен, поэтому сработал локальный ruleset

## Структура

- `src/pages/HomePage.tsx` — главная
- `src/pages/AnalyzerPage.tsx` — анализатор
- `src/lib/domain-analyzer.ts` — локальный fallback-анализатор
- `server/openrouter-proxy.mjs` — общий backend-код для локального Express и Vercel Functions
- `api/health.mjs` — Vercel health endpoint
- `api/analyze.mjs` — Vercel analyze endpoint
