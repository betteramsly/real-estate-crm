-- =============================================================
-- Real Estate CRM — Supabase schema
-- Запускается в Supabase SQL Editor целиком.
-- Безопасно перезапускать: использует CREATE TABLE IF NOT EXISTS
-- и DROP POLICY IF EXISTS перед созданием политик.
-- =============================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- ---------- Enums (через CHECK, чтобы не плодить enum-типы) ----

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'agent' check (role in ('admin', 'agent')),
  is_owner boolean not null default false,
  phone text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists is_owner boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_owner_must_be_admin'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_owner_must_be_admin
      check (not is_owner or role = 'admin');
  end if;
end
$$;

create unique index if not exists profiles_single_owner_idx
  on public.profiles (is_owner)
  where is_owner;

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email))
  where email is not null;

-- ---------- clients ----------
create table if not exists public.clients (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  phone text,
  email text,
  source text not null default 'other'
    check (source in ('referral', 'cian', 'avito', 'instagram', 'other')),
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'won', 'lost')),
  budget_min numeric,
  budget_max numeric,
  deal_type text not null default 'buy'
    check (deal_type in ('buy', 'sell', 'rent_in', 'rent_out')),
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_budget_nonnegative check (
    (budget_min is null or budget_min >= 0)
    and (budget_max is null or budget_max >= 0)
  ),
  constraint clients_budget_order check (
    budget_min is null or budget_max is null or budget_min <= budget_max
  )
);

create index if not exists clients_assigned_to_idx on public.clients(assigned_to);
create index if not exists clients_status_idx on public.clients(status);
create index if not exists clients_source_idx on public.clients(source);
create index if not exists clients_deal_type_idx on public.clients(deal_type);
create index if not exists clients_created_at_idx on public.clients(created_at desc);
create index if not exists clients_full_name_trgm_idx
  on public.clients using gin (full_name gin_trgm_ops);
create index if not exists clients_phone_trgm_idx
  on public.clients using gin (phone gin_trgm_ops);
create index if not exists clients_email_trgm_idx
  on public.clients using gin (email gin_trgm_ops);
create index if not exists clients_notes_trgm_idx
  on public.clients using gin (notes gin_trgm_ops);

-- ---------- properties ----------
create table if not exists public.properties (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  property_type text not null default 'apartment'
    check (property_type in ('apartment', 'house', 'commercial', 'land')),
  listing_type text not null default 'sale'
    check (listing_type in ('sale', 'rent')),
  status text not null default 'active'
    check (status in ('active', 'reserved', 'sold', 'archived')),
  price numeric not null default 0,
  area numeric,
  rooms integer,
  address text,
  city text,
  district text,
  description text,
  cover_url text,
  developer text,
  completion_year text,
  installment_max text,
  maternity_capital boolean,
  cash_payment boolean,
  has_large_apartments boolean,
  relevance smallint check (relevance is null or relevance between 1 and 3),
  catalog jsonb not null default '{}'::jsonb,
  internal jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_price_nonnegative check (price >= 0),
  constraint properties_area_positive check (area is null or area > 0),
  constraint properties_rooms_range check (rooms is null or rooms between 1 and 4)
);

create index if not exists properties_status_idx on public.properties(status);
create index if not exists properties_assigned_to_idx on public.properties(assigned_to);
create index if not exists properties_property_type_idx on public.properties(property_type);
create index if not exists properties_listing_type_idx on public.properties(listing_type);
create index if not exists properties_created_at_idx on public.properties(created_at desc);
create index if not exists properties_title_trgm_idx
  on public.properties using gin (title gin_trgm_ops);
create index if not exists properties_address_trgm_idx
  on public.properties using gin (address gin_trgm_ops);
create index if not exists properties_city_trgm_idx
  on public.properties using gin (city gin_trgm_ops);
create index if not exists properties_district_trgm_idx
  on public.properties using gin (district gin_trgm_ops);
create index if not exists properties_description_trgm_idx
  on public.properties using gin (description gin_trgm_ops);
create index if not exists properties_developer_idx
  on public.properties(developer);
create index if not exists properties_completion_year_idx
  on public.properties(completion_year);
create index if not exists properties_relevance_idx
  on public.properties(relevance);
