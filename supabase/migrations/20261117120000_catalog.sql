-- Database step 3: catalog (docs/blueprints/database.md section 4.3, decisions N4, T46, N26, T48).
-- No stock counts in A (N26, D3). A variant's price is computed (override, else base + deltas);
-- NestJS checks it with computedVariantPrice before saving.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  -- CategoryIconSchema: a Fluent icon, an emoji or an image (then icon_media_id holds the file).
  icon jsonb not null check (jsonb_typeof(icon) = 'object' and icon ->> 'kind' in ('fluent', 'emoji', 'image')),
  icon_media_id uuid,
  sort integer not null default 0 check (sort >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, icon_media_id) references public.media_files (tenant_id, id) on delete restrict,
  check ((icon ->> 'kind' = 'image') = (icon_media_id is not null))
);

create index categories_tenant on public.categories (tenant_id, sort);
create index categories_icon_media on public.categories (icon_media_id);

select private.apply_shop_rls('public.categories');
grant select, insert, update, delete on public.categories to app_api, app_admin;

create table public.items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  base_price integer not null check (base_price >= 0),
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),
  featured boolean not null default false,
  is_new boolean not null default false,
  notice_days integer not null default 0 check (notice_days between 0 and 30),
  daily_limit integer check (daily_limit between 1 and 500),
  is_sample boolean not null default false,
  sort integer not null default 0 check (sort >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  -- category_not_empty: a category with items cannot be deleted.
  foreign key (tenant_id, category_id) references public.categories (tenant_id, id) on delete restrict
);

create index items_tenant_status on public.items (tenant_id, status, sort);
create index items_category on public.items (category_id);

select private.apply_shop_rls('public.items');
grant select, insert, update, delete on public.items to app_api, app_admin;

create table public.item_photos (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null,
  media_id uuid not null,
  sort integer not null default 0 check (sort between 0 and 4),
  is_cover boolean not null default false,
  primary key (item_id, media_id),
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete cascade,
  foreign key (tenant_id, media_id) references public.media_files (tenant_id, id) on delete restrict
);

create unique index item_photos_one_cover on public.item_photos (item_id) where is_cover;
create index item_photos_media on public.item_photos (media_id);
create index item_photos_tenant on public.item_photos (tenant_id);

select private.apply_shop_rls('public.item_photos');
grant select, insert, update, delete on public.item_photos to app_api, app_admin;

-- ---------------------------------------------------------------------------------------------
-- Variants (T46): reusable templates, up to 3 choice rows per item, values with a price change,
-- and one row per sellable combination.
-- ---------------------------------------------------------------------------------------------
create table public.variant_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create unique index variant_templates_name on public.variant_templates (tenant_id, lower(name));

select private.apply_shop_rls('public.variant_templates');
grant select, insert, update, delete on public.variant_templates to app_api, app_admin;

create table public.variant_template_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  template_id uuid not null,
  label text not null check (char_length(label) between 1 and 30),
  sort integer not null default 0 check (sort >= 0),
  foreign key (tenant_id, template_id) references public.variant_templates (tenant_id, id) on delete cascade
);

create unique index variant_template_values_label on public.variant_template_values (template_id, lower(label));
create index variant_template_values_tenant on public.variant_template_values (tenant_id);

select private.apply_shop_rls('public.variant_template_values');
grant select, insert, update, delete on public.variant_template_values to app_api, app_admin;

create table public.item_axes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null,
  name text not null check (char_length(name) between 1 and 30),
  template_id uuid,
  position smallint not null check (position between 0 and 2),
  unique (tenant_id, id),
  unique (item_id, position),
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete cascade,
  foreign key (tenant_id, template_id) references public.variant_templates (tenant_id, id) on delete set null (template_id)
);

create unique index item_axes_name on public.item_axes (item_id, lower(name));
create unique index item_axes_template on public.item_axes (item_id, template_id) where template_id is not null;
create index item_axes_tenant on public.item_axes (tenant_id);
create index item_axes_template_id on public.item_axes (template_id);

select private.apply_shop_rls('public.item_axes');
grant select, insert, update, delete on public.item_axes to app_api, app_admin;

create table public.item_axis_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  axis_id uuid not null,
  label text not null check (char_length(label) between 1 and 30),
  price_delta integer not null default 0 check (price_delta >= 0),
  media_id uuid,
  sort integer not null default 0 check (sort between 0 and 9),
  unique (tenant_id, id),
  foreign key (tenant_id, axis_id) references public.item_axes (tenant_id, id) on delete cascade,
  foreign key (tenant_id, media_id) references public.media_files (tenant_id, id) on delete restrict
);

