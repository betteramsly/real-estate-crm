-- Protect business invariants even when writes bypass the Next.js forms.
-- NOT VALID avoids blocking deployment on legacy rows while still checking
-- every new or updated row. Existing data can be cleaned and validated later.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_budget_nonnegative'
  ) then
    alter table public.clients
      add constraint clients_budget_nonnegative
      check (
        (budget_min is null or budget_min >= 0)
        and (budget_max is null or budget_max >= 0)
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clients'::regclass
      and conname = 'clients_budget_order'
  ) then
    alter table public.clients
      add constraint clients_budget_order
      check (budget_min is null or budget_max is null or budget_min <= budget_max)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.properties'::regclass
      and conname = 'properties_price_nonnegative'
  ) then
    alter table public.properties
      add constraint properties_price_nonnegative
      check (price >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.properties'::regclass
      and conname = 'properties_area_positive'
  ) then
    alter table public.properties
      add constraint properties_area_positive
      check (area is null or area > 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.properties'::regclass
      and conname = 'properties_rooms_range'
  ) then
    alter table public.properties
      add constraint properties_rooms_range
      check (rooms is null or rooms between 1 and 4) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_amount_nonnegative'
  ) then
    alter table public.deals
      add constraint deals_amount_nonnegative
      check (amount is null or amount >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.deals'::regclass
      and conname = 'deals_commission_nonnegative'
  ) then
    alter table public.deals
      add constraint deals_commission_nonnegative
      check (commission is null or commission >= 0) not valid;
  end if;
end
$$;
