-- Apartment price calculations for realtors, frozen onto a client selection.
-- Floor plans live in the public floor-plans bucket; the share RPC only
-- returns https URLs from that bucket.

alter table public.catalog_shares
  add column if not exists quotes jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catalog_shares_quotes_array'
      and conrelid = 'public.catalog_shares'::regclass
  ) then
    alter table public.catalog_shares
      add constraint catalog_shares_quotes_array
      check (
        jsonb_typeof(quotes) = 'array'
        and jsonb_array_length(quotes) <= 12
      );
  end if;
end
$$;

comment on column public.catalog_shares.quotes is
  'Frozen apartment price calculations shown to the client, including an optional floor plan.';

create or replace function public.quote_number(
  raw text,
  min_value numeric,
  max_value numeric
)
returns numeric
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when raw ~ '^[0-9]+(\.[0-9]+)?$'
      and raw::numeric >= min_value
      and raw::numeric <= max_value
    then raw::numeric
    else null
  end;
$$;

revoke all on function public.quote_number(text, numeric, numeric)
  from public, anon, authenticated;

create or replace function public.sanitize_share_quotes(source jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    (
      select jsonb_agg(cleaned.item order by cleaned.ord)
      from (
        select
          src.ord,
          jsonb_strip_nulls(
            jsonb_build_object(
              'id', case
                when src.quote->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                then src.quote->>'id' else null end,
              'calculation_id', case
                when src.quote->>'calculation_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                then src.quote->>'calculation_id' else null end,
              'property_id', case
                when src.quote->>'property_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                then src.quote->>'property_id' else null end,
              'property_title', case
                when nullif(btrim(src.quote->>'property_title'), '') is null then null
                else left(btrim(src.quote->>'property_title'), 160) end,
              'area', public.quote_number(src.quote->>'area', 0.01, 500),
              'price_m2', public.quote_number(src.quote->>'price_m2', 0, 50000000),
              'price', public.quote_number(src.quote->>'price', 0.01, 5000000000),
              'markup_pct', coalesce(public.quote_number(src.quote->>'markup_pct', 0, 200), 0),
              'markup', case
                when nullif(btrim(src.quote->>'markup'), '') is null then null
                else left(btrim(src.quote->>'markup'), 40) end,
              'months', coalesce(public.quote_number(src.quote->>'months', 0, 360)::integer, 0),
              'term_label', case
                when nullif(btrim(src.quote->>'term_label'), '') is null then null
                else left(btrim(src.quote->>'term_label'), 80) end,
              'down_m2', coalesce(public.quote_number(src.quote->>'down_m2', 0, 50000000), 0),
              'down_lump', coalesce(public.quote_number(src.quote->>'down_lump', 0, 5000000000), 0),
              'down_payment', coalesce(public.quote_number(src.quote->>'down_payment', 0, 5000000000), 0),
              'remaining', coalesce(public.quote_number(src.quote->>'remaining', 0, 10000000000), 0),
              'total', public.quote_number(src.quote->>'total', 0, 10000000000),
              'monthly', coalesce(public.quote_number(src.quote->>'monthly', 0, 10000000000), 0),
              'floor_plan_url', case
                when src.quote->>'floor_plan_url' ~ '^https://[A-Za-z0-9.-]+/storage/v1/object/public/floor-plans/[A-Za-z0-9._/-]+\.(webp|jpe?g|png)$'
                then src.quote->>'floor_plan_url'
                else null
              end
            )
          ) as item
        from jsonb_array_elements(
          case
            when jsonb_typeof(source) = 'array' then source
            else '[]'::jsonb
          end
        ) with ordinality as src(quote, ord)
        where jsonb_typeof(src.quote) = 'object'
          and src.ord <= 12
      ) cleaned
      where cleaned.item ? 'price'
    ),
    '[]'::jsonb
  );
$$;

revoke all on function public.sanitize_share_quotes(jsonb)
  from public, anon, authenticated;

comment on function public.sanitize_share_quotes(jsonb) is
  'Whitelisted fields for a client selection. Floor plans must be https objects in the floor-plans bucket.';

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
    'properties', items,
    'quotes', public.sanitize_share_quotes(coalesce(share.quotes, '[]'::jsonb))
  );
