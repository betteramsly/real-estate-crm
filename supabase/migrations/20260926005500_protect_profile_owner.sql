-- Add a single protected company owner for this isolated CRM deployment.
-- Existing installations promote the oldest administrator once; new installs
-- should set the intended owner explicitly during provisioning.

alter table public.profiles
  add column if not exists is_owner boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_owner_must_be_admin'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_owner_must_be_admin
      check (not is_owner or role = 'admin');
  end if;
end
$$;

create unique index if not exists profiles_single_owner_idx
  on public.profiles (is_owner)
  where is_owner;

with first_admin as (
  select id
  from public.profiles
  where role = 'admin'
  order by created_at asc, id asc
  limit 1
)
update public.profiles p
set is_owner = true
where p.id = (select id from first_admin)
  and not exists (
    select 1 from public.profiles existing_owner
    where existing_owner.is_owner
  );

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    return new;
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

  perform pg_advisory_xact_lock(hashtext('profiles-admin-role'));

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
