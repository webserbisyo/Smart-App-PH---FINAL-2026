-- Step 5: orders.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(15);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.categories (id, tenant_id, name, icon) values
  ('aaaaaaaa-c000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Burgers', '{"kind":"emoji","char":"🍔"}');
insert into public.items (id, tenant_id, category_id, name, base_price, daily_limit) values
  ('aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Classic Smash', 18900, null),
  ('aaaaaaaa-2000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Ube Cake', 45000, 2);
insert into public.item_variants (id, tenant_id, item_id, combo_key) values
  ('aaaaaaaa-b100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', '');

insert into public.orders (id, tenant_id, business_date, order_no, token, pickup_code, client_key, type, payment_method, customer_name, due_at, start_by, subtotal, total) values
  ('aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 1, 'tok-aaaa-0000-0001', 'K7QX', 'client-key-0001', 'pickup', 'gcash', 'Maya Santos', '2026-11-17 12:30+08', '2026-11-17 12:10+08', 18900, 18900),
  ('bbbbbbbb-0d00-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', '2026-11-17', 1, 'tok-bbbb-0000-0001', 'T4RM', null, 'pickup', 'cash', 'Leo Cruz', '2026-11-17 12:30+08', '2026-11-17 12:10+08', 59900, 59900);
insert into public.order_lines (tenant_id, order_id, item_id, variant_id, name, qty, unit_price, line_total) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b100-0000-0000-000000000000', 'Classic Smash', 1, 18900, 18900);
insert into public.order_events (id, tenant_id, order_id, status, by) values
  ('aaaaaaaa-0e00-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'placed', 'customer');
insert into public.payment_proofs (tenant_id, order_id, reference_no) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', '1234 5678 9012');

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select results_eq($$ select customer_name from public.orders $$, ARRAY['Maya Santos'], 'a shop sees only its own orders');
select throws_ok(
  $$ insert into public.orders (tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total)
     values ('aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 2, 'tok-aaaa-0000-0002', 'K7QY', 'pickup', 'cash', 'Leo', now(), now(), 18900, 100) $$,
  '23514', NULL, 'the total is always subtotal minus discount plus delivery'
);
select throws_ok(
  $$ insert into public.orders (tenant_id, business_date, order_no, token, pickup_code, client_key, type, payment_method, customer_name, due_at, start_by, subtotal, total)
     values ('aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 2, 'tok-aaaa-0000-0003', 'K7QZ', 'client-key-0001', 'pickup', 'cash', 'Maya Santos', now(), now(), 18900, 18900) $$,
  '23505', NULL, 'a double tap on Place order makes one order'
);
select throws_ok(
  $$ insert into public.orders (tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total)
     values ('aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 2, 'tok-aaaa-0000-0004', 'K7QW', 'delivery', 'cod', 'Leo', now(), now(), 18900, 18900) $$,
  '23514', NULL, 'a delivery needs an address'
);
select throws_ok(
  $$ insert into public.orders (tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total)
     values ('aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 2, 'tok-aaaa-0000-0005', 'K1QW', 'pickup', 'cash', 'Leo', now(), now(), 18900, 18900) $$,
  '23514', NULL, 'a pickup code never uses look-alike characters'
);
select throws_ok(
  $$ insert into public.order_lines (tenant_id, order_id, item_id, variant_id, name, qty, unit_price, line_total)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b100-0000-0000-000000000000', 'Classic Smash', 2, 18900, 18900) $$,
  '23514', NULL, 'a line total is the unit price times the quantity'
);
select throws_ok(
  $$ insert into public.order_lines (tenant_id, order_id, item_id, variant_id, name, qty, unit_price, line_total)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'bbbbbbbb-0d00-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b100-0000-0000-000000000000', 'Classic Smash', 1, 18900, 18900) $$,
  '23503', NULL, 'a line cannot be added to another shop''s order'
);
select throws_ok(
  $$ delete from public.items where id = 'aaaaaaaa-1000-0000-0000-000000000000' $$,
  '23503', NULL, 'an item that was ordered cannot be deleted forever'
);
select throws_ok(
  $$ delete from public.orders $$,
  '42501', NULL, 'the API cannot delete orders'
);
select throws_ok(
  $$ update public.order_events set status = 'completed' $$,
  '42501', NULL, 'order history is append-only (only Undo marks a step)'
);
select throws_ok(
  $$ insert into public.payment_proofs (tenant_id, order_id, reference_no) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', '123456789012') $$,
  '23505', NULL, 'the same reference number cannot pay twice'
);
select is(private.next_order_no('2026-11-18'), 1, 'the first order of a day is number 1');
select is(private.next_order_no('2026-11-18'), 2, 'the next order of the day is number 2');
select is(
  array[
    private.take_daily_count('aaaaaaaa-2000-0000-0000-000000000000', '2026-11-18', 1),
    private.take_daily_count('aaaaaaaa-2000-0000-0000-000000000000', '2026-11-18', 1),
    private.take_daily_count('aaaaaaaa-2000-0000-0000-000000000000', '2026-11-18', 1)
  ],
  array[true, true, false],
  'a daily limit of 2 takes two orders and refuses the third'
);
select is(
  private.take_daily_count('aaaaaaaa-1000-0000-0000-000000000000', '2026-11-18', 40),
  true,
  'an item without a daily limit always passes'
);

select * from finish();
rollback;
