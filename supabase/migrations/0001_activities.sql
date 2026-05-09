-- =============================================================
-- Migration: activities (audit log + activity timeline)
--
-- Добавляет таблицу activities для журнала событий по сущностям
-- (клиенты, сделки, объекты, задачи). Используется для двух целей:
--   1) Таймлайн активности на карточках клиента и сделки.
--   2) Audit log: кто и что менял.
--
-- Запустите этот файл в Supabase SQL Editor (или supabase db push).
-- =============================================================

create table if not exists public.activities (
  id uuid primary key default uuid_generate_v4(),
  entity_type text not null
    check (entity_type in ('client', 'deal', 'property', 'task')),
  entity_id uuid not null,
  type text not null
    check (
      type in (
        'created',
        'updated',
        'deleted',
        'stage_changed',
        'status_changed',
        'task_completed',
        'note_added'
      )
    ),
  payload jsonb not null default '{}'::jsonb,
  client_id uuid references public.clients(id) on delete cascade,
  deal_id uuid references public.deals(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists activities_entity_idx
  on public.activities(entity_type, entity_id, created_at desc);
create index if not exists activities_client_idx
  on public.activities(client_id, created_at desc);
create index if not exists activities_deal_idx
  on public.activities(deal_id, created_at desc);
create index if not exists activities_property_idx
  on public.activities(property_id, created_at desc);
create index if not exists activities_actor_idx
  on public.activities(actor_id, created_at desc);

-- ---------- RLS ----------
alter table public.activities enable row level security;

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select using (
    public.is_admin()
    or actor_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = activities.client_id
        and (c.assigned_to = auth.uid() or c.created_by = auth.uid())
    )
    or exists (
      select 1 from public.deals d
      where d.id = activities.deal_id
        and (d.assigned_to = auth.uid() or d.created_by = auth.uid())
    )
    or exists (
      select 1 from public.properties p
      where p.id = activities.property_id
        and (p.assigned_to = auth.uid() or p.created_by = auth.uid())
    )
  );

drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert" on public.activities
  for insert with check (auth.uid() is not null and actor_id = auth.uid());

-- запретим update/delete для прозрачности журнала; админ может удалить через сервисный ключ
drop policy if exists "activities_no_update" on public.activities;
drop policy if exists "activities_no_delete" on public.activities;
