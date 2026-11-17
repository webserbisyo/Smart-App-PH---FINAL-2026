-- Database step 5: orders, payments and push (docs/blueprints/database.md sections 4.5 and 5,
-- decisions T48 to T56, T81, T84, T87, S29, N26). NestJS prices every order with the rules in core;
-- the database keeps the totals honest and guards what two requests could do at once.

-- Gap-free order numbers per shop per Manila day.
create table public.order_counters (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  business_date date not null,
  last_no integer not null check (last_no >= 1),
  primary key (tenant_id, business_date)
);

select private.apply_shop_rls('public.order_counters');
grant select, insert, update on public.order_counters to app_api;
grant select, insert, update, delete on public.order_counters to app_admin;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  business_date date not null,
  order_no integer not null check (order_no >= 1),
  -- The receipt link; the 4-character pickup code is made from it by core pickupCode().
  token text not null unique check (char_length(token) between 16 and 64),
  pickup_code text not null check (pickup_code ~ '^[2-9A-HJKMNP-Z]{4}$'),
  client_key text check (char_length(client_key) between 8 and 64),
  type text not null check (type in ('walk_in', 'pickup', 'delivery')),
  status text not null default 'placed'
    check (status in ('placed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'expired')),
  payment_method text not null check (payment_method in ('cash', 'cod', 'gcash', 'maya', 'bank', 'qr_ph')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'refunded')),
  payment_account_id uuid,
  member_id uuid,
  -- Who ordered, as typed at checkout (guests have no member row, M12).
  customer_name text not null check (char_length(customer_name) between 1 and 80),
  customer_phone text check (char_length(customer_phone) between 1 and 20),
  customer_email text check (char_length(customer_email) between 3 and 254),
  address_line text check (char_length(address_line) between 1 and 160),
  house_no text check (char_length(house_no) <= 40),
  floor text check (char_length(floor) <= 40),
  landmark text check (char_length(landmark) <= 120),
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  zone_id uuid,
  distance_m integer check (distance_m >= 0),
  placed_at timestamptz not null default now(),
  scheduled_at timestamptz,
  due_at timestamptz not null,
  start_by timestamptz not null,
  -- Transfers only: pay before this or the order expires (P3, 30 minutes by default).
  pay_by timestamptz,
  subtotal integer not null check (subtotal >= 0),
  discount integer not null default 0 check (discount >= 0),
  delivery_fee integer not null default 0 check (delivery_fee >= 0),
  total integer not null check (total >= 0),
  reward_title text check (char_length(reward_title) <= 60),
  note text check (char_length(note) <= 240),
  owner_note text check (char_length(owner_note) <= 300),
  seen_at timestamptz,
  last_step_at timestamptz not null default now(),
  rider_name text check (char_length(rider_name) between 1 and 60),
  rider_phone text check (char_length(rider_phone) between 1 and 20),
  rider_provider text check (char_length(rider_provider) <= 40),
  tracking_url text check (char_length(tracking_url) <= 500),
  refund_amount integer check (refund_amount >= 0),
  refund_reason text check (char_length(refund_reason) between 1 and 200),
  refunded_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, business_date, order_no),
  unique (tenant_id, client_key),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete set null (member_id),
  foreign key (tenant_id, payment_account_id) references public.payment_accounts (tenant_id, id) on delete restrict,
  foreign key (tenant_id, zone_id) references public.delivery_zones (tenant_id, id) on delete set null (zone_id),
  check (total = subtotal - discount + delivery_fee),
  check (discount <= subtotal),
  check (type = 'delivery' or (address_line is null and delivery_fee = 0)),
  check (type <> 'delivery' or address_line is not null),
  check ((lat is null) = (lng is null)),
  check (pay_by is null or payment_method in ('gcash', 'maya', 'bank', 'qr_ph')),
  check (status <> 'cancelled' or cancel_reason is not null),
  -- S29: a refund is all or nothing and marks the payment refunded.
  check ((refund_amount is null) = (refunded_at is null) and (refund_amount is null) = (refund_reason is null)),
  check ((payment_status = 'refunded') = (refunded_at is not null)),
  check (refund_amount is null or refund_amount <= total),
  check (start_by <= due_at)
);

create index orders_tenant_day on public.orders (tenant_id, business_date);
create index orders_tenant_open on public.orders (tenant_id, status)
  where status in ('placed', 'preparing', 'ready', 'out_for_delivery');
create index orders_tenant_scheduled on public.orders (tenant_id, scheduled_at) where scheduled_at is not null;
create index orders_tenant_member on public.orders (tenant_id, member_id, placed_at desc) where member_id is not null;
create index orders_unpaid_pay_by on public.orders (pay_by) where payment_status = 'unpaid' and status = 'placed';
create index orders_tenant_phone on public.orders (tenant_id, customer_phone, placed_at desc);
create index orders_tenant_pickup_code on public.orders (tenant_id, pickup_code);
create index orders_payment_account on public.orders (payment_account_id);
create index orders_zone on public.orders (zone_id);
create index orders_member on public.orders (member_id);

