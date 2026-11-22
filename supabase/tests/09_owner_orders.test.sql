-- Step 10: New order and Edit order (T111).
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(9);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.categories (id, tenant_id, name, icon) values
  ('aaaaaaaa-c000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Burgers', '{"kind":"emoji","char":"🍔"}');
insert into public.items (id, tenant_id, category_id, name, base_price) values
  ('aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Classic Smash', 18900);
insert into public.item_variants (id, tenant_id, item_id, combo_key) values
  ('aaaaaaaa-b100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', '');

insert into public.orders (id, tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total) values
  ('aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', '2026-11-22', 1, 'tok-aaaa-0000-0001', 'K7QX', 'pickup', 'gcash', 'Maya Santos', '2026-11-22 12:30+08', '2026-11-22 12:10+08', 18900, 18900);
insert into public.order_lines (id, tenant_id, order_id, item_id, variant_id, name, qty, unit_price, line_total) values
  ('aaaaaaaa-0f00-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b100-0000-0000-000000000000', 'Classic Smash', 1, 18900, 18900);

select is(
  (select source || ':' || paid_amount || ':' || version from public.orders where id = 'aaaaaaaa-0d00-0000-0000-000000000000'),
  'storefront:0:1',
  'a checkout order is from the storefront, nothing paid yet, version 1'
);

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select lives_ok(
  $$ insert into public.orders (tenant_id, business_date, order_no, token, pickup_code, type, payment_method, payment_status, customer_name, due_at, start_by, subtotal, total, source, paid_amount)
     values ('aaaaaaaa-1111-0000-0000-000000000000', '2026-11-22', 2, 'tok-aaaa-0000-0002', 'K7QY', 'walk_in', 'cash', 'paid', 'Walk-in', now(), now(), 18900, 18900, 'owner', 18900) $$,
  'the shop makes a walk-in order, paid in cash'
);
select throws_ok(
  $$ insert into public.orders (tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total, source)
     values ('aaaaaaaa-1111-0000-0000-000000000000', '2026-11-22', 3, 'tok-aaaa-0000-0003', 'K7QZ', 'walk_in', 'cash', 'Walk-in', now(), now(), 18900, 18900, 'pos') $$,
  '23514', NULL, 'an order comes from the storefront or the owner only'
);
select throws_ok(
  $$ update public.orders set paid_amount = -1 where id = 'aaaaaaaa-0d00-0000-0000-000000000000' $$,
  '23514', NULL, 'the paid amount is never below zero'
);
select throws_ok(
  $$ update public.orders set version = 0 where id = 'aaaaaaaa-0d00-0000-0000-000000000000' $$,
  '23514', NULL, 'the version starts at 1'
);

-- An edit: the line changes, the order's version goes up, and the customer gets a chat line.
update public.order_lines set qty = 2, line_total = 37800 where id = 'aaaaaaaa-0f00-0000-0000-000000000000';
update public.orders set subtotal = 37800, total = 37800, version = version + 1, edited_at = now()
  where id = 'aaaaaaaa-0d00-0000-0000-000000000000';
select is(
  (select version from public.orders where id = 'aaaaaaaa-0d00-0000-0000-000000000000'),
  2,
  'an edit raises the version'
);
select lives_ok(
  $$ insert into public.order_messages (tenant_id, order_id, kind, "from", text)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'changed', 'shop', 'The shop changed your order: added 1 Classic Smash. New total ₱378.') $$,
  'the customer is told in their order chat'
);
select lives_ok(
  $$ delete from public.order_lines where id = 'aaaaaaaa-0f00-0000-0000-000000000000' $$,
  'an edit can remove a line'
);

set local role postgres;
select set_config('app.tenant_id', 'bbbbbbbb-2222-0000-0000-000000000000', true);
set local role app_api;
select is(
  (select count(*)::integer from public.orders),
  0,
  'another shop still sees none of these orders'
);

select * from finish();
rollback;
