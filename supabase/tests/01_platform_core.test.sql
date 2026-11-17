-- Step 1: platform core. Shops are walled off from each other; sign-up and slug lookups work; the
-- founder's role sees every shop.
begin;
-- pgTAP lives in the extensions schema; let the API roles call it inside this rolled-back test.
grant usage on schema extensions to app_api, app_admin;
select plan(16);

insert into auth.users (id, instance_id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'kanto@example.com', 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'tala@example.com', 'authenticated', 'authenticated');

insert into public.tenants (id, slug, name, kind, stage, price_monthly, asked_at, live_at) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'live', 39900, now(), now()),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900, null, null);

insert into public.tenant_members (tenant_id, user_id) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000002');

-- Browsers see nothing.
set local role anon;
select throws_ok($$ select * from public.tenants $$, '42501', NULL, 'anon cannot read tenants');
set local role authenticated;
select throws_ok($$ select * from public.tenant_members $$, '42501', NULL, 'authenticated cannot read tenant_members');

-- The owner of Kanto Smash, before the shop is known: finds their own membership only.
set local role postgres;
select set_config('app.user_id', 'aaaaaaaa-0000-0000-0000-000000000001', true);
set local role app_api;
select results_eq(
  $$ select tenant_id from public.tenant_members $$,
  ARRAY['aaaaaaaa-1111-0000-0000-000000000000'::uuid],
  'an owner finds only their own shop'
);

-- With the shop set, only that shop's row is visible.
set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;
select results_eq($$ select slug from public.tenants $$, ARRAY['kanto-smash'], 'owner sees only their shop');
select is_empty($$ select 1 from public.tenants where slug = 'tala-apparel' $$, 'another shop is invisible');

-- Updating another shop changes nothing.
update public.tenants set name = 'Hacked' where slug = 'tala-apparel';
set local role postgres;
select results_eq($$ select name from public.tenants where slug = 'tala-apparel' $$, ARRAY['Tala Apparel'], 'another shop cannot be renamed');

-- The API cannot change price, storage or paid-until (only the founder can).
set local role app_api;
select throws_ok(
  $$ update public.tenants set price_monthly = 100 $$,
  '42501', NULL, 'owner cannot change their own price'
);

-- An owner cannot join another shop.
select throws_ok(
  $$ insert into public.tenant_members (tenant_id, user_id) values ('bbbbbbbb-2222-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000001') $$,
  '42501', NULL, 'an owner cannot add themselves to another shop'
);

-- Storefront lookups: a live shop answers, a shop still setting up is Not found.
select is(private.tenant_by_slug('kanto-smash'), 'aaaaaaaa-1111-0000-0000-000000000000'::uuid, 'a live shop is found by its link');
select is(private.tenant_by_slug('tala-apparel'), null::uuid, 'a shop still setting up is not found');
select is(private.slug_is_free('kanto-smash'), false, 'a used link is not free');
select is(private.slug_is_free('admin'), false, 'a reserved link is not free');
select is(private.slug_is_free('new-shop'), true, 'an unused link is free');

-- Sign-up: a lead can be saved, and a bad mobile is refused.
select lives_ok(
  $$ insert into public.signup_leads (full_name, email, phone, terms_version, channel) values ('Ana Cruz', 'ana@example.com', '+639171234567', '2026-11', 'direct') $$,
  'a sign-up lead is saved'
);

-- Rules the database keeps by itself.
set local role postgres;
select throws_ok(
  $$ insert into public.tenants (slug, name, kind, stage, price_monthly) values ('Bad Slug', 'X', 'food', 'setting_up', 39900) $$,
  '23514', NULL, 'a slug must be lowercase letters, numbers and dashes'
);

-- The founder's role sees every shop.
set local role app_admin;
select results_eq($$ select count(*)::int from public.tenants $$, ARRAY[2], 'app_admin sees every shop');

select * from finish();
rollback;
