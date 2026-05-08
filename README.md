# Real Estate CRM

Учебно-портфолио CRM для риелторов и небольших агентств недвижимости. Закрывает базовые рабочие сценарии: ведение клиентов, объектов, сделок и задач, дашборд с KPI и канбан-воронка сделок.

> Проект сделан как demo для портфолио и собеседований. Архитектура и стек выбраны так, чтобы было просто запустить, понятно читать код и легко обсуждать на интервью.

## Стек

- [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript
- [Supabase](https://supabase.com/) — Auth, PostgreSQL, Row Level Security, SSR
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query) для клиентских интерактивных списков
- [@dnd-kit](https://dndkit.com/) — drag-and-drop для канбана сделок
- [Recharts](https://recharts.org/) — графики на дашборде
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) — формы и валидация
- [Sonner](https://sonner.emilkowal.ski/) — toast-уведомления
- [next-themes](https://github.com/pacocoursey/next-themes) — светлая/тёмная тема
- [date-fns](https://date-fns.org/) — форматирование дат на русском

## Возможности MVP

- Авторизация через Supabase (login/register/logout, защита маршрутов в `middleware`).
- Роли `admin` и `agent`, разграничение прав через RLS-политики.
- Дашборд: KPI-карточки, график доходности по месяцам, разбивка воронки, ближайшие задачи и последние клиенты.
- Клиенты: список с поиском и фильтрами, карточка с CRUD, связанными сделками и задачами, удаление через диалог.
- Объекты: каталог карточек, фильтры, карточка объекта с описанием и характеристиками, обложка из Unsplash.
- Сделки: drag-and-drop канбан-воронка по 6 этапам, оптимистичный апдейт с rollback при ошибке, карточка сделки.
- Задачи: список с фильтрами «мои/все», статусы, приоритеты, дедлайны, привязка к клиенту/сделке/объекту, быстрый чекбокс «выполнено».
- Команда: страница для админа со сменой ролей.
- Настройки профиля.
- Адаптивный UI, тёмная и светлая тема, адекватные empty/loading/error состояния.

## Структура

```
app/
  (app)/                 — защищённая часть приложения
    dashboard/           — KPI и графики
    clients/             — список, форма, карточка клиента
    properties/          — каталог и карточка объекта
    deals/               — kanban-воронка и карточка сделки
    tasks/               — задачи + диалог создания
    team/                — управление ролями (admin)
    settings/            — профиль
  login/, register/      — публичные страницы
  layout.tsx             — корневой layout (theme + react-query + toaster)
components/
  ui/                    — shadcn-примитивы
  app-header.tsx         — верхняя панель
  app-sidebar.tsx        — боковая навигация
  page-header.tsx        — заголовок страницы
  providers/             — ThemeProvider, QueryProvider
lib/
  supabase/              — обёртки для browser/server/middleware
  actions/               — server actions для CRUD
  formatters.ts          — даты, валюта, инициалы
  constants.ts           — словари статусов и цветов
  types.ts               — типы доменных моделей
  auth.ts                — requireUser/requireProfile
supabase/
  schema.sql             — миграция: таблицы, индексы, RLS, триггеры
  seed.sql               — демо-данные
docs/
  real-estate-crm-spec.md — подробная спецификация MVP
```

## Запуск Локально

### 1. Клонировать и установить зависимости

```bash
git clone https://github.com/betteramsly/real-estate-crm.git
cd real-estate-crm
npm install
```

### 2. Создать Supabase project

1. Перейти на [supabase.com](https://supabase.com), создать новый бесплатный project.
2. В разделе `Project Settings → API` скопировать `Project URL` и `anon public key`.

### 3. Применить миграцию и seed

1. Открыть `Supabase Dashboard → SQL Editor`.
2. Выполнить весь файл `supabase/schema.sql` (создаст таблицы, RLS, триггеры).
3. В разделе `Authentication → Users → Add user` создать двух пользователей:
  - `admin@demo.local` / `demo1234`
  - `agent@demo.local` / `demo1234`
   (можно отметить `Auto Confirm User`).
4. Выполнить `supabase/seed.sql`. Скрипт назначит роль `admin` нужному пользователю и создаст демо-клиентов, объекты, сделки и задачи.

### 4. Настроить переменные окружения

Скопировать `.env.example` в `.env.local` и подставить значения:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Запустить приложение

```bash
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000) и войти под demo-аккаунтом.

## Демо-аккаунты


| Роль  | Email                                       | Пароль   |
| ----- | ------------------------------------------- | -------- |
| Admin | [admin@demo.local](mailto:admin@demo.local) | demo1234 |
| Agent | [agent@demo.local](mailto:agent@demo.local) | demo1234 |


> На странице логина есть кнопки «Admin» / «Agent», которые автоматически подставляют логин и пароль.

## Деплой На Vercel

1. Залить репозиторий на GitHub.
2. На [vercel.com](https://vercel.com) подключить репозиторий → New Project.
3. В `Environment Variables` добавить `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. В Supabase: `Authentication → URL Configuration` → добавить production URL Vercel в `Site URL` и `Redirect URLs`.
5. Деплой.

## Скрипты

```bash
npm run dev        # локальный dev-сервер
npm run build      # production build
npm run start      # запуск production-сборки
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Возможные Улучшения (Roadmap)

- Календарь и интеграция с Google/Outlook
- Уведомления по email/Telegram о дедлайнах задач и движении сделок
- Загрузка медиа в Supabase Storage
- Экспорт клиентов и сделок в CSV/Excel
- Полнотекстовый поиск через `pg_trgm`
- Тесты: Vitest + Playwright
- Многоарендность (несколько агентств в одной БД)
- Парсинг ЦИАН/Авито
- Мобильная PWA

## Лицензия

MIT