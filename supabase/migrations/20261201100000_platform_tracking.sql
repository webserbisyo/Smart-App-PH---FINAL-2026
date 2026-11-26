-- Database step 11: plan billing, Super Admin and Meta tracking on real data (launch phase 7, decision T118;
-- docs/blueprints/phases-7-9.md sections 4 and 5, task 7.1).
--
-- 1. A shop the founder marks as a test sends nothing to Meta and stays out of Today's money and funnel.
-- 2. Each Meta event row keeps what it needs to be sent truthfully later: when it happened (server clock),
--    where (action source), who caused it, the plan payment it is about, and the owner's own IP address and
--    browser from the request that caused it. The IP and browser are removed once the row is sent or skipped.
-- 3. A Purchase or Subscribe is written `waiting` when the owner sends a payment and only becomes `queued`
--    when the founder approves it; skipped rows carry the reason, so Tracking shows why nothing went.
-- 4. The plan's emails (reminders, answers, help mode) and the Activity tab's Undo line.

-- ---------------------------------------------------------------------------------------------
-- 1. Test shops (Q7)
-- ---------------------------------------------------------------------------------------------
alter table public.tenants add column is_test boolean not null default false;

-- ---------------------------------------------------------------------------------------------
-- 2. and 3. The Meta outbox
-- ---------------------------------------------------------------------------------------------
alter table public.track_events
  -- When the event really happened (Meta's event_time): the owner's send for a payment, never a typed date.
  add column event_time timestamptz not null default now(),
  add column action_source text not null default 'website'
    check (action_source in ('website', 'system_generated', 'other')),
  add column caused_by text not null default 'visitor'
    check (caused_by in ('visitor', 'owner', 'admin', 'job')),
  add column plan_payment_id uuid references public.plan_payments (id) on delete set null,
  -- The owner's own request (never the founder's): sent as Meta's client_ip_address and client_user_agent.
  add column client_ip inet,
  add column client_ua text check (char_length(client_ua) <= 500),
  -- Meta's id for the answer, for a support question to Meta (never a token).
  add column fbtrace_id text check (char_length(fbtrace_id) <= 100);

alter table public.track_events drop constraint track_events_status_check;
alter table public.track_events add constraint track_events_status_check
  check (status in ('waiting', 'queued', 'sent', 'failed', 'skipped'));

alter table public.track_events drop constraint track_events_problem_check;
alter table public.track_events add constraint track_events_problem_check check (problem in (
  'token_expired', 'rejected', 'timeout', 'no_match_data', 'off',
  'too_old', 'not_approved', 'demo_shop', 'test_shop', 'help_mode', 'admin'
));

-- waiting, queued and sent need no reason; failed and skipped always say why.
alter table public.track_events drop constraint track_events_check1;
alter table public.track_events add constraint track_events_reason_check
  check (status in ('waiting', 'queued', 'sent') or problem is not null);

-- Raw IP address and browser only while the row can still be sent.
alter table public.track_events add constraint track_events_client_check
  check (status not in ('sent', 'skipped') or (client_ip is null and client_ua is null));

-- A payment's events always name it; the founder's own events never carry an IP address or browser.
alter table public.track_events add constraint track_events_payment_check
  check (name not in ('AddPaymentInfo', 'Subscribe', 'Purchase') or status = 'skipped' or plan_payment_id is not null);
alter table public.track_events add constraint track_events_admin_check
  check (caused_by not in ('admin', 'job') or (client_ip is null and client_ua is null));

create index track_events_plan_payment on public.track_events (plan_payment_id);
create index track_events_waiting on public.track_events (plan_payment_id) where status = 'waiting';

-- The sign-up page and the owner's steps add events: queued, waiting for the founder, or skipped with the
-- reason. Never sent: sending is the worker's job (app_admin).
drop policy track_events_add on public.track_events;
create policy track_events_add on public.track_events
  for insert to app_api
  with check (
    status in ('queued', 'waiting', 'skipped')
    and caused_by in ('visitor', 'owner')
    and (tenant_id is null or tenant_id = private.current_tenant())
  );

-- ---------------------------------------------------------------------------------------------
-- 4. The plan's emails and the Activity tab
-- ---------------------------------------------------------------------------------------------
alter table public.notification_outbox drop constraint notification_outbox_kind_check;
alter table public.notification_outbox add constraint notification_outbox_kind_check check (kind in (
  'new_order', 'payment_to_check', 'storage', 'plan_payment', 'shop_live', 'plan_reminder', 'plan_answer',
  'help_started'
));

alter table public.shop_activity drop constraint shop_activity_kind_check;
alter table public.shop_activity add constraint shop_activity_kind_check check (kind in (
  'signed_up', 'asked', 'approved', 'payment_sent', 'payment_approved', 'payment_rejected',
  'payment_recorded', 'payment_undone', 'reminder', 'extra_days', 'support', 'closed', 'reopened',
  'created_by_admin'
));
