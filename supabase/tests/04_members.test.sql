-- Step 4: members.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(8);

insert into auth.users (id, instance_id, email, aud, role) values
  ('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'maya@example.com', 'authenticated', 'authenticated');

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

-- One person, members of two shops.
insert into public.members (id, tenant_id, user_id, email, name, member_code) values
  ('aaaaaaaa-e000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000003', 'maya@example.com', 'Maya Santos', 'KS-4100'),
  ('bbbbbbbb-e000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000003', 'maya@example.com', 'Maya Santos', 'TA-4100');

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select results_eq($$ select member_code from public.members $$, ARRAY['KS-4100'], 'a shop sees only its own members');
select throws_ok(
  $$ insert into public.members (tenant_id, email, name, member_code) values ('aaaaaaaa-1111-0000-0000-000000000000', 'maya@example.com', 'Maya again', 'KS-9999') $$,
  '23505', NULL, 'one membership per email per shop'
);
select throws_ok(
  $$ insert into public.members (tenant_id, email, name, member_code) values ('aaaaaaaa-1111-0000-0000-000000000000', 'leo@example.com', 'Leo', 'ks 4100') $$,
  '23505', NULL, 'the same code typed another way is the same code'
);
select throws_ok(
  $$ insert into public.members (tenant_id, email, name, member_code) values ('aaaaaaaa-1111-0000-0000-000000000000', 'leo@example.com', 'Leo', 'XX-4100') $$,
  '23505', NULL, 'its digits alone open one card only'
);
select throws_ok(
  $$ insert into public.members (tenant_id, email, name, phone, member_code) values ('aaaaaaaa-1111-0000-0000-000000000000', 'leo@example.com', 'Leo', '0917 123 4567', 'KS-4200') $$,
  '23514', NULL, 'a mobile is stored as +639XXXXXXXXX'
);
select lives_ok(
  $$ insert into public.consents (tenant_id, member_id, kind, version) values ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-e000-0000-0000-000000000000', 'privacy', '2026-11') $$,
  'a consent is recorded'
);
select throws_ok(
  $$ delete from public.consents $$,
  '42501', NULL, 'consents cannot be deleted (append-only)'
);
-- An erased member keeps no contacts.
select throws_ok(
  $$ update public.members set erased_at = now() where id = 'aaaaaaaa-e000-0000-0000-000000000000' $$,
  '23514', NULL, 'erasing a member must blank their email, phone and sign-in'
);

select * from finish();
rollback;
