-- Phase 2: reserved links and the sign-up lead hand-over (20261125100000_accounts.sql).
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(7);

insert into auth.users (id, instance_id, email, aud, role) values
  ('cccccccc-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'ana@example.com', 'authenticated', 'authenticated');
insert into public.tenants (id, slug, name, kind, price_monthly) values
  ('cccccccc-3333-0000-0000-000000000000', 'ana-bakes', 'Ana Bakes', 'food', 39900);
insert into public.signup_leads (id, full_name, email, phone, terms_version, channel, campaign) values
  ('cccccccc-4444-0000-0000-000000000001', 'Ana Cruz', 'ana@example.com', '+639171234567', 'v1', 'facebook_ad', 'nov-video'),
  ('cccccccc-4444-0000-0000-000000000002', 'Ben Cruz', 'ben@example.com', '+639171234568', 'v1', 'direct', null);

set local role app_api;
select is(private.slug_is_free('demo'), false, 'demo is reserved');
select is(private.slug_is_free('api-staging'), false, 'the staging API address is reserved');

-- Without a shop in the request the hand-over refuses.
select throws_ok(
  $$ select * from private.claim_signup_lead('cccccccc-4444-0000-0000-000000000001', 'ana@example.com') $$,
  '42501', NULL, 'no shop, no hand-over'
);

set local role postgres;
select set_config('app.tenant_id', 'cccccccc-3333-0000-0000-000000000000', true);
set local role app_api;

-- Another person's lead is never linked.
select is_empty(
  $$ select * from private.claim_signup_lead('cccccccc-4444-0000-0000-000000000002', 'ana@example.com') $$,
  'a lead with another email stays unlinked'
);

select results_eq(
  $$ select channel, campaign from private.claim_signup_lead('cccccccc-4444-0000-0000-000000000001', 'ANA@example.com') $$,
  $$ values ('facebook_ad'::text, 'nov-video'::text) $$,
  'the owner''s own lead links and says where they came from'
);

select results_eq(
  $$ select tenant_id from public.signup_leads $$,
  ARRAY['cccccccc-3333-0000-0000-000000000000'::uuid],
  'the shop now sees its lead'
);

-- A lead links once.
select is_empty(
  $$ select * from private.claim_signup_lead('cccccccc-4444-0000-0000-000000000001', 'ana@example.com') $$,
  'a linked lead is not linked again'
);

select * from finish();
rollback;
