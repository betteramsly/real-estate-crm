-- Внутренние предложения агентов по карточкам ЖК.
-- Не входит в catalog / internal / open_catalog_share.

create table if not exists public.property_feedback (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null
    constraint property_feedback_property_id_fkey
    references public.properties(id) on delete cascade,
  author_id uuid not null
    constraint property_feedback_author_id_fkey
    references public.profiles(id) on delete cascade,
  body text not null,
  status text not null default 'open'
    constraint property_feedback_status_check
    check (status in ('open', 'done', 'tasked')),
  task_id uuid
    constraint property_feedback_task_id_fkey
    references public.tasks(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid
    constraint property_feedback_resolved_by_fkey
    references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_feedback_body_len
    check (char_length(btrim(body)) between 20 and 1000)
);

create index if not exists property_feedback_status_created_idx
  on public.property_feedback (status, created_at desc);
create index if not exists property_feedback_author_created_idx
  on public.property_feedback (author_id, created_at desc);
create index if not exists property_feedback_property_created_idx
  on public.property_feedback (property_id, created_at desc);

comment on table public.property_feedback is
  'Staff-only notes about catalog cards. Never exposed to catalog share or present mode.';

drop trigger if exists set_updated_at on public.property_feedback;
create trigger set_updated_at
  before update on public.property_feedback
  for each row execute function public.set_updated_at();

alter table public.property_feedback enable row level security;

revoke all on table public.property_feedback from public;
revoke all on table public.property_feedback from anon;
grant select, insert, update, delete on table public.property_feedback to authenticated;

drop policy if exists "property_feedback_select" on public.property_feedback;
create policy "property_feedback_select" on public.property_feedback
  for select to authenticated
  using (
    public.is_admin()
    or author_id = (select auth.uid())
  );

drop policy if exists "property_feedback_insert" on public.property_feedback;
create policy "property_feedback_insert" on public.property_feedback
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'open'
    and task_id is null
    and resolved_at is null
    and resolved_by is null
  );

drop policy if exists "property_feedback_update" on public.property_feedback;
create policy "property_feedback_update" on public.property_feedback
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "property_feedback_delete" on public.property_feedback;
create policy "property_feedback_delete" on public.property_feedback
  for delete to authenticated
  using (
    public.is_admin()
    or (
      author_id = (select auth.uid())
      and status = 'open'
    )
  );
