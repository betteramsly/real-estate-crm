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
