-- Не пересчитывать auth.uid() на каждой строке catalog_shares.

drop policy if exists "catalog_shares_select_own" on public.catalog_shares;
create policy "catalog_shares_select_own" on public.catalog_shares
  for select to authenticated
  using (created_by = (select auth.uid()));

drop policy if exists "catalog_shares_insert_own" on public.catalog_shares;
create policy "catalog_shares_insert_own" on public.catalog_shares
  for insert to authenticated
  with check (created_by = (select auth.uid()));

drop policy if exists "catalog_shares_update_own" on public.catalog_shares;
create policy "catalog_shares_update_own" on public.catalog_shares
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
