-- Legacy rows were checked before this migration was applied. Mark the
-- deployment-safe NOT VALID constraints as fully validated.

alter table public.clients
  validate constraint clients_budget_nonnegative;
alter table public.clients
  validate constraint clients_budget_order;

alter table public.properties
  validate constraint properties_price_nonnegative;
alter table public.properties
  validate constraint properties_area_positive;
alter table public.properties
  validate constraint properties_rooms_range;

alter table public.deals
  validate constraint deals_amount_nonnegative;
alter table public.deals
  validate constraint deals_commission_nonnegative;
