# Real Estate CRM

CRM для риелторов и небольших агентств недвижимости. Закрывает базовые рабочие сценарии: ведение клиентов, объектов, сделок и задач, дашборд с KPI, канбан-воронка сделок, журнал активности по каждому клиенту и сделке, автоматический подбор объектов под клиента и follow-up подсказки «что не сделано».

> **Что важно для рекрутёра:** проект собран как полноценный продукт. Server Components + Server Actions, RLS на каждой таблице, audit-log таблица с триггерами в server actions, чистые функции с покрытием Vitest, CI на GitHub Actions, миграции с обратной совместимостью.


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

## Возможности

### Базовый CRM

- Авторизация через Supabase (login/register/logout, защита маршрутов в `middleware`).
- Роли `admin` и `agent`, разграничение прав через RLS-политики (admin видит всё, agent — только свои назначенные/созданные записи).
- Дашборд: KPI-карточки, график доходности по месяцам, разбивка воронки, ближайшие задачи и последние клиенты.
- Клиенты: список с поиском и фильтрами, карточка с CRUD, связанными сделками и задачами, удаление через диалог.
- Объекты: каталог карточек, фильтры, карточка объекта с описанием и характеристиками, обложка из Unsplash.
- Сделки: drag-and-drop канбан-воронка по 6 этапам, оптимистичный апдейт с rollback при ошибке, карточка сделки.
- Задачи: список с фильтрами «мои/все», статусы, приоритеты, дедлайны, привязка к клиенту/сделке/объекту, быстрый чекбокс «выполнено».
- Команда: страница для админа со сменой ролей.
- Настройки профиля + загрузка аватара в Supabase Storage.
- Адаптивный UI, тёмная и светлая тема, скелетоны, повторяющие финальную верстку, breadcrumbs на всех детальных страницах.

### Продвинутые фичи (специфичные для недвижимости)

- **Подбор объектов под клиента.** На карточке клиента есть вкладка «Подбор» — сервер фильтрует активные объекты по типу сделки клиента (`buy/sell/rent_in/rent_out`) и его бюджету и показывает релевантные карточки с пометкой «в бюджете».
- **Таймлайн активности (audit log).** Отдельная таблица `activities` со ссылками на клиента/сделку/объект. Каждое действие в server actions (create/update/stage_changed/task_completed/deleted) пишет туда событие. На карточках клиента и сделки появляется вкладка «Активность» с цветным таймлайном: что, кто и когда сделал.
- **Follow-up подсказки.** На дашборде виджет «Требует внимания»: клиенты без открытой задачи, сделки без движения 7+ дней, контракты без даты закрытия, просроченные задачи, «холодные» новые клиенты.
- **«Живые» карточки.** Топ-блок на карточке клиента/сделки показывает ответственного, ближайшую задачу («Следующее действие»), счётчики; быстрые действия — «Создать сделку» и «Создать задачу» через диалог с предзаполненным `client_id`.
- **Toast после успеха.** На update — прямо в форме, на create — через query-параметр на детальной странице.

### Качество

- TypeScript strict, Zod-валидация на сервере.
- Vitest-тесты на чистые функции (`parse`, `diff`, `matching`, `insights`).
- GitHub Actions CI: lint + typecheck + tests + build.
- Идемпотентные SQL-миграции (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- Скелетоны строятся по структуре финальной страницы — UI не «прыгает» при загрузке.
- Префетч маршрутов на наведение/фокус (`PrefetchLink`).

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
  actions/               — server actions для CRUD + activities (audit log)
  formatters.ts          — даты, валюта, инициалы
  constants.ts           — словари статусов и цветов
  types.ts               — типы доменных моделей (включая Activity)
  auth.ts                — requireUser/requireProfile
  parse.ts               — общий парсинг чисел и строк из FormData
  diff.ts                — сравнение полей "до/после" для журнала
  matching.ts            — подбор объектов под клиента (чистая функция)
  insights.ts            — расчёт follow-up подсказок (чистая функция)
supabase/
  schema.sql             — основная миграция: таблицы, индексы, RLS, Storage, триггеры
  storage.sql            — настройка bucket avatars для уже созданной БД
  seed.sql               — демо-данные (5 клиентов, 5 объектов, 4 сделки, 6 задач)
  migrations/
    0001_activities.sql  — таблица activities + RLS (для существующих БД)
    0002_rls_hardening.sql — усиление RLS-политик admin/agent
tests/                   — Vitest-тесты для чистых функций
.github/workflows/ci.yml — lint + typecheck + tests + build на каждом PR
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
3. Если `schema.sql` уже был выполнен раньше — для существующих БД дополнительно выполнить:
   - `supabase/migrations/0001_activities.sql` — добавит таблицу журнала событий.
   - `supabase/migrations/0002_rls_hardening.sql` — усилит RLS под admin/agent.
   - `supabase/storage.sql` — настроит bucket для аватаров.
4. В разделе `Authentication → Users → Add user` создать двух пользователей:
  - `admin@demo.local` / `demo1234`
  - `agent@demo.local` / `demo1234`
   (отметить `Auto Confirm User`, чтобы не подтверждать email).
5. Сделать первого пользователя админом: в SQL Editor выполнить
   ```sql
   update public.profiles set role = 'admin'
     where id = (select id from auth.users where email = 'admin@demo.local');
   ```
6. Выполнить `supabase/seed.sql` — он наполнит CRM реалистичными примерами (клиенты, объекты, сделки, задачи). Скрипт идемпотентен: если в `clients` уже что-то есть, он не перезапишет ваши данные.

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
npm run dev         # локальный dev-сервер
npm run build       # production build
npm run start       # запуск production-сборки
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest run
npm run test:watch  # Vitest watch-режим
```

## Тесты

Чистые функции покрыты Vitest:

- `tests/parse.test.ts` — парсинг чисел из FormData с пробелами.
- `tests/diff.test.ts` — сравнение «до/после» для journal-записей.
- `tests/matching.test.ts` — подбор объектов под клиента.
- `tests/insights.test.ts` — генерация follow-up подсказок.

Server actions покрываются ручным/интеграционным тестированием — для них нужен mocking Supabase, что для портфолио-проекта избыточно.

## CI

GitHub Actions пайплайн (`.github/workflows/ci.yml`) на каждом PR и push в main/master:

1. Lint (`next lint`)
2. Typecheck (`tsc --noEmit`)
3. Tests (`vitest run`)
4. Build (`next build` с заглушками для Supabase env)

## Возможные Улучшения (Roadmap)

- Календарь и интеграция с Google/Outlook
- Уведомления по email/Telegram о дедлайнах задач и движении сделок
- Загрузка медиа в Supabase Storage (для объектов)
- Экспорт клиентов и сделок в CSV/Excel
- E2E-тесты на Playwright (создание клиента → сделки → закрытие)
- Многоарендность (несколько агентств в одной БД)
- Парсинг ЦИАН/Авито
- Мобильная PWA

## Лицензия

MIT
