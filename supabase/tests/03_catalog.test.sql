-- Step 3: catalog.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(10);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.categories (id, tenant_id, name, icon) values
  ('aaaaaaaa-c000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Burgers', '{"kind":"emoji","char":"🍔"}'),
  ('bbbbbbbb-c000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'Shirts', '{"kind":"emoji","char":"👕"}');

insert into public.items (id, tenant_id, category_id, name, base_price) values
  ('aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Classic Smash', 18900),
  ('aaaaaaaa-2000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Fries', 8900);

insert into public.item_axes (id, tenant_id, item_id, name, position) values
  ('aaaaaaaa-a000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'Patty', 0);
insert into public.item_axis_values (id, tenant_id, axis_id, label, price_delta) values
  ('aaaaaaaa-a100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-a000-0000-0000-000000000000', 'Single', 0),
  ('aaaaaaaa-a200-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-a000-0000-0000-000000000000', 'Double', 6000);
insert into public.item_variants (id, tenant_id, item_id, combo_key) values
  ('aaaaaaaa-b100-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-a100-0000-0000-000000000000');

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select results_eq($$ select name from public.categories $$, ARRAY['Burgers'], 'a shop sees only its own categories');
select throws_ok(
  $$ insert into public.items (tenant_id, category_id, name, base_price) values ('aaaaaaaa-1111-0000-0000-000000000000', 'bbbbbbbb-c000-0000-0000-000000000000', 'Stolen', 100) $$,
  '23503', NULL, 'an item cannot go into another shop''s category'
);
select throws_ok(
  $$ delete from public.categories where id = 'aaaaaaaa-c000-0000-0000-000000000000' $$,
  '23503', NULL, 'category_not_empty: a category with items cannot be deleted'
);
select throws_ok(
  $$ insert into public.item_variants (tenant_id, item_id, combo_key) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-a100-0000-0000-000000000000') $$,
  '23505', NULL, 'the same combination cannot exist twice'
);
select throws_ok(
  $$ insert into public.item_axes (tenant_id, item_id, name, position) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'Size', 3) $$,
  '23514', NULL, 'at most 3 choice rows per item'
);
select throws_ok(
  $$ insert into public.item_pairings (tenant_id, item_id, paired_item_id) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000') $$,
  '23514', NULL, 'an item cannot pair with itself'
);
select lives_ok(
  $$ insert into public.item_pairings (tenant_id, item_id, paired_item_id) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-2000-0000-0000-000000000000') $$,
  'Goes well with links two items'
);
select throws_ok(
  $$ insert into public.option_groups (tenant_id, name, min_pick, max_pick) values ('aaaaaaaa-1111-0000-0000-000000000000', 'Sauce', 3, 1) $$,
  '23514', NULL, 'min picks cannot be more than max'
);
select throws_ok(
  $$ update public.item_variants set sold_out_until = now() + interval '1 day' where availability = 'available' $$,
  '23514', NULL, 'only a Sold out today variant has a time it comes back'
);
-- The daily count never goes below zero.
select throws_ok(
  $$ insert into public.item_daily_counts (tenant_id, item_id, business_date, qty) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-2000-0000-0000-000000000000', '2026-11-17', -1) $$,
  '23514', NULL, 'a daily count cannot be negative'
);

select * from finish();
rollback;
