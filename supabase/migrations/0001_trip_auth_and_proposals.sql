-- Japan Trip Companion v4 — Auth, roles and change proposals.
-- Run locally with: npx supabase db reset
-- Run hosted with Supabase SQL editor or `supabase db push` after linking.

create extension if not exists pgcrypto;

create table if not exists public.trips (
  id text primary key,
  title text not null,
  start_date date not null,
  end_date date not null,
  timezone text not null default 'Asia/Tokyo',
  default_language text not null default 'he',
  created_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.trip_versions (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  version_number int not null,
  status text not null check (status in ('draft', 'published', 'archived')),
  data_snapshot jsonb not null default '{}'::jsonb,
  changelog text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (trip_id, version_number)
);

create table if not exists public.change_proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id text not null references public.trips(id) on delete cascade,
  title text not null,
  source text not null check (source in ('chat', 'family_document', 'manual_admin')) default 'chat',
  status text not null check (status in ('draft', 'approved', 'rejected', 'applied')) default 'draft',
  score int check (score between 1 and 100),
  recommendation text not null,
  summary text not null,
  impact jsonb not null default '{}'::jsonb,
  reasoning jsonb not null default '{}'::jsonb,
  operations jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

insert into public.trips (id, title, start_date, end_date, timezone, default_language)
values ('japan-2026-elad-gal-riva-jacob', 'Japan Trip Companion 2026', '2026-10-25', '2026-11-01', 'Asia/Tokyo', 'he')
on conflict (id) do update set
  title = excluded.title,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  timezone = excluded.timezone,
  default_language = excluded.default_language;

create or replace function public.is_trip_member(p_trip_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = p_trip_id
      and tm.user_id = (select auth.uid())
  );
$$;

create or replace function public.trip_role(p_trip_id text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select tm.role
  from public.trip_members tm
  where tm.trip_id = p_trip_id
    and tm.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.is_trip_admin(p_trip_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.trip_role(p_trip_id) = 'admin', false);
$$;

grant execute on function public.is_trip_member(text) to authenticated;
grant execute on function public.trip_role(text) to authenticated;
grant execute on function public.is_trip_admin(text) to authenticated;

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_versions enable row level security;
alter table public.change_proposals enable row level security;

drop policy if exists trips_read_members on public.trips;
create policy trips_read_members on public.trips
for select to authenticated
using (public.is_trip_member(id));

drop policy if exists trips_admin_update on public.trips;
create policy trips_admin_update on public.trips
for update to authenticated
using (public.is_trip_admin(id))
with check (public.is_trip_admin(id));

drop policy if exists trip_members_read_members on public.trip_members;
create policy trip_members_read_members on public.trip_members
for select to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists trip_members_admin_insert on public.trip_members;
create policy trip_members_admin_insert on public.trip_members
for insert to authenticated
with check (public.is_trip_admin(trip_id));

drop policy if exists trip_members_admin_update on public.trip_members;
create policy trip_members_admin_update on public.trip_members
for update to authenticated
using (public.is_trip_admin(trip_id))
with check (public.is_trip_admin(trip_id));

drop policy if exists trip_members_admin_delete on public.trip_members;
create policy trip_members_admin_delete on public.trip_members
for delete to authenticated
using (public.is_trip_admin(trip_id));

drop policy if exists trip_versions_read_members on public.trip_versions;
create policy trip_versions_read_members on public.trip_versions
for select to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists trip_versions_admin_insert on public.trip_versions;
create policy trip_versions_admin_insert on public.trip_versions
for insert to authenticated
with check (public.is_trip_admin(trip_id));

drop policy if exists trip_versions_admin_update on public.trip_versions;
create policy trip_versions_admin_update on public.trip_versions
for update to authenticated
using (public.is_trip_admin(trip_id))
with check (public.is_trip_admin(trip_id));

drop policy if exists change_proposals_read_members on public.change_proposals;
create policy change_proposals_read_members on public.change_proposals
for select to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists change_proposals_admin_insert on public.change_proposals;
create policy change_proposals_admin_insert on public.change_proposals
for insert to authenticated
with check (public.is_trip_admin(trip_id));

drop policy if exists change_proposals_admin_update on public.change_proposals;
create policy change_proposals_admin_update on public.change_proposals
for update to authenticated
using (public.is_trip_admin(trip_id))
with check (public.is_trip_admin(trip_id));

drop policy if exists change_proposals_admin_delete on public.change_proposals;
create policy change_proposals_admin_delete on public.change_proposals
for delete to authenticated
using (public.is_trip_admin(trip_id));
