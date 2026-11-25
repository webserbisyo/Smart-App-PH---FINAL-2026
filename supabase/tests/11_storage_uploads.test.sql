-- Phase 3: buckets and the two upload steps (20261126100000_storage_uploads.sql).
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(10);

select results_eq(
  $$ select id, public from storage.buckets where id in ('menu', 'look', 'qr', 'profile', 'proofs', 'plan-proofs') order by id $$,
  $$ values ('look'::text, true), ('menu', true), ('plan-proofs', false), ('profile', true), ('proofs', false), ('qr', true) $$,
  'six buckets; proofs and plan receipts are private'
);

insert into auth.users (id, instance_id, email, aud, role) values
  ('dddddddd-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'mia@example.com', 'authenticated', 'authenticated');
insert into public.tenants (id, slug, name, kind, price_monthly, storage_limit_bytes) values
  ('dddddddd-3333-0000-0000-000000000001', 'mia-sweets', 'Mia Sweets', 'food', 39900, 1000),
  ('dddddddd-3333-0000-0000-000000000002', 'other-shop', 'Other Shop', 'retail', 39900, 1000);

-- Without a shop in the request nothing is reserved.
set local role app_api;
select throws_ok(
  $$ select private.reserve_media('dddddddd-5555-0000-0000-000000000001', 'logo', 'look', 'dddddddd-3333-0000-0000-000000000001/logo/a.webp', 100, 'image/webp') $$,
  '42501', NULL, 'no shop, no upload'
);

set local role postgres;
select set_config('app.tenant_id', 'dddddddd-3333-0000-0000-000000000001', true);
select set_config('app.user_id', 'dddddddd-0000-0000-0000-000000000001', true);
set local role app_api;

select lives_ok(
  $$ select private.reserve_media('dddddddd-5555-0000-0000-000000000001', 'logo', 'look', 'dddddddd-3333-0000-0000-000000000001/logo/a.webp', 600, 'image/webp') $$,
  'room for a 600-byte logo'
);
select throws_ok(
  $$ select private.reserve_media('dddddddd-5555-0000-0000-000000000002', 'banner', 'look', 'dddddddd-3333-0000-0000-000000000001/banner/b.webp', 500, 'image/webp') $$,
  'P0001', 'storage is full', 'a second file past the limit is refused'
);
select lives_ok(
  $$ select private.reserve_media('dddddddd-5555-0000-0000-000000000003', 'plan_proof', 'plan-proofs', 'dddddddd-3333-0000-0000-000000000001/plan_proof/c.webp', 5000, 'image/webp') $$,
  'a plan receipt never counts'
);

-- The real size is checked again on confirm.
select throws_ok(
  $$ select private.confirm_media('dddddddd-5555-0000-0000-000000000001', 1200, 'image/webp') $$,
  'P0001', 'storage is full', 'a file bigger than promised past the limit is refused'
);
select lives_ok(
  $$ select private.confirm_media('dddddddd-5555-0000-0000-000000000001', 400, 'image/jpeg') $$,
  'the real size and type are saved'
);
select results_eq(
  $$ select bytes, mime, confirmed_at is not null from public.media_files where id = 'dddddddd-5555-0000-0000-000000000001' $$,
  $$ values (400::bigint, 'image/jpeg'::text, true) $$,
  'confirmed with its real size'
);
select throws_ok(
  $$ select private.confirm_media('dddddddd-5555-0000-0000-000000000001', 400, 'image/webp') $$,
  'P0002', NULL, 'a file is confirmed once'
);

-- Another shop's upload is not found.
set local role postgres;
select set_config('app.tenant_id', 'dddddddd-3333-0000-0000-000000000002', true);
set local role app_api;
select throws_ok(
  $$ select private.confirm_media('dddddddd-5555-0000-0000-000000000003', 10, 'image/webp') $$,
  'P0002', NULL, 'another shop''s upload is not found'
);

select * from finish();
rollback;
