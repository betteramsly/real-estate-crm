-- Агенты только смотрят базу ЖК. Добавлять, менять и удалять объекты может админ.

drop policy if exists "properties_insert" on public.properties;
create policy "properties_insert" on public.properties
  for insert with check (public.is_admin());

drop policy if exists "properties_update" on public.properties;
create policy "properties_update" on public.properties
  for update using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "properties_delete" on public.properties;
create policy "properties_delete" on public.properties
  for delete using (public.is_admin());

drop policy if exists "complexes_insert_authenticated" on storage.objects;
drop policy if exists "complexes_insert_admin" on storage.objects;
create policy "complexes_insert_admin" on storage.objects
  for insert with check (
    bucket_id = 'complexes'
    and public.is_admin()
  );

drop policy if exists "complexes_update_authenticated" on storage.objects;
drop policy if exists "complexes_update_admin" on storage.objects;
create policy "complexes_update_admin" on storage.objects
  for update using (
    bucket_id = 'complexes'
    and public.is_admin()
  )
  with check (
    bucket_id = 'complexes'
    and public.is_admin()
  );

drop policy if exists "complexes_delete_authenticated" on storage.objects;
drop policy if exists "complexes_delete_admin" on storage.objects;
create policy "complexes_delete_admin" on storage.objects
  for delete using (
    bucket_id = 'complexes'
    and public.is_admin()
  );
