-- Remove the deployment-specific admin email from authorization rules.
-- Trusted maintenance queries (auth.uid() is null) can bootstrap the first
-- admin; signed-in users cannot change their own role or remove the last admin.

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  if (select auth.uid()) is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('profiles-admin-role'));

  if (select auth.uid()) = old.id then
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
