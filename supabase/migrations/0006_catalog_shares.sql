-- Временные ссылки-подборки для клиента. Анон видит объекты только через RPC по токену.

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

alter table public.catalog_shares enable row level security;

drop policy if exists "catalog_shares_select_own" on public.catalog_shares;
create policy "catalog_shares_select_own" on public.catalog_shares
  for select to authenticated
  using (created_by = auth.uid());

drop policy if exists "catalog_shares_insert_own" on public.catalog_shares;
create policy "catalog_shares_insert_own" on public.catalog_shares
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "catalog_shares_update_own" on public.catalog_shares;
create policy "catalog_shares_update_own" on public.catalog_shares
  for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

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
      p.has_large_apartments,
      null::smallint as relevance,
      p.catalog,
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
    'properties', items
  );
end;
$$;

revoke all on function public.open_catalog_share(text) from public;
grant execute on function public.open_catalog_share(text) to anon, authenticated;

comment on function public.open_catalog_share(text) is
  'Client shortlist for a valid unrevoked token. Omits internal, assigned_to, created_by.';
