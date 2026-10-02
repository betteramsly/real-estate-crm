-- Up to two realtor discounts and a developer promo on an apartment calculation.
-- Discounts are stored on the calculation and frozen into the share snapshot.

alter table public.apartment_calculations
  add column if not exists discounts jsonb,
  add column if not exists developer_promo text,
  add column if not exists price_after_discount numeric;

update public.apartment_calculations
set discounts = '[]'::jsonb
where discounts is null;

update public.apartment_calculations
set price_after_discount = price
where price_after_discount is null;

alter table public.apartment_calculations
  alter column discounts set default '[]'::jsonb,
  alter column discounts set not null,
  alter column price_after_discount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'apartment_calculations_price_after_discount_range'
      and conrelid = 'public.apartment_calculations'::regclass
  ) then
    alter table public.apartment_calculations
      add constraint apartment_calculations_price_after_discount_range
      check (
        price_after_discount > 0
        and price_after_discount <= price
        and price_after_discount <= 5000000000
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'apartment_calculations_discounts_array'
      and conrelid = 'public.apartment_calculations'::regclass
  ) then
    alter table public.apartment_calculations
      add constraint apartment_calculations_discounts_array
      check (
        jsonb_typeof(discounts) = 'array'
        and jsonb_array_length(discounts) <= 2
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'apartment_calculations_promo_len'
      and conrelid = 'public.apartment_calculations'::regclass
  ) then
    alter table public.apartment_calculations
      add constraint apartment_calculations_promo_len
      check (developer_promo is null or char_length(developer_promo) <= 240);
  end if;
end
$$;

comment on column public.apartment_calculations.discounts is
  'Up to two discounts. Each item is label, mode percent|amount, value, and the ruble amount taken off the list price.';
comment on column public.apartment_calculations.developer_promo is
  'Free-text developer offer shown to the client, such as heating or partitions as a gift.';
comment on column public.apartment_calculations.price_after_discount is
  'List price after discounts. Down payment and markup use this amount.';

create or replace function public.sanitize_quote_discounts(source jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(
    (
      select jsonb_agg(item.obj order by item.ord)
      from (
        select
          d.ord,
          jsonb_strip_nulls(jsonb_build_object(
            'label', case
              when nullif(btrim(d.item->>'label'), '') is null then 'Скидка'
              else left(btrim(d.item->>'label'), 40)
            end,
            'mode', case when d.item->>'mode' = 'percent' then 'percent' else 'amount' end,
            'value', public.quote_number(d.item->>'value', 0.01, 5000000000),
            'amount', public.quote_number(d.item->>'amount', 0.01, 5000000000)
          )) as obj
        from jsonb_array_elements(
          case when jsonb_typeof(source) = 'array' then source else '[]'::jsonb end
        ) with ordinality as d(item, ord)
        where jsonb_typeof(d.item) = 'object'
          and d.ord <= 2
          and public.quote_number(d.item->>'amount', 0.01, 5000000000) is not null
          and public.quote_number(d.item->>'value', 0.01, 5000000000) is not null
      ) item
    ),
    '[]'::jsonb
  );
$$;

revoke all on function public.sanitize_quote_discounts(jsonb)
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
              'price_after_discount', public.quote_number(src.quote->>'price_after_discount', 0.01, 5000000000),
              'discounts', case
                when jsonb_array_length(public.sanitize_quote_discounts(src.quote->'discounts')) = 0 then null
                else public.sanitize_quote_discounts(src.quote->'discounts')
              end,
              'developer_promo', case
                when nullif(btrim(src.quote->>'developer_promo'), '') is null then null
                else left(regexp_replace(btrim(src.quote->>'developer_promo'), '\s+', ' ', 'g'), 240)
              end,
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
  'Whitelisted fields for a client selection, including up to two discounts and a developer promo.';

notify pgrst, 'reload schema';
