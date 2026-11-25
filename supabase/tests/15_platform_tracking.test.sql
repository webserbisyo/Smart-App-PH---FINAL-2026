begin;
-- pgTAP lives in the extensions schema; let the API role call it inside this rolled-back test.
grant usage on schema extensions to app_api;
select plan(10);

select has_column('public', 'tenants', 'is_test', 'tenants.is_test exists');
select has_column('public', 'track_events', 'event_time', 'track_events.event_time exists');
select has_column('public', 'track_events', 'client_ip', 'track_events.client_ip exists');

insert into public.tenants (id, slug, name, kind, stage, price_monthly)
values ('00000000-0000-0000-0000-00000000a15e', 'tracking-test-shop', 'Tracking test', 'food', 'setting_up', 39900);
insert into public.plan_payments (id, tenant_id, months, amount, method, reference, covers_until)
values ('00000000-0000-0000-0000-00000000b15e', '00000000-0000-0000-0000-00000000a15e', 1, 39900, 'gcash', 'REF-15-0001', current_date + 30);

select lives_ok(
  $$insert into public.track_events (event_id, name, via, status, tenant_id, plan_payment_id, caused_by, client_ip, client_ua)
    values ('purchase:test-15-0001', 'Purchase', 'server', 'waiting', '00000000-0000-0000-0000-00000000a15e',
            '00000000-0000-0000-0000-00000000b15e', 'owner', '203.0.113.7', 'Mozilla/5.0')$$,
  'a Purchase waits for the founder with the owner''s IP address and browser'
);

select throws_ok(
  $$insert into public.track_events (event_id, name, via, status, tenant_id, caused_by)
    values ('purchase:test-15-0002', 'Purchase', 'server', 'queued', '00000000-0000-0000-0000-00000000a15e', 'admin')$$,
  '23514', null, 'a Purchase always names its payment'
);

select throws_ok(
  $$insert into public.track_events (event_id, name, via, status, problem, client_ip)
    values ('pageview:test-15-0003', 'PageView', 'server', 'skipped', 'admin', '203.0.113.8')$$,
  '23514', null, 'a skipped row keeps no IP address'
);

select throws_ok(
  $$insert into public.track_events (event_id, name, via, status, tenant_id, caused_by, client_ua)
    values ('trial:test-15-0004', 'StartTrial', 'server', 'queued', '00000000-0000-0000-0000-00000000a15e', 'admin', 'Mozilla/5.0')$$,
  '23514', null, 'an event the founder causes never carries a browser'
);

select throws_ok(
  $$insert into public.track_events (event_id, name, via, status)
    values ('lead:test-15-0005', 'Lead', 'browser_server', 'skipped')$$,
  '23514', null, 'a skipped row says why'
);

-- The API's role may add queued, waiting or skipped rows for its own shop, never a sent one or the founder's.
select set_config('app.tenant_id', '00000000-0000-0000-0000-00000000a15e', true);
set local role app_api;

select throws_ok(
  $$insert into public.track_events (event_id, name, via, status, sent_at, tenant_id, caused_by)
    values ('apply:test-15-0006', 'SubmitApplication', 'server', 'sent', now(), '00000000-0000-0000-0000-00000000a15e', 'owner')$$,
  '42501', null, 'the API never writes a sent row'
);

select throws_ok(
  $$insert into public.track_events (event_id, name, via, status, tenant_id, caused_by)
    values ('trial:test-15-0007', 'StartTrial', 'server', 'queued', '00000000-0000-0000-0000-00000000a15e', 'admin')$$,
  '42501', null, 'the shop''s role never writes the founder''s events'
);

reset role;
select * from finish();
rollback;