select private.apply_shop_rls('public.orders');
-- No delete: an order is cancelled, never removed.
grant select, insert, update on public.orders to app_api;
grant select, insert, update, delete on public.orders to app_admin;

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null,
  item_id uuid not null,
  variant_id uuid not null,
  -- The name and price at the moment of sale: history, not a copy of the menu.
  name text not null check (char_length(name) between 1 and 80),
  variant_label text check (char_length(variant_label) <= 100),
  note text not null default '' check (char_length(note) <= 120),
  qty integer not null check (qty between 1 and 99),
  unit_price integer not null check (unit_price >= 0),
  line_total integer not null,
  is_reward boolean not null default false,
  sort integer not null default 0 check (sort between 0 and 49),
  unique (tenant_id, id),
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade,
  -- An item that was ever ordered is archived, never deleted (item_has_orders).
  foreign key (tenant_id, item_id) references public.items (tenant_id, id) on delete restrict,
  foreign key (tenant_id, variant_id) references public.item_variants (tenant_id, id) on delete restrict,
  check (line_total = unit_price * qty)
);

create index order_lines_order on public.order_lines (order_id, sort);
create index order_lines_item on public.order_lines (item_id);
create index order_lines_variant on public.order_lines (variant_id);
create index order_lines_tenant on public.order_lines (tenant_id);

select private.apply_shop_rls('public.order_lines');
grant select, insert on public.order_lines to app_api;
grant select, insert, update, delete on public.order_lines to app_admin;

create table public.order_line_options (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  line_id uuid not null,
  option_id uuid not null,
  name text not null check (char_length(name) between 1 and 60),
  price integer not null check (price >= 0),
  primary key (line_id, option_id),
  foreign key (tenant_id, line_id) references public.order_lines (tenant_id, id) on delete cascade,
  foreign key (tenant_id, option_id) references public.options (tenant_id, id) on delete restrict
);

create index order_line_options_option on public.order_line_options (option_id);
create index order_line_options_tenant on public.order_line_options (tenant_id);

select private.apply_shop_rls('public.order_line_options');
grant select, insert on public.order_line_options to app_api;
grant select, insert, update, delete on public.order_line_options to app_admin;

-- Every status change. Append-only; Recall (T51) marks the last one undone instead of deleting it.
create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null,
  status text not null
    check (status in ('placed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'expired')),
  by text not null check (by in ('customer', 'shop', 'system')),
  at timestamptz not null default now(),
  undone_at timestamptz,
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade
);

create index order_events_order on public.order_events (order_id, at);
create index order_events_tenant on public.order_events (tenant_id);

select private.apply_shop_rls('public.order_events');
grant select, insert, update (undone_at) on public.order_events to app_api;
grant select, insert, update, delete on public.order_events to app_admin;

-- The order chat's own lines (T87). Status lines come from order_events and photo lines from
-- payment_proofs, so neither is copied here.
create table public.order_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null,
  kind text not null check (kind in ('rider', 'tracking', 'schedule')),
  "from" text not null check ("from" in ('customer', 'shop', 'system')),
  via text not null default 'app' check (via in ('app', 'messenger')),
  text text check (char_length(text) <= 300),
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade
);

create index order_messages_order on public.order_messages (order_id, created_at);
create index order_messages_tenant on public.order_messages (tenant_id);

select private.apply_shop_rls('public.order_messages');
grant select, insert, update (seen_at) on public.order_messages to app_api;
grant select, insert, update, delete on public.order_messages to app_admin;

-- Payment photos: at most 3 per order, a new one only after the shop said no (T81, checked by NestJS
-- under the order's row lock). The file goes after 30 days; the row and its reference stay.
create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null,
  media_id uuid,
  reference_no text check (char_length(reference_no) between 1 and 40),
  reference_norm text generated always as (nullif(upper(regexp_replace(reference_no, '\s', '', 'g')), '')) stored,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (char_length(reject_reason) <= 200),
  seen_at timestamptz,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade,
  foreign key (tenant_id, media_id) references public.media_files (tenant_id, id) on delete set null (media_id),
  check ((status = 'pending') = (decided_at is null)),
  check (status = 'rejected' or reject_reason is null)
);

-- duplicate_reference: the same reference cannot pay two orders unless it was turned down.
create unique index payment_proofs_reference on public.payment_proofs (tenant_id, reference_norm)
  where status <> 'rejected' and reference_norm is not null;