create index if not exists properties_developer_trgm_idx
  on public.properties using gin (developer gin_trgm_ops);
create index if not exists properties_catalog_gin_idx
  on public.properties using gin (catalog);

-- ---------- deals ----------
create table if not exists public.deals (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  client_id uuid references public.clients(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  stage text not null default 'new'
    check (stage in ('new', 'viewing', 'negotiation', 'contract', 'closed_won', 'closed_lost')),
  amount numeric,
  commission numeric,
  expected_close_date date,
  closed_at timestamptz,
  notes text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_amount_nonnegative check (amount is null or amount >= 0),
  constraint deals_commission_nonnegative check (
    commission is null or commission >= 0
  )
);

create index if not exists deals_stage_idx on public.deals(stage);
create index if not exists deals_assigned_to_idx on public.deals(assigned_to);
create index if not exists deals_created_at_idx on public.deals(created_at desc);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  client_id uuid references public.clients(id) on delete set null,
  deal_id uuid references public.deals(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_due_at_idx on public.tasks(due_at);
create index if not exists tasks_priority_idx on public.tasks(priority);

-- ---------- activities (audit log + activity timeline) ----------
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

-- ---------- catalog_shares (временные подборки для клиента) ----------
create table if not exists public.catalog_shares (
  id uuid primary key default uuid_generate_v4(),
  token text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text,
  property_ids uuid[] not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint catalog_shares_ids_len check (
    cardinality(property_ids) between 1 and 12
  ),
  constraint catalog_shares_token_len check (char_length(token) >= 20)
);

create index if not exists catalog_shares_created_by_idx
  on public.catalog_shares (created_by, created_at desc);

create index if not exists catalog_shares_active_idx
  on public.catalog_shares (expires_at)
  where revoked_at is null;

create table if not exists public.catalog_share_events (
  id uuid primary key default uuid_generate_v4(),
  share_id uuid not null references public.catalog_shares(id) on delete cascade,
  event_type text not null
    check (event_type in ('open', 'view', 'contact')),
  property_id uuid references public.properties(id) on delete set null,
  visitor_key text
    check (
      visitor_key is null
      or (
        char_length(visitor_key) between 20 and 64
        and visitor_key ~ '^[A-Za-z0-9_-]+$'
      )
    ),
  created_at timestamptz not null default now()
);

create index if not exists catalog_share_events_share_created_idx
  on public.catalog_share_events (share_id, created_at desc);

create index if not exists catalog_share_events_share_type_idx
  on public.catalog_share_events (share_id, event_type);

create index if not exists catalog_share_events_property_id_idx
  on public.catalog_share_events (property_id);

-- ---------- updated_at trigger ----------
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

drop trigger if exists set_updated_at on public.clients;
create trigger set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.properties;
create trigger set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.deals;
create trigger set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------- handle_new_user trigger ----------
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- is_admin helper ----------
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

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return new;
  end if;

  if new.is_owner is distinct from old.is_owner then
    raise exception 'Статус владельца меняется только через защищённую миграцию';
  end if;

  if old.is_owner and current_user_id <> old.id then
    raise exception 'Профиль владельца может менять только владелец';
  end if;

  if old.is_owner and new.role <> 'admin' then
    raise exception 'Владелец всегда должен оставаться администратором';
  end if;

  if new.role is not distinct from old.role then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('profiles-admin-role'));
  if current_user_id = old.id then
    raise exception 'Нельзя менять свою роль';
  end if;
  if not public.is_admin() then
    raise exception 'Нельзя менять роль';
  end if;
  if old.role = 'admin' and new.role <> 'admin' and not exists (
    select 1 from public.profiles p
    where p.role = 'admin' and p.id <> old.id
  ) then
    raise exception 'Нельзя убрать последнего администратора';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profile_role on public.profiles;
create trigger enforce_profile_role
  before update on public.profiles
  for each row execute function public.enforce_profile_role();

revoke all on function public.enforce_profile_role() from public, anon, authenticated;

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
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
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
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', normalized),
    'email',
    new_id::text,
    now(), now(), now()
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

revoke all on function public.create_team_agent(text, text, text) from public, anon;
grant execute on function public.create_team_agent(text, text, text) to authenticated;

-- ---------- Storage: avatars ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complexes',
  'complexes',
  true,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "complexes_select_public" on storage.objects;
create policy "complexes_select_public" on storage.objects
  for select using (bucket_id = 'complexes');

drop policy if exists "complexes_insert_authenticated" on storage.objects;
drop policy if exists "complexes_insert_admin" on storage.objects;
create policy "complexes_insert_admin" on storage.objects
  for insert with check (
    bucket_id = 'complexes'
    and public.is_admin()
  );

drop policy if exists "complexes_update_authenticated" on storage.objects;
drop policy if exists "complexes_update_admin" on storage.objects;
create policy "complexes_update_admin" on storage.objects
  for update using (
    bucket_id = 'complexes'
    and public.is_admin()
  )
  with check (
    bucket_id = 'complexes'
    and public.is_admin()
  );

drop policy if exists "complexes_delete_authenticated" on storage.objects;
drop policy if exists "complexes_delete_admin" on storage.objects;
create policy "complexes_delete_admin" on storage.objects
  for delete using (
    bucket_id = 'complexes'
    and public.is_admin()
  );

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.properties enable row level security;
alter table public.deals enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;

-- profiles
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

-- clients
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "clients_insert" on public.clients;
create policy "clients_insert" on public.clients
  for insert with check (
    (select auth.uid()) is not null
    and (created_by is null or created_by = (select auth.uid()) or public.is_admin())
  );

drop policy if exists "clients_update" on public.clients;
create policy "clients_update" on public.clients
  for update using (
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
  for delete using (
    public.is_admin()
    or created_by = (select auth.uid())
  );

-- properties (общий ресурс — все авторизованные видят активные)
drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties
  for select using (
    (select auth.role()) = 'authenticated' and (
      public.is_admin()
      or status <> 'archived'
      or assigned_to = (select auth.uid())
      or created_by = (select auth.uid())
    )
  );

drop policy if exists "properties_insert" on public.properties;
create policy "properties_insert" on public.properties
  for insert with check (public.is_admin());

drop policy if exists "properties_update" on public.properties;
create policy "properties_update" on public.properties
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "properties_delete" on public.properties;
create policy "properties_delete" on public.properties
  for delete using (public.is_admin());

-- deals
drop policy if exists "deals_select" on public.deals;
create policy "deals_select" on public.deals
  for select using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert" on public.deals
  for insert with check (
    (select auth.uid()) is not null
    and (created_by is null or created_by = (select auth.uid()) or public.is_admin())
  );

drop policy if exists "deals_update" on public.deals;
create policy "deals_update" on public.deals
  for update using (
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
  for delete using (
    public.is_admin()
    or created_by = (select auth.uid())
  );

-- tasks
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    public.is_admin()
    or assigned_to = (select auth.uid())
    or created_by = (select auth.uid())
  );

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (
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
  for update using (
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
  for delete using (
    public.is_admin()
    or created_by = (select auth.uid())
  );

-- activities
drop policy if exists "activities_select" on public.activities;
create policy "activities_select" on public.activities
  for select using (
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
  for insert with check ((select auth.uid()) is not null and actor_id = (select auth.uid()));

-- catalog_shares
alter table public.catalog_shares enable row level security;

drop policy if exists "catalog_shares_select_own" on public.catalog_shares;
create policy "catalog_shares_select_own" on public.catalog_shares
  for select to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "catalog_shares_insert_own" on public.catalog_shares;
create policy "catalog_shares_insert_own" on public.catalog_shares
  for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "catalog_shares_update_own" on public.catalog_shares;
create policy "catalog_shares_update_own" on public.catalog_shares
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

alter table public.catalog_share_events enable row level security;

revoke all on table public.catalog_share_events from public;
revoke all on table public.catalog_share_events from anon;
revoke insert, update, delete on table public.catalog_share_events from authenticated;
grant select on table public.catalog_share_events to authenticated;

drop policy if exists "catalog_share_events_select_own" on public.catalog_share_events;
create policy "catalog_share_events_select_own" on public.catalog_share_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.catalog_shares s
      where s.id = catalog_share_events.share_id
        and s.created_by = (select auth.uid())
    )
  );

create or replace function public.record_catalog_share_event(
  share_token text,
  event_type text,
  property_id uuid default null,
  visitor_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  share public.catalog_shares%rowtype;
  event_count integer;
  next_property uuid;
begin
  if share_token is null or char_length(share_token) < 20 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if event_type not in ('open', 'view', 'contact') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if visitor_key is not null and (
    char_length(visitor_key) < 20
    or char_length(visitor_key) > 64
    or visitor_key !~ '^[A-Za-z0-9_-]+$'
  ) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into share
  from public.catalog_shares
  where token = share_token;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if share.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;

  if share.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  next_property := property_id;
  if event_type = 'open' then
    next_property := null;
  elsif next_property is not null and not (next_property = any (share.property_ids)) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  elsif event_type = 'view' and next_property is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select count(*) into event_count
  from public.catalog_share_events
  where catalog_share_events.share_id = share.id;

  if event_count >= 2000 then
    return jsonb_build_object('ok', true, 'capped', true);
  end if;

  if exists (
    select 1
    from public.catalog_share_events e
    where e.share_id = share.id
      and e.event_type = record_catalog_share_event.event_type
      and e.visitor_key is not distinct from record_catalog_share_event.visitor_key
      and e.property_id is not distinct from next_property
      and e.created_at > now() - interval '30 minutes'
  ) then
    return jsonb_build_object('ok', true, 'deduped', true);
  end if;

  insert into public.catalog_share_events (
    share_id,
    event_type,
    property_id,
    visitor_key
  ) values (
    share.id,
    record_catalog_share_event.event_type,
    next_property,
    record_catalog_share_event.visitor_key
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_catalog_share_event(text, text, uuid, text) from public;
grant execute on function public.record_catalog_share_event(text, text, uuid, text) to anon, authenticated;

create or replace function public.sanitize_catalog_for_share(source jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(coalesce(source, '{}'::jsonb)) <> 'object' then '{}'::jsonb
    when jsonb_typeof(source -> 'documents') <> 'array' then source - 'documents'
    else jsonb_set(
      source,
      '{documents}',
      coalesce(
        (
          select jsonb_agg(document)
          from jsonb_array_elements(source -> 'documents') document
          where not (
            (
              lower(coalesce(document ->> 'kind', '')) = 'chess'
              or lower(coalesce(document ->> 'title', '') || ' ' || coalesce(document ->> 'url', ''))
                ~ '(шахмат|\.xlsx?([?#]|$))'
            )
            and lower(coalesce(document ->> 'kind', '')) <> 'commercial'
            and lower(coalesce(document ->> 'title', '') || ' ' || coalesce(document ->> 'url', ''))
              !~ 'коммерц'
          )
        ),
        '[]'::jsonb
      ),
      true
    )
  end;
$$;

revoke all on function public.sanitize_catalog_for_share(jsonb)
  from public, anon, authenticated;

create or replace function public.open_catalog_share(share_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  share public.catalog_shares%rowtype;
  items jsonb;
  agent_name text;
  agent_phone text;
begin
  if share_token is null or char_length(share_token) < 20 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select * into share
  from public.catalog_shares
  where token = share_token;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'missing');
  end if;

  if share.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;

  if share.expires_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select p.full_name, p.phone
  into agent_name, agent_phone
  from public.profiles p
  where p.id = share.created_by;

  select coalesce(
    jsonb_agg(to_jsonb(card) order by ord.idx),
    '[]'::jsonb
  )
  into items
  from unnest(share.property_ids) with ordinality as ord(id, idx)
  join lateral (
    select
      p.id,
      p.title,
      p.property_type,
      p.listing_type,
      p.status,
      p.price,
      p.area,
      p.rooms,
      p.address,
      p.city,
      p.district,
      p.description,
      p.cover_url,
      p.developer,
      p.completion_year,
      p.installment_max,
      p.maternity_capital,
      p.cash_payment,
      p.has_large_apartments,
      null::smallint as relevance,
      public.sanitize_catalog_for_share(p.catalog) as catalog,
      p.created_at,
      p.updated_at
    from public.properties p
    where p.id = ord.id
      and p.status is distinct from 'archived'
  ) card on true;

  return jsonb_build_object(
    'ok', true,
    'title', share.title,
    'expires_at', share.expires_at,
    'agent', case
      when agent_name is null and agent_phone is null then null
      else jsonb_build_object('name', agent_name, 'phone', agent_phone)
    end,
    'properties', items
  );
end;
$$;

revoke all on function public.open_catalog_share(text) from public;
grant execute on function public.open_catalog_share(text) to anon, authenticated;

-- ---------- property_feedback (внутренние предложения по карточкам ЖК) ----------
create table if not exists public.property_feedback (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null
    constraint property_feedback_property_id_fkey
    references public.properties(id) on delete cascade,
  author_id uuid not null
    constraint property_feedback_author_id_fkey
    references public.profiles(id) on delete cascade,
  body text not null,
  status text not null default 'open'
    constraint property_feedback_status_check
    check (status in ('open', 'done', 'tasked')),
  task_id uuid
    constraint property_feedback_task_id_fkey
    references public.tasks(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid
    constraint property_feedback_resolved_by_fkey
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_feedback_body_len
    check (char_length(btrim(body)) between 20 and 1000)
);

create index if not exists property_feedback_status_created_idx
  on public.property_feedback (status, created_at desc);
create index if not exists property_feedback_author_created_idx
  on public.property_feedback (author_id, created_at desc);
create index if not exists property_feedback_property_created_idx
  on public.property_feedback (property_id, created_at desc);

comment on table public.property_feedback is
  'Staff-only notes about catalog cards. Never exposed to catalog share or present mode.';

drop trigger if exists set_updated_at on public.property_feedback;
create trigger set_updated_at
  before update on public.property_feedback
  for each row execute function public.set_updated_at();

alter table public.property_feedback enable row level security;

revoke all on table public.property_feedback from public;
revoke all on table public.property_feedback from anon;
grant select, insert, update, delete on table public.property_feedback to authenticated;

drop policy if exists "property_feedback_select" on public.property_feedback;
create policy "property_feedback_select" on public.property_feedback
  for select to authenticated
  using (
    public.is_admin()
    or author_id = (select auth.uid())
  );

drop policy if exists "property_feedback_insert" on public.property_feedback;
create policy "property_feedback_insert" on public.property_feedback
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'open'
    and task_id is null
    and resolved_at is null
    and resolved_by is null
  );

drop policy if exists "property_feedback_update" on public.property_feedback;
create policy "property_feedback_update" on public.property_feedback
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "property_feedback_delete" on public.property_feedback;
create policy "property_feedback_delete" on public.property_feedback
  for delete to authenticated
  using (
    public.is_admin()
    or (
      author_id = (select auth.uid())
      and status = 'open'
    )
  );

-- Свои значения фильтров каталога. Раньше они жили в sessionStorage
-- и пропадали после обновления страницы.

create table if not exists public.catalog_filter_options (
  id uuid primary key default uuid_generate_v4(),
  kind text not null
    constraint catalog_filter_options_kind_check
    check (kind in ('city', 'district', 'developer', 'completion_year', 'installment')),
  value text not null
    constraint catalog_filter_options_value_len
    check (char_length(btrim(value)) between 1 and 80),
  created_by uuid
    constraint catalog_filter_options_created_by_fkey
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists catalog_filter_options_kind_value_idx
  on public.catalog_filter_options (kind, lower(btrim(value)));

create index if not exists catalog_filter_options_kind_idx
  on public.catalog_filter_options (kind);

comment on table public.catalog_filter_options is
  'Admin-added catalog filter values. Visible to the team, writable by admins.';

alter table public.catalog_filter_options enable row level security;

revoke all on table public.catalog_filter_options from public, anon;
grant select, insert, delete on table public.catalog_filter_options to authenticated;

drop policy if exists "catalog_filter_options_select" on public.catalog_filter_options;
create policy "catalog_filter_options_select" on public.catalog_filter_options
  for select to authenticated
  using (true);

drop policy if exists "catalog_filter_options_insert" on public.catalog_filter_options;
create policy "catalog_filter_options_insert" on public.catalog_filter_options
  for insert to authenticated
  with check (
    public.is_admin()
    and created_by = (select auth.uid())
  );

drop policy if exists "catalog_filter_options_delete" on public.catalog_filter_options;
create policy "catalog_filter_options_delete" on public.catalog_filter_options
  for delete to authenticated
  using (public.is_admin());
