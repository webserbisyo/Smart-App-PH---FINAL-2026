-- Database step 4: members (docs/blueprints/database.md section 4.4, decisions N35, M12, P8, T60, T95, D2).
-- A member is one person at one shop; one sign-in (auth.users, 6-digit email code) works at every
-- shop. Guests are not rows: an order keeps their name and phone. Member numbers (visits, spent,
-- stamps) are computed from orders and the stamp history, never stored (T60).

create table public.members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  email text check (email = lower(email) and char_length(email) between 3 and 254),
  name text not null check (char_length(name) between 1 and 80),
  phone text check (phone ~ '^\+639[0-9]{9}$'),
  -- A name tag the counter types or scans ("KS-4100"); it only opens the card (T60, D7).
  member_code text not null check (char_length(member_code) between 4 and 16),
  member_code_norm text generated always as (regexp_replace(upper(member_code), '[^A-Z0-9]', '', 'g')) stored,
  member_code_digits text generated always as (
    regexp_replace(regexp_replace(upper(member_code), '[^A-Z0-9]', '', 'g'), '^[A-Z]+', '')
  ) stored,
  -- The member's face, in the owner's picture shape (T95).
  avatar jsonb check (
    avatar is null
    or (jsonb_typeof(avatar) = 'object' and avatar ->> 'kind' in ('face', 'custom', 'initials', 'photo'))
  ),
  avatar_media_id uuid,
  joined_at timestamptz not null default now(),
  -- Removal on request: contacts blanked, the row kept for the shop's books.
  erased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, avatar_media_id) references public.media_files (tenant_id, id) on delete set null (avatar_media_id),
  check (erased_at is not null or email is not null),
  check (erased_at is null or (email is null and phone is null and user_id is null))
);

-- One membership per person per shop; a code (whole, or its digits on their own) opens one card only.
create unique index members_user on public.members (tenant_id, user_id) where user_id is not null;
create unique index members_email on public.members (tenant_id, email) where email is not null;
create unique index members_code on public.members (tenant_id, member_code_norm);
create unique index members_code_digits on public.members (tenant_id, member_code_digits) where member_code_digits <> '';
create index members_phone on public.members (tenant_id, phone) where phone is not null;
create index members_user_id on public.members (user_id);
create index members_avatar_media on public.members (avatar_media_id);

select private.apply_shop_rls('public.members');
grant select, insert, update on public.members to app_api;
grant select, insert, update, delete on public.members to app_admin;

create table public.member_addresses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null,
  label text not null check (char_length(label) between 1 and 30),
  address_line text not null check (char_length(address_line) between 1 and 160),
  house_no text check (char_length(house_no) <= 40),
  floor text check (char_length(floor) <= 40),
  landmark text check (char_length(landmark) <= 120),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  zone_id uuid,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete cascade,
  foreign key (tenant_id, zone_id) references public.delivery_zones (tenant_id, id) on delete set null (zone_id),
  check ((lat is null) = (lng is null))
);

create index member_addresses_member on public.member_addresses (member_id);
create index member_addresses_tenant on public.member_addresses (tenant_id);
create index member_addresses_zone on public.member_addresses (zone_id);

select private.apply_shop_rls('public.member_addresses');
grant select, insert, update, delete on public.member_addresses to app_api, app_admin;

-- What a member agreed to and when (Data Privacy Act record). Append-only: no update or delete.
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null,
  kind text not null check (kind in ('terms', 'privacy', 'marketing')),
  version text not null check (char_length(version) between 1 and 20),
  given boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete cascade
);

create index consents_member on public.consents (member_id, kind, created_at desc);
create index consents_tenant on public.consents (tenant_id);

select private.apply_shop_rls('public.consents');
grant select, insert on public.consents to app_api, app_admin;