create index payment_proofs_order on public.payment_proofs (order_id, created_at);
create index payment_proofs_pending on public.payment_proofs (tenant_id) where status = 'pending';
create index payment_proofs_media on public.payment_proofs (media_id);
create index payment_proofs_decided_by on public.payment_proofs (decided_by);

select private.apply_shop_rls('public.payment_proofs');
grant select, insert, update (status, reject_reason, seen_at, decided_at, decided_by, media_id) on public.payment_proofs to app_api;
grant select, insert, update, delete on public.payment_proofs to app_admin;

create table public.order_ratings (
  order_id uuid primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  comment text check (char_length(comment) <= 300),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade
);

create index order_ratings_tenant on public.order_ratings (tenant_id);

select private.apply_shop_rls('public.order_ratings');
grant select, insert on public.order_ratings to app_api;
grant select, insert, update, delete on public.order_ratings to app_admin;

-- Web push for order status only (one row per phone per shop).
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 10 and 1000),
  p256dh text not null check (char_length(p256dh) between 10 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  member_id uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, endpoint),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete cascade
);

create index push_subscriptions_member on public.push_subscriptions (member_id);

select private.apply_shop_rls('public.push_subscriptions');
grant select, insert, delete on public.push_subscriptions to app_api;
grant select, insert, update, delete on public.push_subscriptions to app_admin;

create table public.order_push (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  order_id uuid not null,
  subscription_id uuid not null,
  primary key (order_id, subscription_id),
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete cascade,
  foreign key (tenant_id, subscription_id) references public.push_subscriptions (tenant_id, id) on delete cascade
);

create index order_push_subscription on public.order_push (subscription_id);
create index order_push_tenant on public.order_push (tenant_id);

select private.apply_shop_rls('public.order_push');
grant select, insert, delete on public.order_push to app_api, app_admin;

-- ---------------------------------------------------------------------------------------------
-- Guards for two requests at once (database.md section 5). security invoker: they run with the
-- caller's rights and inside its RLS, so they only ever touch the request's own shop.
-- ---------------------------------------------------------------------------------------------

-- The next order number for this shop on a Manila day; the upsert locks the counter row.
create function private.next_order_no(p_business_date date)
returns integer
language sql
volatile
set search_path = ''
as $$
  insert into public.order_counters as c (tenant_id, business_date, last_no)
  values (private.current_tenant(), p_business_date, 1)
  on conflict (tenant_id, business_date) do update set last_no = c.last_no + 1
  returning c.last_no
$$;

-- Take p_qty of an item's daily limit; false = daily_limit_reached. Items without a limit always pass.
create function private.take_daily_count(p_item_id uuid, p_business_date date, p_qty integer)
returns boolean
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if p_qty < 1 then
    raise exception 'qty must be positive' using errcode = '22023';
  end if;
  select i.daily_limit into v_limit
  from public.items i
  where i.id = p_item_id and i.tenant_id = private.current_tenant();
  if not found then
    return false;
  end if;
  insert into public.item_daily_counts (tenant_id, item_id, business_date, qty)
  values (private.current_tenant(), p_item_id, p_business_date, 0)
  on conflict (tenant_id, item_id, business_date) do nothing;
  update public.item_daily_counts c
     set qty = c.qty + p_qty
   where c.tenant_id = private.current_tenant()
     and c.item_id = p_item_id
     and c.business_date = p_business_date
     and (v_limit is null or c.qty + p_qty <= v_limit);
  return found;
end;
$$;

-- Give a cancelled or expired order's quantity back, once (never below zero).
create function private.give_back_daily_count(p_item_id uuid, p_business_date date, p_qty integer)
returns void
language sql
volatile
set search_path = ''
as $$
  update public.item_daily_counts c
     set qty = greatest(c.qty - p_qty, 0)
   where c.tenant_id = private.current_tenant()
     and c.item_id = p_item_id
     and c.business_date = p_business_date
$$;

-- Hold one booking time for this shop until the transaction ends, so two orders cannot both take
-- the last place; the caller then counts the slot's orders (slot_full).
create function private.lock_slot(p_slot timestamptz)
returns void
language sql
volatile
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(private.current_tenant()::text || '|' || p_slot::text, 0)
  )
$$;

revoke execute on function private.next_order_no(date) from public;
revoke execute on function private.take_daily_count(uuid, date, integer) from public;
revoke execute on function private.give_back_daily_count(uuid, date, integer) from public;
revoke execute on function private.lock_slot(timestamptz) from public;
grant execute on function private.next_order_no(date) to app_api, app_admin;
grant execute on function private.take_daily_count(uuid, date, integer) to app_api, app_admin;
grant execute on function private.give_back_daily_count(uuid, date, integer) to app_api, app_admin;
grant execute on function private.lock_slot(timestamptz) to app_api, app_admin;
