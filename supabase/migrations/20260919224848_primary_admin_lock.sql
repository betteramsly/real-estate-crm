-- Главный админ — admin@demo.local. Роль и email нельзя сменить из кабинета.

update public.profiles
set role = 'admin'
where lower(email) = 'admin@demo.local';

create or replace function public.enforce_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(old.email, '')) = 'admin@demo.local' then
    if new.role is distinct from old.role then
      raise exception 'Нельзя менять роль главного администратора';
    end if;
    if new.email is distinct from old.email then
      raise exception 'Нельзя менять email главного администратора';
    end if;
  end if;

  if new.role is not distinct from old.role then
    return new;
  end if;
  if (select auth.uid()) is null then
    return new;
  end if;
  if not public.is_admin() then
    raise exception 'Нельзя менять роль';
  end if;
  return new;
end;
$$;
