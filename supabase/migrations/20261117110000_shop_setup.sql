-- Database step 2: files and shop setup (docs/blueprints/database.md, decision T96).
-- media_files comes first because the payment QR, the look and (step 3) item photos point at it.

-- ---------------------------------------------------------------------------------------------
-- One helper for the wall every shop table gets: RLS on, nothing for browsers' roles, the API sees
-- only the request's shop, the founder's role sees all. Grants stay explicit in each step.
-- ---------------------------------------------------------------------------------------------
create function private.apply_shop_rls(p_table regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('alter table %s enable row level security', p_table);
  execute format('revoke all on %s from anon, authenticated', p_table);
  execute format(
    'create policy shop_own on %s for all to app_api using (tenant_id = private.current_tenant()) with check (tenant_id = private.current_tenant())',
    p_table
  );
  execute format('create policy shop_admin on %s for all to app_admin using (true) with check (true)', p_table);
end;
$$;

revoke execute on function private.apply_shop_rls(regclass) from public;

-- ---------------------------------------------------------------------------------------------
-- media_files: every stored file has a row, so the 500 MB meter is a sum (T66) and a file in use is
-- protected by the restrict keys pointing at it (file_locked, T93).
-- ---------------------------------------------------------------------------------------------
create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (
    kind in ('logo', 'banner', 'item', 'category', 'qr', 'avatar', 'plan_proof', 'proof', 'member_photo')
  ),
  bucket text not null check (bucket in ('menu', 'look', 'qr', 'profile', 'proofs', 'plan-proofs')),
  path text not null unique check (char_length(path) between 3 and 300),
  bytes bigint not null check (bytes >= 0),
  mime text not null check (mime in ('image/webp', 'image/jpeg', 'image/png', 'image/gif')),
  width integer check (width > 0),
  height integer check (height > 0),
  uploaded_by uuid references auth.users (id) on delete set null,
  -- Plan receipts never count against the shop's storage (T66).
  counts_toward_limit boolean generated always as (kind <> 'plan_proof') stored,
  confirmed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  -- The path always starts with the shop's id (<tenant_id>/<kind>/<uuid>.<ext>).
  check (starts_with(path, tenant_id::text || '/'))
);

create index media_files_tenant_kind on public.media_files (tenant_id, kind) where deleted_at is null;
create index media_files_unconfirmed on public.media_files (created_at) where confirmed_at is null and deleted_at is null;
create index media_files_uploaded_by on public.media_files (uploaded_by);

select private.apply_shop_rls('public.media_files');
grant select, insert, update (confirmed_at, deleted_at) on public.media_files to app_api;
grant select, insert, update, delete on public.media_files to app_admin;

-- ---------------------------------------------------------------------------------------------
-- shop_settings: the shop's facts and ordering rules, one row per shop (T64, BookingRules).
-- ---------------------------------------------------------------------------------------------
create table public.shop_settings (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  phone text check (char_length(phone) between 1 and 20),
  messenger_username text check (char_length(messenger_username) between 1 and 100),
  facebook_url text check (char_length(facebook_url) <= 200),
  google_review_url text check (char_length(google_review_url) <= 300),
  address text check (char_length(address) between 1 and 200),
  show_address boolean not null default true,
  pin_lat double precision check (pin_lat between -90 and 90),
  pin_lng double precision check (pin_lng between -180 and 180),
  pickup_note text check (char_length(pickup_note) <= 200),
  walk_in_on boolean not null default true,
  pickup_on boolean not null default true,
  delivery_on boolean not null default false,
  days_ahead integer not null default 7 check (days_ahead between 1 and 60),
  slot_minutes integer not null default 30 check (slot_minutes in (15, 30, 60)),
  orders_per_slot integer check (orders_per_slot between 1 and 50),
  prep_minutes integer not null default 20 check (prep_minutes between 5 and 180),
  take_orders_while_closed boolean not null default true,
  cod_max_total integer check (cod_max_total >= 0),
  free_delivery_from integer check (free_delivery_from >= 0),
  busy_until timestamptz,
  paused boolean not null default false,
  updated_at timestamptz not null default now(),
  -- last_order_type: at least one way to order stays on.
  check (walk_in_on or pickup_on or delivery_on),
  check ((pin_lat is null) = (pin_lng is null))
);

select private.apply_shop_rls('public.shop_settings');
grant select, insert, update on public.shop_settings to app_api;
grant select, insert, update, delete on public.shop_settings to app_admin;

