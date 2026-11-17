-- Step 7: exports, plan billing, Activity, help mode, tracking, email outbox, audit log.
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(16);

insert into auth.users (id, instance_id, email, aud, role) values
  ('dddddddd-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'founder@example.com', 'authenticated', 'authenticated');

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.plan_payments (id, tenant_id, months, amount, method, reference, covers_until, status, decided_at) values
  ('bbbbbbbb-9000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 1, 39900, 'gcash', '5011 2233 4455', '2026-12-17', 'approved', now());

insert into public.support_sessions (id, tenant_id, admin_user_id, reason, ends_at) values
  ('aaaaaaaa-5500-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000004', 'set_up', now() + interval '60 minutes');

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

-- Plan payments.
select results_eq($$ select count(*)::integer from public.plan_payments $$, ARRAY[0], 'a shop sees only its own plan payments');
select lives_ok(
  $$ insert into public.plan_payments (tenant_id, months, amount, method, reference, covers_until) values ('aaaaaaaa-1111-0000-0000-000000000000', 3, 119700, 'gcash', '7001 0002 0003', '2027-02-17') $$,
  'an owner sends a plan payment'
);
select throws_ok(
  $$ insert into public.plan_payments (tenant_id, months, amount, method, reference, covers_until) values ('aaaaaaaa-1111-0000-0000-000000000000', 1, 39900, 'maya', '7001 0002 0004', '2026-12-17') $$,
  '23505', NULL, 'one plan payment waits per shop'
);
select throws_ok(
  $$ update public.plan_payments set status = 'approved', decided_at = now() $$,
  '42501', NULL, 'an owner cannot approve their own payment'
);
select throws_ok(
  $$ insert into public.plan_payments (tenant_id, months, amount, method, reference, covers_until, status, decided_at) values ('aaaaaaaa-1111-0000-0000-000000000000', 1, 39900, 'gcash', '7001 0002 0005', '2026-12-17', 'approved', now()) $$,
  '42501', NULL, 'an owner cannot send a payment already approved'
);
select throws_ok(
  $$ insert into public.plan_payments (tenant_id, months, amount, method, reference, covers_until) values ('aaaaaaaa-1111-0000-0000-000000000000', 2, 79800, 'gcash', '7001 0002 0006', '2027-01-17') $$,
  '23514', NULL, 'a plan payment covers 1, 3 or 6 months'
);

-- Billing chat.
select lives_ok(
  $$ insert into public.billing_messages (tenant_id, "from", kind, text) values ('aaaaaaaa-1111-0000-0000-000000000000', 'owner', 'note', 'Sent via GCash just now') $$,
  'an owner writes a note in the Billing chat'
);
select throws_ok(
  $$ insert into public.billing_messages (tenant_id, "from", kind, days) values ('aaaaaaaa-1111-0000-0000-000000000000', 'admin', 'extra_days', 7) $$,
  '42501', NULL, 'an owner cannot give themselves extra days'
);

-- Activity, exports, outbox, tracking, audit.
select throws_ok(
  $$ insert into public.shop_activity (tenant_id, kind, by) values ('aaaaaaaa-1111-0000-0000-000000000000', 'approved', 'admin') $$,
  '42501', NULL, 'an owner cannot write the founder''s Activity lines'
);
select throws_ok(
  $$ insert into public.data_exports (tenant_id, range, part_orders, part_payments, part_proofs, file_name) values ('aaaaaaaa-1111-0000-0000-000000000000', 'this_month', false, false, false, 'kanto-smash.zip') $$,
  '23514', NULL, 'an export has at least one part'
);
select lives_ok(
  $$ insert into public.notification_outbox (tenant_id, kind, to_email, dedupe_key) values ('aaaaaaaa-1111-0000-0000-000000000000', 'new_order', 'owner@example.com', 'new_order:0001') $$,
  'a new order email waits in the outbox'
);
select throws_ok(
  $$ insert into public.notification_outbox (tenant_id, kind, to_email, dedupe_key) values ('aaaaaaaa-1111-0000-0000-000000000000', 'new_order', 'owner@example.com', 'new_order:0001') $$,
  '23505', NULL, 'the same email is queued once'
);
select throws_ok(
  $$ insert into public.track_events (event_id, name, via, user_data) values ('evt-00000001', 'Lead', 'browser_server', '{"email":"maya@example.com"}') $$,
  '23514', NULL, 'tracking never keeps a raw email or mobile'
);
select lives_ok(
  $$ insert into public.audit_log (actor_user_id, tenant_id, support_session_id, action, target) values ('dddddddd-0000-0000-0000-000000000004', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-5500-0000-0000-000000000000', 'menu.item_update', 'items:1') $$,
  'help mode writes to the audit log'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', NULL, 'the audit log is append-only'
);

set local role postgres;
set local role app_admin;
select throws_ok(
  $$ insert into public.support_sessions (tenant_id, admin_user_id, reason, ends_at) values ('aaaaaaaa-1111-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000004', 'fix_problem', now() + interval '2 hours') $$,
  '23514', NULL, 'help mode lasts at most 60 minutes'
);

select * from finish();
rollback;
