-- Database step 7: exports, plan billing, the shop's Activity tab, help mode, Meta tracking, the email
-- outbox and the audit log (docs/blueprints/database.md sections 4.7 and 4.8, decisions T66, T67, T88
-- to T92). The founder's side runs as app_admin; owners run as app_api inside their own shop.

-- ---------------------------------------------------------------------------------------------
-- Data export (T66): a zip the owner downloads for 24 hours.
-- ---------------------------------------------------------------------------------------------
create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  range text not null check (range in ('this_month', 'last_month', 'everything')),
  part_orders boolean not null default true,
  part_payments boolean not null default true,
  part_proofs boolean not null default false,
  status text not null default 'preparing' check (status in ('preparing', 'ready', 'failed', 'expired')),
  file_name text not null check (char_length(file_name) between 1 and 120),
  path text check (char_length(path) between 3 and 300),
  bytes bigint check (bytes >= 0),
  order_rows integer not null default 0 check (order_rows >= 0),
  proof_files integer not null default 0 check (proof_files >= 0),
  requested_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  expires_at timestamptz,
  check (part_orders or part_payments or part_proofs),
  check (path is null or starts_with(path, tenant_id::text || '/')),
  check (status <> 'ready' or (path is not null and ready_at is not null and expires_at is not null)),
  check (expires_at is null or expires_at <= ready_at + interval '24 hours')
);

create index data_exports_tenant on public.data_exports (tenant_id, created_at desc);
create index data_exports_requested_by on public.data_exports (requested_by);
create index data_exports_expiring on public.data_exports (expires_at) where status = 'ready';

select private.apply_shop_rls('public.data_exports');
grant select, insert, update (status, path, bytes, order_rows, proof_files, ready_at, expires_at) on public.data_exports to app_api;
grant select, insert, update, delete on public.data_exports to app_admin;

-- ---------------------------------------------------------------------------------------------
-- Plan payments (T67, T88, T92). The owner sends one; only the founder approves or rejects it.
-- ---------------------------------------------------------------------------------------------
create table public.plan_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  months smallint not null check (months in (1, 3, 6)),
  amount integer not null check (amount > 0),
  method text not null check (method in ('gcash', 'maya', 'bank', 'cash')),
  reference text not null check (char_length(reference) between 1 and 40),
  reference_norm text generated always as (upper(regexp_replace(reference, '\s', '', 'g'))) stored,
  proof_media_id uuid,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text check (reject_reason in ('amount_short', 'unreadable', 'reference_not_found', 'wrong_account')),
  -- The last Manila day this payment pays for.
  covers_until date not null,
  -- Set when the founder records a bank transfer or cash by hand (no proof photo).
  recorded_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, proof_media_id) references public.media_files (tenant_id, id) on delete set null (proof_media_id),
  check ((status = 'pending') = (decided_at is null)),
  check ((status = 'rejected') = (reject_reason is not null)),
  -- An owner sends GCash or Maya with a photo; bank and cash are recorded by the founder.
  check (method in ('gcash', 'maya') or recorded_by is not null)
);

-- One payment waiting per shop; a reference pays once across every shop (all go to one account).
create unique index plan_payments_one_pending on public.plan_payments (tenant_id) where status = 'pending';
create unique index plan_payments_reference on public.plan_payments (reference_norm) where status <> 'rejected';
create index plan_payments_tenant on public.plan_payments (tenant_id, created_at desc);
create index plan_payments_proof_media on public.plan_payments (proof_media_id);
create index plan_payments_recorded_by on public.plan_payments (recorded_by);
create index plan_payments_decided_by on public.plan_payments (decided_by);

alter table public.plan_payments enable row level security;
revoke all on public.plan_payments from anon, authenticated;
grant select, insert on public.plan_payments to app_api;
grant select, insert, update, delete on public.plan_payments to app_admin;

create policy plan_payments_own on public.plan_payments
  for select to app_api
  using (tenant_id = private.current_tenant());

create policy plan_payments_send on public.plan_payments
  for insert to app_api
  with check (tenant_id = private.current_tenant() and status = 'pending' and recorded_by is null);

create policy plan_payments_admin on public.plan_payments
  for all to app_admin
  using (true) with check (true);

