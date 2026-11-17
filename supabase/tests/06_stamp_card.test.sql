-- Step 6: stamp card.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(14);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.categories (id, tenant_id, name, icon) values
  ('aaaaaaaa-c000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Burgers', '{"kind":"emoji","char":"🍔"}');
insert into public.items (id, tenant_id, category_id, name, base_price) values
  ('aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Classic Smash', 18900),
  ('aaaaaaaa-2000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Fries', 8900);
insert into public.item_variants (id, tenant_id, item_id, combo_key) values
  ('aaaaaaaa-b100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', ''),
  ('aaaaaaaa-b200-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-2000-0000-0000-000000000000', '');

insert into public.members (id, tenant_id, email, name, member_code) values
  ('aaaaaaaa-e000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'maya@example.com', 'Maya Santos', 'KS-4100'),
  ('bbbbbbbb-e000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'leo@example.com', 'Leo Cruz', 'TA-4100');

insert into public.stamp_cards (tenant_id, status, reward_kind, reward_item_id, reward_variant_id, reward_title, quantity_total, quantity_left) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'on', 'free_item', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b100-0000-0000-000000000000', 'Free Classic Smash', 1, 1);
insert into public.stamp_cards (tenant_id, status, reward_kind, reward_title) values
  ('bbbbbbbb-2222-0000-0000-000000000000', 'on', 'custom', 'Free tote bag');

insert into public.orders (id, tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, member_id, due_at, start_by, subtotal, total) values
  ('aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 1, 'tok-aaaa-0000-0001', 'K7QX', 'pickup', 'cash', 'Maya Santos', 'aaaaaaaa-e000-0000-0000-000000000000', now(), now(), 18900, 18900);
insert into public.order_lines (tenant_id, order_id, item_id, variant_id, name, qty, unit_price, line_total) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b100-0000-0000-000000000000', 'Classic Smash', 1, 18900, 18900);

insert into public.stamp_entries (id, tenant_id, member_id, kind, delta, order_id) values
  ('aaaaaaaa-5000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'welcome', 1, null),
  ('aaaaaaaa-5200-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'earned', 1, 'aaaaaaaa-0d00-0000-0000-000000000000'),
  ('bbbbbbbb-5000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'bbbbbbbb-e000-0000-0000-000000000000', 'welcome', 1, null);

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select results_eq($$ select reward_title from public.stamp_cards $$, ARRAY['Free Classic Smash'], 'a shop sees only its own stamp card');
select results_eq($$ select count(*)::integer from public.stamp_entries $$, ARRAY[2], 'a shop sees only its own stamp history');
select throws_ok(
  $$ update public.stamp_cards set max_earned = null $$,
  '23514', NULL, 'a cap on earned stamps and its period go together'
);
select throws_ok(
  $$ update public.stamp_cards set reward_variant_id = 'aaaaaaaa-b200-0000-0000-000000000000' $$,
  '23503', NULL, 'the prize variant belongs to the prize item'
);
select throws_ok(
  $$ delete from public.items where id = 'aaaaaaaa-1000-0000-0000-000000000000' $$,
  '23503', NULL, 'item_is_reward: the prize item cannot be deleted'
);
select throws_ok(
  $$ insert into public.stamp_entries (tenant_id, member_id, kind, delta) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'welcome', 1) $$,
  '23505', NULL, 'one welcome stamp per member'
);
select throws_ok(
  $$ insert into public.stamp_entries (tenant_id, member_id, kind, delta) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'used', 3) $$,
  '23514', NULL, 'using a reward takes stamps away, never adds'
);
select throws_ok(
  $$ insert into public.stamp_entries (tenant_id, member_id, kind, delta) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'given', 1) $$,
  '23514', NULL, 'a stamp given by hand needs a reason'
);
select lives_ok(
  $$ insert into public.stamp_entries (id, tenant_id, member_id, kind, delta, reason_category, client_key) values ('aaaaaaaa-5100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'given', 1, 'counter_purchase', 'tap-000000001') $$,
  'a counter stamp is added'
);
select throws_ok(
  $$ insert into public.stamp_entries (tenant_id, member_id, kind, delta, reason_category, client_key) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'given', 1, 'counter_purchase', 'tap-000000001') $$,
  '23505', NULL, 'a double tap adds one stamp'
);
select throws_ok(
  $$ delete from public.stamp_entries $$,
  '42501', NULL, 'the stamp history is append-only'
);
select is(private.lock_stamp_balance('aaaaaaaa-e000-0000-0000-000000000000'), 3, 'the balance is the sum of the history');
select is(array[private.take_prize(), private.take_prize()], array[true, false], 'the last limited prize goes to one member only');

set local role postgres;
-- Closing a shop for good removes all its rows, even with restrict links between them.
delete from public.tenants where id = 'aaaaaaaa-1111-0000-0000-000000000000';
select is((select count(*)::integer from public.items where tenant_id = 'aaaaaaaa-1111-0000-0000-000000000000'), 0, 'deleting a shop removes its menu, orders, members and stamps');

select * from finish();
rollback;
