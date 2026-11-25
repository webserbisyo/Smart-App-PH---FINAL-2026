-- Launch phase 4 (T117, X1 and X2): ordered sizes and add-ons can leave the menu; the order keeps its words.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(8);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900);
insert into public.categories (id, tenant_id, name, icon) values
  ('aaaaaaaa-c000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Burgers', '{"kind":"emoji","char":"🍔"}');
insert into public.items (id, tenant_id, category_id, name, base_price) values
  ('aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Classic Smash', 18900);
insert into public.item_variants (id, tenant_id, item_id, combo_key) values
  ('aaaaaaaa-b100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'single'),
  ('aaaaaaaa-b200-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'double');
insert into public.option_groups (id, tenant_id, name) values
  ('aaaaaaaa-9000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Add-ons');
insert into public.options (id, tenant_id, group_id, name, price_delta) values
  ('aaaaaaaa-9100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-9000-0000-0000-000000000000', 'Cheese', 2000);
insert into public.orders (id, tenant_id, business_date, order_no, token, pickup_code, type, payment_method, customer_name, due_at, start_by, subtotal, total) values
  ('aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', '2026-11-17', 1, 'tok-aaaa-0000-0001', 'K7QX', 'pickup', 'cash', 'Maya Santos', '2026-11-17 12:30+08', '2026-11-17 12:10+08', 20900, 20900);
insert into public.order_lines (id, tenant_id, order_id, item_id, variant_id, name, variant_label, qty, unit_price, line_total) values
  ('aaaaaaaa-0100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0d00-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-b200-0000-0000-000000000000', 'Classic Smash', 'Double', 1, 20900, 20900);
insert into public.order_line_options (tenant_id, line_id, option_id, name, price) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0100-0000-0000-000000000000', 'aaaaaaaa-9100-0000-0000-000000000000', 'Cheese', 2000);

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select lives_ok(
  $$ delete from public.item_variants where id = 'aaaaaaaa-b200-0000-0000-000000000000' $$,
  'an ordered size can be removed from the menu'
);
select results_eq(
  $$ select variant_id is null, variant_label, unit_price from public.order_lines $$,
  $$ values (true, 'Double'::text, 20900) $$,
  'the order keeps the size''s words and price'
);
select lives_ok(
  $$ delete from public.options where id = 'aaaaaaaa-9100-0000-0000-000000000000' $$,
  'an ordered add-on can be removed from the menu'
);
select results_eq(
  $$ select option_id is null, name, price from public.order_line_options $$,
  $$ values (true, 'Cheese'::text, 2000) $$,
  'the order keeps the add-on''s name and price'
);
select throws_ok(
  $$ delete from public.items where id = 'aaaaaaaa-1000-0000-0000-000000000000' $$,
  '23503', NULL, 'item_has_orders: an ordered item is archived, never deleted'
);

insert into public.variant_templates (tenant_id, name, is_sample) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'Size', true),
  ('aaaaaaaa-1111-0000-0000-000000000000', 'Colour', false);
select results_eq(
  $$ select name from public.variant_templates where is_sample $$,
  ARRAY['Size'],
  'Clear samples finds the sample templates'
);
select results_eq(
  $$ select count(*)::int from public.variant_templates where not is_sample $$,
  ARRAY[1],
  'a new template is the shop''s own'
);

select lives_ok(
  $$ insert into public.variant_templates (tenant_id, name) values ('aaaaaaaa-1111-0000-0000-000000000000', 'size') $$,
  'two ready-made variants may share a name (Size and Size)'
);

select * from finish();
rollback;
