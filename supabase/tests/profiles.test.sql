begin;
-- pgTAP lives in the extensions schema; let the API roles call it inside this rolled-back test.
grant usage on schema extensions to app_api, app_admin;
select plan(7);

insert into auth.users (id, instance_id, email, raw_user_meta_data, aud, role) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'usera@example.com',
   '{"full_name":"User Alpha"}'::jsonb, 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'userb@example.com',
   '{"full_name":"User Beta"}'::jsonb, 'authenticated', 'authenticated');

-- 1. Sign-up makes the profile (trigger).
select results_eq(
  $$ select count(*)::int from public.profiles $$,
  ARRAY[2],
  'a profile is made for every new login'
);

-- 2. and 3. Browsers' roles read and change nothing (T34: everything goes through NestJS).
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', NULL, 'anon cannot read profiles');
set local role authenticated;
select throws_ok($$ select * from public.profiles $$, '42501', NULL, 'authenticated cannot read profiles');

-- 4. The API, acting for user A, sees only user A.
set local role postgres;
select set_config('app.user_id', '11111111-1111-1111-1111-111111111111', true);
set local role app_api;
select results_eq(
  $$ select full_name from public.profiles $$,
  ARRAY['User Alpha'],
  'app_api for user A sees only user A'
);

-- 5. It can update user A.
update public.profiles set full_name = 'User Alpha Updated';
select results_eq(
  $$ select full_name from public.profiles $$,
  ARRAY['User Alpha Updated'],
  'app_api for user A updates user A'
);

-- 6. It cannot change user B.
update public.profiles set full_name = 'Hacked' where id = '22222222-2222-2222-2222-222222222222';
set local role postgres;
select results_eq(
  $$ select full_name from public.profiles where id = '22222222-2222-2222-2222-222222222222' $$,
  ARRAY['User Beta'],
  'user B is unchanged after an update for user A'
);

-- 7. A bad mobile is refused.
select throws_ok(
  $$ update public.profiles set phone = '09171234567' where id = '11111111-1111-1111-1111-111111111111' $$,
  '23514',
  NULL,
  'phone must be +639XXXXXXXXX'
);

select * from finish();
rollback;
