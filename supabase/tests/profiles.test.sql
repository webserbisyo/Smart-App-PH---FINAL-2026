begin;
select plan(6);

-- Set up test users in auth.users
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) values
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'usera@example.com',
    'encrypted_pass_1',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User Alpha"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'userb@example.com',
    'encrypted_pass_2',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"User Beta"}'::jsonb,
    now(),
    now(),
    'authenticated',
    'authenticated'
  );

-- 1. Test that anon cannot read any profiles
set local role anon;
select throws_ok(
  'select * from public.profiles',
  '42501',
  NULL,
  'anon role cannot read any rows from profiles'
);

-- 2. Test that anon cannot update any profiles
select throws_ok(
  'update public.profiles set full_name = ''Hacked''',
  '42501',
  NULL,
  'anon role has no update permission on profiles'
);

-- 3. Test that user A can read own profile
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select results_eq(
  'select full_name from public.profiles where id = ''11111111-1111-1111-1111-111111111111''',
  ARRAY['User Alpha'],
  'User A can read own profile'
);

-- 4. Test that user A cannot read user B profile
select is_empty(
  'select * from public.profiles where id = ''22222222-2222-2222-2222-222222222222''',
  'User A cannot read User B profile'
);

-- 5. Test that user A can update own profile
update public.profiles
set full_name = 'User Alpha Updated'
where id = '11111111-1111-1111-1111-111111111111';

select results_eq(
  'select full_name from public.profiles where id = ''11111111-1111-1111-1111-111111111111''',
  ARRAY['User Alpha Updated'],
  'User A can update own profile'
);

-- 6. Test that user A cannot update user B profile
update public.profiles
set full_name = 'User Beta Hacked'
where id = '22222222-2222-2222-2222-222222222222';

set local role postgres;
select results_eq(
  'select full_name from public.profiles where id = ''22222222-2222-2222-2222-222222222222''',
  ARRAY['User Beta'],
  'User B profile remains unchanged after User A update attempt'
);

select * from finish();
rollback;
