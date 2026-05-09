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
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

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
  updated_at timestamptz not null default now()
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
  assigned_to uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  updated_at timestamptz not null default now()
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

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'agent')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- is_admin helper ----------
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$ language sql stable security definer;

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
  );

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
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
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id or public.is_admin());

-- clients
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

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

drop policy if exists "clients_delete" on public.clients;
create policy "clients_delete" on public.clients
  for delete using (
    public.is_admin()
    or created_by = auth.uid()
  );

-- properties (общий ресурс — все авторизованные видят активные)
drop policy if exists "properties_select" on public.properties;
create policy "properties_select" on public.properties
  for select using (
    auth.role() = 'authenticated' and (
      public.is_admin()
      or status <> 'archived'
      or assigned_to = auth.uid()
      or created_by = auth.uid()
    )
  );

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

drop policy if exists "properties_delete" on public.properties;
create policy "properties_delete" on public.properties
  for delete using (
    public.is_admin()
    or created_by = auth.uid()
  );

-- deals
drop policy if exists "deals_select" on public.deals;
create policy "deals_select" on public.deals
  for select using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

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

drop policy if exists "deals_delete" on public.deals;
create policy "deals_delete" on public.deals
  for delete using (
    public.is_admin()
    or created_by = auth.uid()
  );

-- tasks
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

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

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (
    public.is_admin()
    or created_by = auth.uid()
  );

-- activities
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
