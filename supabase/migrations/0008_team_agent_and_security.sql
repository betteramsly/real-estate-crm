-- Агентов создаёт админ. Закрываем дыры в ролях и лишние RPC.

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email))
  where email is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'agent',
    new.email
  )
  on conflict (id) do update
    set email = excluded.email
    where public.profiles.email is null;
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role then
    return new;
  end if;
  if (select auth.uid()) is null then
    return new;
  end if;
  if not public.is_admin() then
    raise exception 'Нельзя менять роль';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role on public.profiles;
create trigger enforce_profile_role
  before update on public.profiles
  for each row execute function public.enforce_profile_role();

create or replace function public.create_team_agent(
  agent_email text,
  agent_password text,
  agent_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  normalized text := lower(trim(agent_email));
  clean_name text := nullif(btrim(coalesce(agent_name, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Только администратор может добавлять агентов';
  end if;

  if normalized is null or normalized !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Введите корректный email';
  end if;

  if agent_password is null or char_length(agent_password) < 8 then
    raise exception 'Пароль не короче 8 символов';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = normalized) then
    raise exception 'Пользователь с таким email уже есть';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    normalized,
    extensions.crypt(agent_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(clean_name, split_part(normalized, '@', 1))),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', normalized),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  update public.profiles
  set
    email = normalized,
    full_name = coalesce(clean_name, full_name),
    role = 'agent'
  where id = new_id;

  return new_id;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.enforce_profile_role() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.create_team_agent(text, text, text) from public, anon;
grant execute on function public.create_team_agent(text, text, text) to authenticated;

-- RLS: auth.uid()/role() один раз на запрос, не на каждую строку.
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using ((select auth.role()) = 'authenticated');

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id or public.is_admin())
  with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id or public.is_admin());

drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and (created_by is null or created_by = (select auth.uid()) or public.is_admin())
  );

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  )
  with check (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete to authenticated
  using (
    public.is_admin()
    or created_by = (select auth.uid())
  );

drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties
  for select to authenticated
  using (
    (select auth.role()) = 'authenticated' and (
      public.is_admin()
      or status <> 'archived'
      or assigned_to = (select auth.uid())
      or created_by = (select auth.uid())
    )
  );

drop policy if exists "deals_select" on public.deals;
create policy "deals_select" on public.deals
  for select to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert" on public.deals
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and (created_by is null or created_by = (select auth.uid()) or public.is_admin())
  );

drop policy if exists "deals_update" on public.deals;
create policy "deals_update" on public.deals
  for update to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  )
  with check (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "deals_delete" on public.deals;
create policy "deals_delete" on public.deals
  for delete to authenticated
  using (
    public.is_admin()
    or created_by = (select auth.uid())
  );

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and (created_by is null or created_by = (select auth.uid()) or public.is_admin())
    and (
      public.is_admin()
      or assigned_to is null
      or assigned_to = (select auth.uid())
    )
  );

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update to authenticated
  using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  )
  with check (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete to authenticated
  using (
    public.is_admin()
    or created_by = (select auth.uid())
  );

drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select to authenticated
  using (
    public.is_admin()
    or actor_id = (select auth.uid())
    or exists (
      select 1 from public.clients c
      where c.id = activities.client_id
        and (c.assigned_to = (select auth.uid()) or c.created_by = (select auth.uid()))
    )
    or exists (
      select 1 from public.deals d
      where d.id = activities.deal_id
        and (d.assigned_to = (select auth.uid()) or d.created_by = (select auth.uid()))
    )
    or exists (
      select 1 from public.properties p
      where p.id = activities.property_id
        and (p.assigned_to = (select auth.uid()) or p.created_by = (select auth.uid()))
    )
  );

drop policy if exists "activities_insert" on public.activities;
create policy "activities_insert" on public.activities
  for insert to authenticated
  with check ((select auth.uid()) is not null and actor_id = (select auth.uid()));

create index if not exists clients_created_by_idx on public.clients (created_by);
create index if not exists deals_client_id_idx on public.deals (client_id);
create index if not exists deals_created_by_idx on public.deals (created_by);
create index if not exists deals_property_id_idx on public.deals (property_id);
create index if not exists properties_created_by_idx on public.properties (created_by);
create index if not exists tasks_client_id_idx on public.tasks (client_id);
create index if not exists tasks_created_by_idx on public.tasks (created_by);
create index if not exists tasks_deal_id_idx on public.tasks (deal_id);
create index if not exists tasks_property_id_idx on public.tasks (property_id);
