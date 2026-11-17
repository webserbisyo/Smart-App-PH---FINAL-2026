-- Database step 1: platform core (docs/blueprints/database.md section 10, decision T96).
-- Roles the API takes for each request, the request context helpers, shops, owners and the platform
-- tables. RLS, grants and policies live with each table (AGENTS rule 8).

-- ---------------------------------------------------------------------------------------------
-- Roles (D1). NestJS connects as postgres through the pooler and runs every request in one
-- transaction that starts with `set local role app_api` (or app_admin for Super Admin) and sets
-- app.tenant_id / app.user_id. Neither role can log in.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_api') then
    create role app_api nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'app_admin') then
    create role app_admin nologin noinherit;
  end if;
end
$$;

grant app_api to postgres;
grant app_admin to postgres;

grant usage on schema public to app_api, app_admin;
grant usage on schema private to app_api, app_admin;

-- New functions never run for anyone unless granted (Supabase grants execute to PUBLIC by default).
alter default privileges in schema private revoke execute on functions from public;

-- D7: a security definer helper that a project setting created on the dev project. It is not in
-- our migrations, so revoke it only when it exists.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

-- T34: browsers never reach tables. Profiles were readable by `authenticated` in the first
-- migration; nothing uses that, so it is closed here.
revoke all on public.profiles from anon, authenticated;
drop policy if exists "Users can select own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- ---------------------------------------------------------------------------------------------
-- Request context (set by NestJS with set_config(..., true), so it ends with the transaction).
-- ---------------------------------------------------------------------------------------------
create function private.current_tenant()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid
$$;

create function private.current_user_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

grant execute on function private.current_tenant() to app_api, app_admin;
grant execute on function private.current_user_id() to app_api, app_admin;

-- ---------------------------------------------------------------------------------------------
-- profiles: one row per login (exists). Adds the owner's mobile and picture (T68, T93).
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  add column phone text check (phone ~ '^\+639[0-9]{9}$'),
  add column avatar jsonb check (
    avatar is null
    or (jsonb_typeof(avatar) = 'object' and avatar ->> 'kind' in ('face', 'custom', 'initials', 'photo'))
  ),
  add column updated_at timestamptz not null default now();

grant select, update (full_name, phone, avatar, updated_at) on public.profiles to app_api;
grant select on public.profiles to app_admin;

create policy profiles_own on public.profiles
  for all to app_api
  using (id = private.current_user_id())
  with check (id = private.current_user_id());

create policy profiles_admin on public.profiles
  for select to app_admin
  using (true);

-- ---------------------------------------------------------------------------------------------
-- platform_settings: the one row the founder edits in Super Admin › Setup (T92).
-- ---------------------------------------------------------------------------------------------
create table public.platform_settings (
  id boolean primary key default true check (id),
  price_monthly integer not null default 39900 check (price_monthly >= 100),
  trial_days integer not null default 14 check (trial_days between 0 and 60),
  six_month_bonus boolean not null default true,
  pay_to_name text not null default 'Smart App PH' check (char_length(pay_to_name) between 1 and 80),
  pay_to_gcash text not null default '' check (char_length(pay_to_gcash) <= 40),
  pay_to_maya text not null default '' check (char_length(pay_to_maya) <= 40),
  messenger_url text check (char_length(messenger_url) <= 200),
  tracking_sending boolean not null default false,
  tracking_test_mode boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true);

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant select on public.platform_settings to app_api;
grant select, update on public.platform_settings to app_admin;

create policy platform_settings_read on public.platform_settings
  for select to app_api, app_admin
  using (true);

create policy platform_settings_admin on public.platform_settings
  for update to app_admin
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------------------------
-- signup_leads: step 1 of sign-up, saved before any account exists (T89). 180 days unless a shop (D6).
-- ---------------------------------------------------------------------------------------------
create table public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 80),
  email text not null check (email = lower(email) and char_length(email) between 3 and 254),
  phone text not null check (phone ~ '^\+639[0-9]{9}$'),
  terms_version text not null check (char_length(terms_version) between 1 and 20),
  channel text not null check (channel in ('facebook_ad', 'link', 'direct')),
  campaign text check (char_length(campaign) <= 100),
  fbp text check (char_length(fbp) <= 600),
  fbc text check (char_length(fbc) <= 600),
  contacted_at timestamptz,
  tenant_id uuid,
  created_at timestamptz not null default now()
);

create index signup_leads_created_at on public.signup_leads (created_at);
create index signup_leads_email on public.signup_leads (email);

alter table public.signup_leads enable row level security;
revoke all on public.signup_leads from anon, authenticated;
grant insert on public.signup_leads to app_api;
grant select, update (tenant_id) on public.signup_leads to app_api;
grant select, update (contacted_at), delete on public.signup_leads to app_admin;

-- The public sign-up page saves a lead; the API turns it into a shop for the new owner only.
create policy signup_leads_insert on public.signup_leads
  for insert to app_api
  with check (tenant_id is null);

create policy signup_leads_own on public.signup_leads
  for select to app_api
  using (tenant_id = private.current_tenant());

create policy signup_leads_convert on public.signup_leads
  for update to app_api
  using (tenant_id is null)
  with check (tenant_id = private.current_tenant());

