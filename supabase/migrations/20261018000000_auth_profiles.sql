-- Migration: Auth Profiles and Lockdown
-- Lock down default privileges in public schema
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

revoke execute on all functions in schema public from public;

-- Private schema for internal trigger functions and helpers
create schema if not exists private;
revoke all on schema private from anon, authenticated, public;

-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) between 1 and 80),
  created_at timestamptz not null default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Grant column-level access to authenticated users
grant select, update (full_name) on public.profiles to authenticated;

-- Policies: users can only select and update their own profile
create policy "Users can select own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profile creation trigger on new user signup
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
begin
  v_full_name := pg_catalog.coalesce(
    pg_catalog.nullif(pg_catalog.trim(new.raw_user_meta_data->>'full_name'), ''),
    pg_catalog.nullif(pg_catalog.split_part(new.email, '@', 1), ''),
    'User'
  );

  v_full_name := pg_catalog.substring(v_full_name from 1 for 80);

  insert into public.profiles (id, full_name, created_at)
  values (new.id, v_full_name, pg_catalog.now())
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