-- ---------------------------------------------------------------------------------------------
-- storefront_content: the Editor's draft and what customers see, each saved and read whole and
-- checked by StorefrontContentSchema in NestJS (a planned exception to 1NF: never filtered or joined).
-- ---------------------------------------------------------------------------------------------
create table public.storefront_content (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  draft jsonb not null check (jsonb_typeof(draft) = 'object'),
  published jsonb not null check (jsonb_typeof(published) = 'object'),
  draft_version integer not null default 0 check (draft_version >= 0),
  published_version integer not null default 0 check (published_version >= 0),
  saved_at timestamptz,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

select private.apply_shop_rls('public.storefront_content');
grant select, insert, update on public.storefront_content to app_api;
grant select, insert, update, delete on public.storefront_content to app_admin;

-- The files the draft or published look uses (logo, banners, opening screen), rewritten on every
-- save, so a file in use cannot be deleted.
create table public.storefront_media (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  media_id uuid not null,
  primary key (tenant_id, media_id),
  foreign key (tenant_id, media_id) references public.media_files (tenant_id, id) on delete restrict
);

create index storefront_media_media on public.storefront_media (media_id);

select private.apply_shop_rls('public.storefront_media');
grant select, insert, delete on public.storefront_media to app_api;
grant select, insert, delete on public.storefront_media to app_admin;

-- ---------------------------------------------------------------------------------------------
-- Opening hours and closed days (Manila time; overlap rules live in core hoursProblems).
-- ---------------------------------------------------------------------------------------------
create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  created_at timestamptz not null default now(),
  check (closes > opens)
);

create index opening_hours_tenant on public.opening_hours (tenant_id, weekday);

select private.apply_shop_rls('public.opening_hours');
grant select, insert, update, delete on public.opening_hours to app_api, app_admin;

create table public.closures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  date date not null,
  reason text check (char_length(reason) <= 80),
  created_at timestamptz not null default now(),
  unique (tenant_id, date)
);

select private.apply_shop_rls('public.closures');
grant select, insert, update, delete on public.closures to app_api, app_admin;

-- ---------------------------------------------------------------------------------------------
-- payment_accounts: every way the shop takes money (cash and COD are accounts too). Removed, never
-- deleted, so old orders still show where the money went (T84).
-- ---------------------------------------------------------------------------------------------
create table public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  method text not null check (method in ('cash', 'cod', 'gcash', 'maya', 'bank', 'qr_ph')),
  bank text check (
    bank in ('bdo', 'bpi', 'metrobank', 'landbank', 'pnb', 'security_bank', 'unionbank', 'rcbc',
             'chinabank', 'eastwest', 'gotyme', 'seabank', 'other')
  ),
  account_name text check (char_length(account_name) between 1 and 80),
  account_number text check (char_length(account_number) between 1 and 40),
  qr_media_id uuid,
  is_sample boolean not null default false,
  sort integer not null default 0,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, qr_media_id) references public.media_files (tenant_id, id) on delete restrict,
  -- bank_required: a bank account names its bank, nothing else does.
  check ((method = 'bank') = (bank is not null)),
  -- A transfer needs a name and a number; cash and COD have neither.
  check (
    (method in ('cash', 'cod') and account_name is null and account_number is null and qr_media_id is null)
    or (method not in ('cash', 'cod') and account_name is not null and account_number is not null)
  )
);

-- One live account per method, except banks (up to 3, checked by NestJS).
create unique index payment_accounts_one_per_method
  on public.payment_accounts (tenant_id, method)
  where removed_at is null and method <> 'bank';
create index payment_accounts_qr on public.payment_accounts (qr_media_id);

select private.apply_shop_rls('public.payment_accounts');
grant select, insert, update on public.payment_accounts to app_api;
grant select, insert, update, delete on public.payment_accounts to app_admin;

-- ---------------------------------------------------------------------------------------------
-- Delivery: fee by straight-line distance (at most 5 rows) and by named zone (at most 20) (N25).
-- ---------------------------------------------------------------------------------------------
create table public.delivery_distance_rows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  from_m integer not null check (from_m >= 0),
  to_m integer not null,
  fee integer not null check (fee >= 0),
  eta_text text not null check (char_length(eta_text) between 1 and 40),
  min_order integer not null default 0 check (min_order >= 0),
  created_at timestamptz not null default now(),
  check (to_m > from_m)
);

create index delivery_distance_rows_tenant on public.delivery_distance_rows (tenant_id, from_m);

select private.apply_shop_rls('public.delivery_distance_rows');
grant select, insert, update, delete on public.delivery_distance_rows to app_api, app_admin;

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  fee integer not null check (fee >= 0),
  eta_text text not null check (char_length(eta_text) between 1 and 40),
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

select private.apply_shop_rls('public.delivery_zones');
grant select, insert, update, delete on public.delivery_zones to app_api, app_admin;
