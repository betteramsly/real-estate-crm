-- Separate technical administration from company-wide sales visibility.
-- Agents and admins work only with assigned CRM records; ROP and managers
-- can review and manage the whole sales operation.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'agent', 'rop', 'manager'));

create or replace function public.can_view_all_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('rop', 'manager')
  );
$$;

revoke all on function public.can_view_all_sales() from public, anon;
grant execute on function public.can_view_all_sales() to authenticated;

drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.can_view_all_sales()
      or assigned_to = (select auth.uid())
    )
  );

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  )
  with check (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "deals_select" on public.deals;
create policy "deals_select" on public.deals
  for select to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert" on public.deals
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.can_view_all_sales()
      or assigned_to = (select auth.uid())
    )
  );

drop policy if exists "deals_update" on public.deals;
create policy "deals_update" on public.deals
  for update to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  )
  with check (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "deals_delete" on public.deals;
create policy "deals_delete" on public.deals
  for delete to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.can_view_all_sales()
      or assigned_to = (select auth.uid())
    )
  );

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  )
  with check (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (
    public.can_view_all_sales()
    or assigned_to = (select auth.uid())
  );

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select to authenticated
  using (
    public.can_view_all_sales()
    or actor_id = (select auth.uid())
    or exists (
      select 1 from public.clients c
      where c.id = activities.client_id
        and c.assigned_to = (select auth.uid())
    )
    or exists (
      select 1 from public.deals d
      where d.id = activities.deal_id
        and d.assigned_to = (select auth.uid())
    )
    or exists (
      select 1 from public.properties p
      where p.id = activities.property_id
        and (p.assigned_to = (select auth.uid()) or p.created_by = (select auth.uid()))
    )
  );
