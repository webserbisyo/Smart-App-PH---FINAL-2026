-- Step 10 (T111): New order and Edit order. No new tables (still 55).
-- orders: who made the order, how much is paid so far, and a version so two edits never cross.
-- order_messages: the customer's chat line when the shop changes their order.
-- order_lines and order_line_options: an edit replaces the lines, so the API may update and delete them.
-- RLS: these tables already have shop_own and shop_admin (private.apply_shop_rls, 20261117140000_orders.sql);
-- this file only adds columns, a CHECK and grants, and keeps those policies as they are.

alter table public.orders
  -- 'owner' = made by the shop with New order (walk-in, Messenger); 'storefront' = the customer's checkout.
  add column source text not null default 'storefront' check (source in ('storefront', 'owner')),
  -- Centavos paid so far. Above the total after an edit made the order smaller, until the change is given back.
  add column paid_amount integer not null default 0 check (paid_amount >= 0),
  -- Goes up by one on every edit; an edit sent with an older version is refused (order_changed).
  add column version integer not null default 1 check (version >= 1),
  -- The last time the shop changed the order, shown as "Changed 3:40 PM".
  add column edited_at timestamptz;

-- Orders that were paid before this step count as fully paid.
update public.orders set paid_amount = total where payment_status in ('paid', 'refunded');

alter table public.order_messages drop constraint order_messages_kind_check;
alter table public.order_messages
  add constraint order_messages_kind_check check (kind in ('rider', 'tracking', 'schedule', 'changed'));

grant update, delete on public.order_lines to app_api;
grant update, delete on public.order_line_options to app_api;