create unique index item_axis_values_label on public.item_axis_values (axis_id, lower(label));
create index item_axis_values_tenant on public.item_axis_values (tenant_id);
create index item_axis_values_media on public.item_axis_values (media_id);

select private.apply_shop_rls('public.item_axis_values');
grant select, insert, update, delete on public.item_axis_values to app_api, app_admin;

create table public.item_variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null,
  -- The sorted ids of its values ('' for an item without choices), so a combination exists once.
  combo_key text not null,
  price_override integer check (price_override >= 0),
  availability text not null default 'available' check (availability in ('available', 'sold_out_today', 'sold_out')),
  sold_out_until timestamptz,
  sort integer not null default 0 check (sort between 0 and 29),
  unique (tenant_id, id),
  unique (item_id, combo_key),
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete cascade,
  check (sold_out_until is null or availability = 'sold_out_today')
);

create index item_variants_tenant on public.item_variants (tenant_id);

select private.apply_shop_rls('public.item_variants');
grant select, insert, update, delete on public.item_variants to app_api, app_admin;

-- Many-to-many: a variant is one value from each of its item's choice rows. Only (variant, value) is
-- stored: adding axis_id here would make value -> axis a determinant that is not a key (BCNF).
create table public.item_variant_values (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  variant_id uuid not null,
  axis_value_id uuid not null,
  primary key (variant_id, axis_value_id),
  foreign key (tenant_id, variant_id) references public.item_variants (tenant_id, id) on delete cascade,
  foreign key (tenant_id, axis_value_id) references public.item_axis_values (tenant_id, id) on delete cascade
);

create index item_variant_values_value on public.item_variant_values (axis_value_id);
create index item_variant_values_tenant on public.item_variant_values (tenant_id);

select private.apply_shop_rls('public.item_variant_values');
grant select, insert, delete on public.item_variant_values to app_api, app_admin;

-- ---------------------------------------------------------------------------------------------
-- Add-ons: a shared library of questions (N4), joined to items many-to-many.
-- ---------------------------------------------------------------------------------------------
create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  min_pick integer not null default 0 check (min_pick between 0 and 10),
  max_pick integer not null default 1 check (max_pick between 1 and 10),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  check (min_pick <= max_pick)
);

select private.apply_shop_rls('public.option_groups');
grant select, insert, update, delete on public.option_groups to app_api, app_admin;

create table public.options (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  group_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  price_delta integer not null default 0 check (price_delta >= 0),
  is_default boolean not null default false,
  sold_out boolean not null default false,
  sort integer not null default 0 check (sort between 0 and 19),
  unique (tenant_id, id),
  foreign key (tenant_id, group_id) references public.option_groups (tenant_id, id) on delete cascade
);

create index options_group on public.options (group_id, sort);
create index options_tenant on public.options (tenant_id);

select private.apply_shop_rls('public.options');
grant select, insert, update, delete on public.options to app_api, app_admin;

create table public.item_option_groups (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null,
  group_id uuid not null,
  sort integer not null default 0 check (sort >= 0),
  primary key (item_id, group_id),
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete cascade,
  foreign key (tenant_id, group_id) references public.option_groups (tenant_id, id) on delete cascade
);

create index item_option_groups_group on public.item_option_groups (group_id);
create index item_option_groups_tenant on public.item_option_groups (tenant_id);

select private.apply_shop_rls('public.item_option_groups');
grant select, insert, update, delete on public.item_option_groups to app_api, app_admin;

-- "Goes well with" (at most 4 per item, checked by NestJS).
create table public.item_pairings (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null,
  paired_item_id uuid not null,
  sort integer not null default 0 check (sort between 0 and 3),
  primary key (item_id, paired_item_id),
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete cascade,
  foreign key (tenant_id, paired_item_id) references public.items (tenant_id, id) on delete cascade,
  check (item_id <> paired_item_id)
);

create index item_pairings_paired on public.item_pairings (paired_item_id);
create index item_pairings_tenant on public.item_pairings (tenant_id);

select private.apply_shop_rls('public.item_pairings');
grant select, insert, update, delete on public.item_pairings to app_api, app_admin;

-- How many of an item were ordered on a Manila day, kept by place_order, cancel and expire in the
-- same transaction so daily_limit holds when two orders come at once (planned copy).
create table public.item_daily_counts (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  item_id uuid not null,
  business_date date not null,
  qty integer not null default 0 check (qty >= 0),
  primary key (tenant_id, item_id, business_date),
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete cascade
);

create index item_daily_counts_item on public.item_daily_counts (item_id);

select private.apply_shop_rls('public.item_daily_counts');
grant select, insert, update on public.item_daily_counts to app_api;
grant select, insert, update, delete on public.item_daily_counts to app_admin;
