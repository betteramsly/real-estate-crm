-- Поля каталога ЖК из базы Notion: застройщик, срок сдачи, рассрочка.
alter table public.properties
  add column if not exists developer text,
  add column if not exists completion_year text,
  add column if not exists installment_max text,
  add column if not exists maternity_capital boolean,
  add column if not exists has_large_apartments boolean,
  add column if not exists relevance smallint;

alter table public.properties
  drop constraint if exists properties_relevance_check;

alter table public.properties
  add constraint properties_relevance_check
  check (relevance is null or relevance between 1 and 3);

create index if not exists properties_developer_idx
  on public.properties(developer);

create index if not exists properties_completion_year_idx
  on public.properties(completion_year);

create index if not exists properties_relevance_idx
  on public.properties(relevance);

create index if not exists properties_developer_trgm_idx
  on public.properties using gin (developer gin_trgm_ops);
