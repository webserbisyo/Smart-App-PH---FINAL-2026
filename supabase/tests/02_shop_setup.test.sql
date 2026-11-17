-- Step 2: files and shop setup.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(13);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.media_files (id, tenant_id, kind, bucket, path, bytes, mime) values
  ('bbbbbbbb-3333-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'qr', 'qr',
   'bbbbbbbb-2222-0000-0000-000000000000/qr/b.webp', 1000, 'image/webp');
insert into public.shop_settings (tenant_id) values ('bbbbbbbb-2222-0000-0000-000000000000');

set local role anon;
select throws_ok($$ select * from public.shop_settings $$, '42501', NULL, 'anon cannot read shop settings');

-- Acting for Kanto Smash.
set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select lives_ok(
  $$ insert into public.shop_settings (tenant_id, phone) values ('aaaaaaaa-1111-0000-0000-000000000000', '09171234567') $$,
  'the shop saves its own settings'
);
select throws_ok(
  $$ insert into public.closures (tenant_id, date) values ('bbbbbbbb-2222-0000-0000-000000000000', '2026-12-25') $$,
  '42501', NULL, 'a shop cannot write another shop''s rows'
);
select is_empty($$ select 1 from public.shop_settings where tenant_id = 'bbbbbbbb-2222-0000-0000-000000000000' $$, 'another shop''s settings are invisible');
select is_empty($$ select 1 from public.media_files $$, 'another shop''s files are invisible');

select throws_ok(
  $$ update public.shop_settings set walk_in_on = false, pickup_on = false, delivery_on = false $$,
  '23514', NULL, 'last_order_type: one way to order stays on'
);
select throws_ok(
  $$ insert into public.payment_accounts (tenant_id, method, account_name, account_number) values ('aaaaaaaa-1111-0000-0000-000000000000', 'bank', 'Juan', '1234') $$,
  '23514', NULL, 'bank_required: a bank account names its bank'
);
select lives_ok(
  $$ insert into public.payment_accounts (tenant_id, method) values ('aaaaaaaa-1111-0000-0000-000000000000', 'cash') $$,
  'cash is an account with no number'
);
select throws_ok(
  $$ insert into public.payment_accounts (tenant_id, method) values ('aaaaaaaa-1111-0000-0000-000000000000', 'cash') $$,
  '23505', NULL, 'one live account per method'
);
select throws_ok(
  $$ insert into public.payment_accounts (tenant_id, method, account_name, account_number, qr_media_id) values ('aaaaaaaa-1111-0000-0000-000000000000', 'gcash', 'Juan', '09171234567', 'bbbbbbbb-3333-0000-0000-000000000000') $$,
  '23503', NULL, 'a QR cannot point at another shop''s file'
);
select throws_ok(
  $$ insert into public.opening_hours (tenant_id, weekday, opens, closes) values ('aaaaaaaa-1111-0000-0000-000000000000', 1, '18:00', '09:00') $$,
  '23514', NULL, 'closing time must be after opening time'
);
select throws_ok(
  $$ insert into public.media_files (tenant_id, kind, bucket, path, bytes, mime) values ('aaaaaaaa-1111-0000-0000-000000000000', 'item', 'menu', 'bbbbbbbb-2222-0000-0000-000000000000/item/x.webp', 10, 'image/webp') $$,
  '23514', NULL, 'a file path starts with its own shop id'
);

-- A file in use cannot be deleted (file_locked).
set local role postgres;
insert into public.payment_accounts (tenant_id, method, account_name, account_number, qr_media_id)
  values ('bbbbbbbb-2222-0000-0000-000000000000', 'gcash', 'Tala', '09170000000', 'bbbbbbbb-3333-0000-0000-000000000000');
select throws_ok(
  $$ delete from public.media_files where id = 'bbbbbbbb-3333-0000-0000-000000000000' $$,
  '23503', NULL, 'a file in use cannot be deleted'
);

select * from finish();
rollback;
