-- События гостевой ссылки: открыли, смотрели ЖК, написали агенту.

create table if not exists public.catalog_share_events (
  id uuid primary key default uuid_generate_v4(),
  share_id uuid not null references public.catalog_shares(id) on delete cascade,
  event_type text not null
    check (event_type in ('open', 'view', 'contact')),
  property_id uuid references public.properties(id) on delete set null,
  visitor_key text
    check (
      visitor_key is null
      or (
        char_length(visitor_key) between 20 and 64
        and visitor_key ~ '^[A-Za-z0-9_-]+$'
      )
    ),
  created_at timestamptz not null default now()
);

create index if not exists catalog_share_events_share_created_idx
  on public.catalog_share_events (share_id, created_at desc);

create index if not exists catalog_share_events_share_type_idx
  on public.catalog_share_events (share_id, event_type);

create index if not exists catalog_share_events_property_id_idx
  on public.catalog_share_events (property_id);

comment on table public.catalog_share_events is
  'Anonymous guest events for a catalog share: open, property view, contact.';

alter table public.catalog_share_events enable row level security;

revoke all on table public.catalog_share_events from public;
revoke all on table public.catalog_share_events from anon;
revoke insert, update, delete on table public.catalog_share_events from authenticated;
grant select on table public.catalog_share_events to authenticated;

drop policy if exists "catalog_share_events_select_own" on public.catalog_share_events;
create policy "catalog_share_events_select_own" on public.catalog_share_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.catalog_shares s
      where s.id = catalog_share_events.share_id
        and s.created_by = (select auth.uid())
    )
  );

create or replace function public.record_catalog_share_event(
  share_token text,
  event_type text,
  property_id uuid default null,
  visitor_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  share public.catalog_shares%rowtype;
  event_count integer;
  next_property uuid;
begin
  if share_token is null or char_length(share_token) < 20 then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if event_type not in ('open', 'view', 'contact') then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if visitor_key is not null and (
    char_length(visitor_key) < 20
    or char_length(visitor_key) > 64
    or visitor_key !~ '^[A-Za-z0-9_-]+$'
  ) then
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

  next_property := property_id;
  if event_type = 'open' then
    next_property := null;
  elsif next_property is not null and not (next_property = any (share.property_ids)) then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  elsif event_type = 'view' and next_property is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  select count(*) into event_count
  from public.catalog_share_events
  where catalog_share_events.share_id = share.id;

  if event_count >= 2000 then
    return jsonb_build_object('ok', true, 'capped', true);
  end if;

  if exists (
    select 1
    from public.catalog_share_events e
    where e.share_id = share.id
      and e.event_type = record_catalog_share_event.event_type
      and e.visitor_key is not distinct from record_catalog_share_event.visitor_key
      and e.property_id is not distinct from next_property
      and e.created_at > now() - interval '30 minutes'
  ) then
    return jsonb_build_object('ok', true, 'deduped', true);
  end if;

  insert into public.catalog_share_events (
    share_id,
    event_type,
    property_id,
    visitor_key
  ) values (
    share.id,
    record_catalog_share_event.event_type,
    next_property,
    record_catalog_share_event.visitor_key
  );

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.record_catalog_share_event(text, text, uuid, text) from public;
grant execute on function public.record_catalog_share_event(text, text, uuid, text) to anon, authenticated;

comment on function public.record_catalog_share_event(text, text, uuid, text) is
  'Records a guest catalog-share event after validating the token.';

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
    'agent', case
      when agent_name is null and agent_phone is null then null
      else jsonb_build_object('name', agent_name, 'phone', agent_phone)
    end,
    'properties', items
  );
end;
$$;

revoke all on function public.open_catalog_share(text) from public;
grant execute on function public.open_catalog_share(text) to anon, authenticated;