-- The Billing chat between a shop and Smart App PH (T88).
create table public.billing_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  "from" text not null check ("from" in ('owner', 'admin', 'system')),
  kind text not null
    check (kind in ('payment', 'approved', 'rejected', 'note', 'reminder', 'extra_days', 'support', 'live')),
  payment_id uuid,
  text text check (char_length(text) between 1 and 300),
  reason text check (reason in ('amount_short', 'unreadable', 'reference_not_found', 'wrong_account')),
  days integer check (days between 1 and 365),
  seen_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (tenant_id, payment_id) references public.plan_payments (tenant_id, id) on delete set null (payment_id),
  check (kind <> 'note' or text is not null),
  check ((kind = 'rejected') = (reason is not null)),
  check ((kind = 'extra_days') = (days is not null)),
  check (kind not in ('payment', 'approved', 'rejected') or payment_id is not null)
);

create index billing_messages_tenant on public.billing_messages (tenant_id, created_at);
create index billing_messages_payment on public.billing_messages (payment_id);

alter table public.billing_messages enable row level security;
revoke all on public.billing_messages from anon, authenticated;
grant select, insert, update (seen_at) on public.billing_messages to app_api;
grant select, insert, update, delete on public.billing_messages to app_admin;

create policy billing_messages_own on public.billing_messages
  for select to app_api
  using (tenant_id = private.current_tenant());

-- An owner writes notes and payment lines only; approvals, reminders and extra days come from us.
create policy billing_messages_send on public.billing_messages
  for insert to app_api
  with check (tenant_id = private.current_tenant() and "from" = 'owner' and kind in ('note', 'payment'));

create policy billing_messages_seen on public.billing_messages
  for update to app_api
  using (tenant_id = private.current_tenant())
  with check (tenant_id = private.current_tenant());

create policy billing_messages_admin on public.billing_messages
  for all to app_admin
  using (true) with check (true);

-- ---------------------------------------------------------------------------------------------
-- A shop's Activity tab in Super Admin (T88). Append-only, for the founder too.
-- ---------------------------------------------------------------------------------------------
create table public.shop_activity (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in (
    'signed_up', 'asked', 'approved', 'payment_sent', 'payment_approved', 'payment_rejected',
    'payment_recorded', 'reminder', 'extra_days', 'support', 'closed', 'reopened', 'created_by_admin'
  )),
  by text not null check (by in ('owner', 'admin', 'system')),
  amount integer check (amount >= 0),
  days integer check (days >= 1),
  minutes integer check (minutes >= 1),
  reason text check (char_length(reason) <= 40),
  note text check (char_length(note) <= 300),
  -- The Meta events this step sent (T90).
  events text[] not null default '{}' check (events <@ array[
    'PageView', 'Lead', 'CompleteRegistration', 'SubmitApplication', 'StartTrial', 'AddPaymentInfo',
    'Subscribe', 'Purchase', 'Contact'
  ]::text[]),
  at timestamptz not null default now()
);

create index shop_activity_tenant on public.shop_activity (tenant_id, at desc);

alter table public.shop_activity enable row level security;
revoke all on public.shop_activity from anon, authenticated;
grant insert on public.shop_activity to app_api;
grant select, insert on public.shop_activity to app_admin;

create policy shop_activity_add on public.shop_activity
  for insert to app_api
  with check (tenant_id = private.current_tenant() and by = 'owner');

create policy shop_activity_admin on public.shop_activity
  for all to app_admin
  using (true) with check (true);

-- ---------------------------------------------------------------------------------------------
-- Help mode (T91): the founder opens a shop as its owner for at most 60 minutes.
-- ---------------------------------------------------------------------------------------------
create table public.support_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('set_up', 'fix_problem', 'owner_asked')),
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  check (ends_at > started_at and ends_at <= started_at + interval '60 minutes'),
  check (ended_at is null or ended_at >= started_at)
);

create index support_sessions_tenant on public.support_sessions (tenant_id, started_at desc);
create index support_sessions_admin on public.support_sessions (admin_user_id) where ended_at is null;

-- The owner can see that the founder helped (and when); only the founder starts or ends one.
select private.apply_shop_rls('public.support_sessions');
grant select on public.support_sessions to app_api;
grant select, insert, update (ends_at, ended_at) on public.support_sessions to app_admin;

