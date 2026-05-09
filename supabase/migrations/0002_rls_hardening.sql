-- =============================================================
-- Migration: hardening RLS for admin/agent split
--
-- Уточняет политики, добавляя WITH CHECK на INSERT/UPDATE:
--   * нельзя создать запись от имени другого пользователя
--     (created_by обязан совпадать с auth.uid() или быть null;
--     null здесь оставляем для серверных триггеров)
--   * админ остаётся неограничен в обоих направлениях
--   * для tasks дополнительно: только админ или сам пользователь
--     могут назначать задачу другому агенту
--
-- Запустите этот файл в Supabase SQL Editor (или supabase db push).
-- =============================================================

-- ---------- clients ----------
drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert with check (
    auth.uid() is not null
    and (created_by is null or created_by = auth.uid() or public.is_admin())
  );

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- ---------- properties ----------
drop policy if exists "properties_insert" on public.properties;
create policy "properties_insert" on public.properties
  for insert with check (
    auth.uid() is not null
    and (created_by is null or created_by = auth.uid() or public.is_admin())
  );

drop policy if exists "properties_update" on public.properties;
create policy "properties_update" on public.properties
  for update using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- ---------- deals ----------
drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert" on public.deals
  for insert with check (
    auth.uid() is not null
    and (created_by is null or created_by = auth.uid() or public.is_admin())
  );

drop policy if exists "deals_update" on public.deals;
create policy "deals_update" on public.deals
  for update using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- ---------- tasks ----------
-- Агенты могут назначать задачу только себе (либо админу разрешено всё).
drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (
    auth.uid() is not null
    and (created_by is null or created_by = auth.uid() or public.is_admin())
    and (
      public.is_admin()
      or assigned_to is null
      or assigned_to = auth.uid()
    )
  );

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  )
  with check (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );
