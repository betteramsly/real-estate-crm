-- Презентационный каталог ЖК: клиентский JSON и служебный блок.
alter table public.properties
  add column if not exists catalog jsonb not null default '{}'::jsonb,
  add column if not exists internal jsonb not null default '{}'::jsonb;

comment on column public.properties.catalog is
  'Client-facing catalog payload: about, facts, installment, commercial, location, documents';
comment on column public.properties.internal is
  'Internal block: commission, investor, stop_sales, notes. Never select in catalog HTML.';

create index if not exists properties_catalog_gin_idx
  on public.properties using gin (catalog);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complexes',
  'complexes',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
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
create policy "complexes_insert_authenticated" on storage.objects
  for insert with check (
    bucket_id = 'complexes'
    and auth.role() = 'authenticated'
  );

drop policy if exists "complexes_update_authenticated" on storage.objects;
create policy "complexes_update_authenticated" on storage.objects
  for update using (
    bucket_id = 'complexes'
    and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'complexes'
    and auth.role() = 'authenticated'
  );

drop policy if exists "complexes_delete_authenticated" on storage.objects;
create policy "complexes_delete_authenticated" on storage.objects
  for delete using (
    bucket_id = 'complexes'
    and auth.role() = 'authenticated'
  );