create policy signup_leads_admin on public.signup_leads
  for all to app_admin
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------------------------
-- tenants: one row per shop. Plan status is computed by planStatus in core, never stored (T67).
-- ---------------------------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 40),
  name text not null check (char_length(name) between 1 and 60),
  kind text not null check (kind in ('food', 'retail')),
  stage text not null default 'setting_up' check (stage in ('setting_up', 'asked', 'live', 'closed')),
  city text not null default '' check (char_length(city) <= 60),
  facebook_page text check (char_length(facebook_page) <= 200),
  channel text not null default 'direct' check (channel in ('facebook_ad', 'link', 'direct')),
  campaign text check (char_length(campaign) <= 100),
  is_demo boolean not null default false,
  price_monthly integer not null check (price_monthly >= 100),
  storage_limit_bytes bigint not null default 524288000 check (storage_limit_bytes > 0),
  trial_ends_at timestamptz,
  paid_until date,
  asked_at timestamptz,
  live_at timestamptz,
  reminded_at timestamptz,
  closes_on date,
  close_reason text check (close_reason in ('not_paying', 'owner_asked', 'duplicate', 'not_real', 'other')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stage not in ('asked', 'live') or asked_at is not null),
  check (stage <> 'live' or live_at is not null),
  check (stage <> 'closed' or (closed_at is not null and close_reason is not null))
);

create index tenants_stage on public.tenants (stage);

alter table public.signup_leads
  add constraint signup_leads_tenant_fk foreign key (tenant_id) references public.tenants (id) on delete set null;
create index signup_leads_tenant on public.signup_leads (tenant_id);

alter table public.tenants enable row level security;
revoke all on public.tenants from anon, authenticated;
grant select, insert, update (name, city, facebook_page, stage, asked_at, updated_at) on public.tenants to app_api;
grant select, insert, update, delete on public.tenants to app_admin;

-- The owner creates the shop with the id NestJS generated and set as the request's tenant.
create policy tenants_own on public.tenants
  for all to app_api
  using (id = private.current_tenant())
  with check (id = private.current_tenant());

create policy tenants_admin on public.tenants
  for all to app_admin
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------------------------
-- tenant_members: who runs which shop. One shop per owner in MVP A (unique user_id).
-- ---------------------------------------------------------------------------------------------
create table public.tenant_members (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  notify_new_order boolean not null default true,
  notify_payment_to_check boolean not null default true,
  notify_storage boolean not null default true,
  notify_plan_payment boolean not null default true,
  notify_email text check (char_length(notify_email) between 3 and 254),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id),
  unique (user_id)
);

alter table public.tenant_members enable row level security;
revoke all on public.tenant_members from anon, authenticated;
grant select, insert, update (notify_new_order, notify_payment_to_check, notify_storage, notify_plan_payment, notify_email)
  on public.tenant_members to app_api;
grant select, insert, update, delete on public.tenant_members to app_admin;

-- Before the shop is known, the signed-in owner may look up their own membership (rule 12: the shop
-- comes from tenant_members, never from the URL or body).
create policy tenant_members_read on public.tenant_members
  for select to app_api
  using (user_id = private.current_user_id() or tenant_id = private.current_tenant());

create policy tenant_members_join on public.tenant_members
  for insert to app_api
  with check (tenant_id = private.current_tenant() and user_id = private.current_user_id());

create policy tenant_members_prefs on public.tenant_members
  for update to app_api
  using (tenant_id = private.current_tenant() and user_id = private.current_user_id())
  with check (tenant_id = private.current_tenant() and user_id = private.current_user_id());

create policy tenant_members_admin on public.tenant_members
  for all to app_admin
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------------------------
-- reserved_slugs: links nobody may take.
-- ---------------------------------------------------------------------------------------------
create table public.reserved_slugs (
  slug text primary key check (slug = lower(slug))
);

insert into public.reserved_slugs (slug) values
  ('admin'), ('api'), ('app'), ('www'), ('shop'), ('shops'), ('login'), ('logout'), ('signup'),
  ('account'), ('help'), ('support'), ('privacy'), ('terms'), ('kit'), ('dashboard'), ('settings'),
  ('static'), ('assets'), ('preview'), ('offline'), ('smartapp'), ('webserbisyo'), ('mail'), ('status');

alter table public.reserved_slugs enable row level security;
revoke all on public.reserved_slugs from anon, authenticated;
grant select on public.reserved_slugs to app_api;
grant select, insert, delete on public.reserved_slugs to app_admin;

create policy reserved_slugs_read on public.reserved_slugs
  for select to app_api, app_admin
  using (true);

create policy reserved_slugs_admin on public.reserved_slugs
  for all to app_admin
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------------------------
-- Lookups that must cross the shop wall. security definer only in private (Supabase guidance), with
-- an empty search_path, answering only the one fact the caller needs.
-- ---------------------------------------------------------------------------------------------

-- The storefront finds a shop by its link. Only a live shop answers (a demo shop too); anything else
-- is Not found (rule 12).
create function private.tenant_by_slug(p_slug text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select t.id
  from public.tenants t
  where t.slug = lower(p_slug)
    and (t.stage = 'live' or t.is_demo)
    and (t.closes_on is null or t.closes_on > (now() at time zone 'Asia/Manila')::date)
$$;

-- Sign-up and Settings ask whether a link is free (isSlugFree).
create function private.slug_is_free(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.tenants t where t.slug = lower(p_slug))
     and not exists (select 1 from public.reserved_slugs r where r.slug = lower(p_slug))
$$;

revoke execute on function private.tenant_by_slug(text) from public;
revoke execute on function private.slug_is_free(text) from public;
grant execute on function private.tenant_by_slug(text) to app_api;
grant execute on function private.slug_is_free(text) to app_api;