end;
$$;

revoke all on function public.open_catalog_share(text) from public;
grant execute on function public.open_catalog_share(text) to anon, authenticated;

create table if not exists public.apartment_calculations (
  id uuid primary key default uuid_generate_v4(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  property_title text,
  area numeric,
  price_m2 numeric,
  price numeric not null,
  markup_pct numeric not null default 0,
  markup text not null default 'без наценки',
  months integer not null default 0,
  term_label text not null default 'Сразу',
  down_m2 numeric not null default 0,
  down_lump numeric not null default 0,
  down_payment numeric not null,
  remaining numeric not null,
  total numeric not null,
  monthly numeric not null,
  floor_plan_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apartment_calculations_area_range
    check (area is null or (area > 0 and area <= 500)),
  constraint apartment_calculations_price_m2_range
    check (price_m2 is null or (price_m2 >= 0 and price_m2 <= 50000000)),
  constraint apartment_calculations_price_range
    check (price > 0 and price <= 5000000000),
  constraint apartment_calculations_markup_range
    check (markup_pct >= 0 and markup_pct <= 200),
  constraint apartment_calculations_months_range
    check (months >= 0 and months <= 360),
  constraint apartment_calculations_down_m2_range
    check (down_m2 >= 0 and down_m2 <= 50000000),
  constraint apartment_calculations_down_lump_range
    check (down_lump >= 0 and down_lump <= 5000000000),
  constraint apartment_calculations_down_payment_range
    check (down_payment >= 0 and down_payment <= 5000000000),
  constraint apartment_calculations_remaining_range
    check (remaining >= 0 and remaining <= 10000000000),
  constraint apartment_calculations_total_range
    check (total >= 0 and total <= 10000000000),
  constraint apartment_calculations_monthly_range
    check (monthly >= 0 and monthly <= 10000000000),
  constraint apartment_calculations_title_len
    check (property_title is null or char_length(property_title) <= 160),
  constraint apartment_calculations_term_len
    check (char_length(term_label) between 1 and 80),
  constraint apartment_calculations_markup_len
    check (char_length(markup) between 1 and 40)
);

create index if not exists apartment_calculations_owner_idx
  on public.apartment_calculations (created_by, updated_at desc);

create index if not exists apartment_calculations_property_idx
  on public.apartment_calculations (property_id)
  where property_id is not null;

comment on table public.apartment_calculations is
  'Realtor-owned apartment price calculations. Client links store a frozen copy on catalog_shares.quotes.';

drop trigger if exists set_updated_at on public.apartment_calculations;
create trigger set_updated_at
  before update on public.apartment_calculations
  for each row execute function public.set_updated_at();

alter table public.apartment_calculations enable row level security;

revoke all on table public.apartment_calculations from public;
revoke all on table public.apartment_calculations from anon;
grant select, insert, update, delete on table public.apartment_calculations to authenticated;

drop policy if exists "apartment_calculations_select_own" on public.apartment_calculations;
create policy "apartment_calculations_select_own" on public.apartment_calculations
  for select to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "apartment_calculations_insert_own" on public.apartment_calculations;
create policy "apartment_calculations_insert_own" on public.apartment_calculations
  for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "apartment_calculations_update_own" on public.apartment_calculations;
create policy "apartment_calculations_update_own" on public.apartment_calculations
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

drop policy if exists "apartment_calculations_delete_own" on public.apartment_calculations;
create policy "apartment_calculations_delete_own" on public.apartment_calculations
  for delete to authenticated
  using (created_by = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'floor-plans',
  'floor-plans',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "floor_plans_select_public" on storage.objects;
create policy "floor_plans_select_public" on storage.objects
  for select using (bucket_id = 'floor-plans');

drop policy if exists "floor_plans_insert_own_folder" on storage.objects;
create policy "floor_plans_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'floor-plans'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "floor_plans_update_own_folder" on storage.objects;
create policy "floor_plans_update_own_folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'floor-plans'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'floor-plans'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "floor_plans_delete_own_folder" on storage.objects;
create policy "floor_plans_delete_own_folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'floor-plans'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
