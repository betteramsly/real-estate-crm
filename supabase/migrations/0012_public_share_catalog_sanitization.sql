-- Keep employee-only chess/unit availability documents out of the public RPC
-- payload. Hiding a link in React is not a data-security boundary.

create or replace function public.sanitize_catalog_for_share(source jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(coalesce(source, '{}'::jsonb)) <> 'object' then '{}'::jsonb
    when jsonb_typeof(source -> 'documents') <> 'array' then source - 'documents'
    else jsonb_set(
      source,
      '{documents}',
      coalesce(
        (
          select jsonb_agg(document)
          from jsonb_array_elements(source -> 'documents') document
          where not (
            (
              lower(coalesce(document ->> 'kind', '')) = 'chess'
              or lower(coalesce(document ->> 'title', '') || ' ' || coalesce(document ->> 'url', ''))
                ~ '(шахмат|\.xlsx?([?#]|$))'
            )
            and lower(coalesce(document ->> 'kind', '')) <> 'commercial'
            and lower(coalesce(document ->> 'title', '') || ' ' || coalesce(document ->> 'url', ''))
              !~ 'коммерц'
          )
        ),
        '[]'::jsonb
      ),
      true
    )
  end;
$$;

revoke all on function public.sanitize_catalog_for_share(jsonb)
  from public, anon, authenticated;

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
    'properties', items
  );
end;
$$;

revoke all on function public.open_catalog_share(text) from public;
grant execute on function public.open_catalog_share(text) to anon, authenticated;