-- ---------------------------------------------------------------------------------------------
-- Meta Conversions API outbox (T90). Platform-wide: a lead has no shop yet. Only hashed user data.
-- ---------------------------------------------------------------------------------------------
create table public.track_events (
  id uuid primary key default gen_random_uuid(),
  -- Shared with the browser pixel so Meta removes the double.
  event_id text not null unique check (char_length(event_id) between 8 and 80),
  name text not null check (name in (
    'PageView', 'Lead', 'CompleteRegistration', 'SubmitApplication', 'StartTrial', 'AddPaymentInfo',
    'Subscribe', 'Purchase', 'Contact'
  )),
  via text not null check (via in ('browser_server', 'server', 'browser')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  problem text check (problem in ('token_expired', 'rejected', 'timeout', 'no_match_data', 'off')),
  tenant_id uuid references public.tenants (id) on delete set null,
  lead_id uuid references public.signup_leads (id) on delete set null,
  value integer check (value >= 0),
  -- SHA-256 hashes (em, ph, external_id) and Meta's own fbp/fbc cookies; never a raw email or mobile.
  user_data jsonb not null default '{}' check (jsonb_typeof(user_data) = 'object'),
  page_url text check (char_length(page_url) <= 500),
  test boolean not null default false,
  attempts smallint not null default 0 check (attempts between 0 and 10),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'sent') = (sent_at is not null)),
  check (status in ('queued', 'sent') or problem is not null),
  check (not (user_data ?| array['email', 'phone', 'em_raw', 'ph_raw']))
);

create index track_events_queue on public.track_events (send_after) where status = 'queued';
create index track_events_tenant on public.track_events (tenant_id);
create index track_events_lead on public.track_events (lead_id);
create index track_events_created_at on public.track_events (created_at desc);

alter table public.track_events enable row level security;
revoke all on public.track_events from anon, authenticated;
grant insert on public.track_events to app_api;
grant select, insert, update, delete on public.track_events to app_admin;

-- The sign-up page and the owner's steps add events; sending them is the founder's worker (app_admin).
create policy track_events_add on public.track_events
  for insert to app_api
  with check (
    status = 'queued'
    and (tenant_id is null or tenant_id = private.current_tenant())
  );

create policy track_events_admin on public.track_events
  for all to app_admin
  using (true) with check (true);

-- ---------------------------------------------------------------------------------------------
-- Emails waiting to go to an owner (sent by the NestJS worker through Resend, D5).
-- ---------------------------------------------------------------------------------------------
create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  kind text not null check (kind in ('new_order', 'payment_to_check', 'storage', 'plan_payment')),
  to_email text not null check (to_email = lower(to_email) and char_length(to_email) between 3 and 254),
  -- Ids and numbers the email needs (order no., amount); never a customer's name, phone or address.
  payload jsonb not null default '{}' check (jsonb_typeof(payload) = 'object'),
  -- One email per event even if the API retries (e.g. 'new_order:<order id>').
  dedupe_key text not null check (char_length(dedupe_key) between 8 and 120),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 10),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, dedupe_key),
  check ((status = 'sent') = (sent_at is not null))
);

create index notification_outbox_queue on public.notification_outbox (send_after) where status = 'queued';

alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon, authenticated;
grant insert on public.notification_outbox to app_api;
grant select, insert, update, delete on public.notification_outbox to app_admin;

create policy notification_outbox_add on public.notification_outbox
  for insert to app_api
  with check (tenant_id = private.current_tenant() and status = 'queued');

create policy notification_outbox_admin on public.notification_outbox
  for all to app_admin
  using (true) with check (true);

-- ---------------------------------------------------------------------------------------------
-- Who did what in help mode and in Super Admin. Append-only for everyone.
-- ---------------------------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  tenant_id uuid references public.tenants (id) on delete set null,
  support_session_id uuid references public.support_sessions (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)*$' and char_length(action) <= 60),
  -- What was touched, as 'table:id'; details hold ids and short values, never customer data.
  target text check (char_length(target) <= 120),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  at timestamptz not null default now()
);

create index audit_log_tenant on public.audit_log (tenant_id, at desc);
create index audit_log_actor on public.audit_log (actor_user_id, at desc);
create index audit_log_support_session on public.audit_log (support_session_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;
grant insert on public.audit_log to app_api;
grant select, insert on public.audit_log to app_admin;

-- In help mode the API writes as the shop (app_api) and must name the help session it belongs to.
create policy audit_log_help on public.audit_log
  for insert to app_api
  with check (tenant_id = private.current_tenant() and support_session_id is not null);

create policy audit_log_admin on public.audit_log
  for all to app_admin
  using (true) with check (true);
