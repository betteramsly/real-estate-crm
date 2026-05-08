-- =============================================================
-- Real Estate CRM — performance indexes
-- Запусти этот файл в Supabase SQL Editor после schema.sql.
-- Он ускоряет списки, фильтры, сортировку и поиск через ilike.
-- =============================================================

create extension if not exists pg_trgm;

-- Частые сортировки списков.
create index if not exists clients_created_at_idx
  on public.clients(created_at desc);

create index if not exists properties_created_at_idx
  on public.properties(created_at desc);

create index if not exists deals_created_at_idx
  on public.deals(created_at desc);

-- Частые фильтры.
create index if not exists clients_source_idx
  on public.clients(source);

create index if not exists clients_deal_type_idx
  on public.clients(deal_type);

create index if not exists properties_property_type_idx
  on public.properties(property_type);

create index if not exists properties_listing_type_idx
  on public.properties(listing_type);

create index if not exists tasks_priority_idx
  on public.tasks(priority);

-- Поиск с ilike '%query%'.
create index if not exists clients_full_name_trgm_idx
  on public.clients using gin (full_name gin_trgm_ops);

create index if not exists clients_phone_trgm_idx
  on public.clients using gin (phone gin_trgm_ops);

create index if not exists clients_email_trgm_idx
  on public.clients using gin (email gin_trgm_ops);

create index if not exists clients_notes_trgm_idx
  on public.clients using gin (notes gin_trgm_ops);

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
