-- The immutable company owner is shown as "Developer" in the application.
-- Give that account the same company-wide CRM visibility as sales leadership,
-- while regular administrators continue to see only their assigned records.

create or replace function public.can_view_all_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (p.is_owner or p.role in ('rop', 'manager'))
  );
$$;

revoke all on function public.can_view_all_sales() from public, anon;
grant execute on function public.can_view_all_sales() to authenticated;
