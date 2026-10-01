-- Store the company share of a realtor's deal commission. Only sales
-- leadership (and the immutable company owner/developer) can change it.

alter table public.profiles
  add column if not exists company_commission_percent numeric(5, 2)
  not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_company_commission_percent_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_company_commission_percent_range
      check (
        company_commission_percent >= 0
        and company_commission_percent <= 100
      );
  end if;
end
$$;

-- Protect the percentage from direct profile updates. The trusted RPC below
-- enables one transaction-local flag immediately before performing the write.
create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return new;
  end if;

  if new.company_commission_percent is distinct from old.company_commission_percent
    and coalesce(
      pg_catalog.current_setting(
        'app.allow_company_commission_percent_update',
        true
      ),
      'false'
    ) <> 'true'
  then
    raise exception 'Процент компании меняется только руководителем или РОП';
  end if;

  if new.is_owner is distinct from old.is_owner then
    raise exception 'Статус владельца меняется только через защищённую миграцию';
  end if;

  if old.is_owner and current_user_id <> old.id then
    raise exception 'Профиль владельца может менять только владелец';
  end if;

  if old.is_owner and new.role <> 'admin' then
    raise exception 'Владелец всегда должен оставаться администратором';
  end if;

  if new.role is not distinct from old.role then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('profiles-admin-role')
  );

  if current_user_id = old.id then
    raise exception 'Нельзя менять свою роль';
  end if;

  if not public.is_admin() then
    raise exception 'Нельзя менять роль';
  end if;

  if old.role = 'admin' and new.role <> 'admin' and not exists (
    select 1 from public.profiles p
    where p.role = 'admin' and p.id <> old.id
  ) then
    raise exception 'Нельзя убрать последнего администратора';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_profile_role()
  from public, anon, authenticated;

create or replace function public.set_realtor_company_commission_percent(
  target_user_id uuid,
  new_percent numeric
)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  actor_is_owner boolean;
  target_role text;
  target_is_owner boolean;
begin
  if (select auth.uid()) is null then
    raise exception 'Требуется авторизация';
  end if;

  select p.role, p.is_owner
  into actor_role, actor_is_owner
  from public.profiles p
  where p.id = (select auth.uid());

  if not found or not (
    actor_is_owner or actor_role in ('rop', 'manager')
  ) then
    raise exception 'Только руководитель или РОП может менять процент компании';
  end if;

  if new_percent is null or new_percent < 0 or new_percent > 100 then
    raise exception 'Процент компании должен быть от 0 до 100';
  end if;

  select p.role, p.is_owner
  into target_role, target_is_owner
  from public.profiles p
  where p.id = target_user_id;

  if not found then
    raise exception 'Сотрудник не найден';
  end if;

  if target_is_owner or target_role not in ('agent', 'admin') then
    raise exception 'Процент компании можно установить только риелтору';
  end if;

  perform set_config(
    'app.allow_company_commission_percent_update',
    'true',
    true
  );

  update public.profiles
  set company_commission_percent = round(new_percent, 2)
  where id = target_user_id;

  return round(new_percent, 2);
end;
$$;

revoke all on function public.set_realtor_company_commission_percent(uuid, numeric)
  from public, anon;
grant execute on function public.set_realtor_company_commission_percent(uuid, numeric)
  to authenticated;
