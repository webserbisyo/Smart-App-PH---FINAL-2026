-- Launch phase 5 (decision T117, docs/blueprints/phases-4-6.md X5, X6 and T66).
--
-- X5: push_outbox holds every push that waits to go out (order status, the owner's new-order alert, stamp
-- added, reward ready). The change that causes a push writes its row in the same transaction, so a rolled-back
-- order never sends one; NestJS sends right after the commit and a job every 30 seconds picks up the rest
-- (for update skip locked). Pushes carry ids and short words only, never a customer's phone or address.
--
-- X6: an owner's phone or laptop can get the new-order alert, so push_subscriptions can belong to an owner
-- (user_id) instead of a customer.
--
-- T66: a customer's payment photo always goes through, even when the shop's storage is full (it still counts
-- toward the meter), like the owner's plan receipts.

-- ---------------------------------------------------------------------------------------------
-- X6: owner subscriptions.
-- ---------------------------------------------------------------------------------------------
alter table public.push_subscriptions
  add column user_id uuid references auth.users (id) on delete cascade,
  -- A row is a customer's phone (member or guest) or an owner's device, never both.
  add constraint push_subscriptions_owner_or_customer check (user_id is null or member_id is null);

create index push_subscriptions_user on public.push_subscriptions (tenant_id, user_id) where user_id is not null;
-- An owner's device moves from one shop's alerts to nothing when they sign out: the row is deleted.
grant update (member_id) on public.push_subscriptions to app_api;

-- ---------------------------------------------------------------------------------------------
-- X5: the push queue.
-- ---------------------------------------------------------------------------------------------
create table public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  subscription_id uuid not null,
  kind text not null check (kind in ('order_status', 'owner_new_order', 'owner_payment', 'stamp_added', 'reward_ready')),
  -- The declarative Web Push shape (title, body, navigate), under 4 KB (R5).
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and pg_column_size(payload) < 4000),
  -- One push per event per phone even when the API retries (e.g. 'status:<order id>:ready').
  dedupe_key text not null check (char_length(dedupe_key) between 8 and 160),
  -- A newer push with the same topic replaces one still waiting on the phone (the order id).
  topic text check (topic ~ '^[A-Za-z0-9_-]{1,32}$'),
  ttl_seconds integer not null default 3600 check (ttl_seconds between 60 and 86400),
  urgency text not null default 'normal' check (urgency in ('normal', 'high')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'gone')),
  attempts smallint not null default 0 check (attempts between 0 and 10),
  send_after timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, subscription_id, dedupe_key),
  foreign key (tenant_id, subscription_id) references public.push_subscriptions (tenant_id, id) on delete cascade,
  check ((status = 'sent') = (sent_at is not null))
);

create index push_outbox_queue on public.push_outbox (send_after) where status = 'queued';
create index push_outbox_subscription on public.push_outbox (subscription_id);
create index push_outbox_tenant on public.push_outbox (tenant_id, created_at);

select private.apply_shop_rls('public.push_outbox');
-- The API only adds pushes; the sender job runs as app_admin.
grant select, insert on public.push_outbox to app_api;
grant select, insert, update, delete on public.push_outbox to app_admin;

-- ---------------------------------------------------------------------------------------------
-- T66: payment photos always go through (they still count toward the 500 MB meter).
-- ---------------------------------------------------------------------------------------------
create or replace function private.reserve_media(
  p_id uuid,
  p_kind text,
  p_bucket text,
  p_path text,
  p_bytes bigint,
  p_mime text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant();
  v_limit bigint;
  v_used bigint;
begin
  if v_tenant is null then
    raise exception 'no shop in this request' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('media:' || v_tenant::text, 0));
  if p_kind not in ('plan_proof', 'proof') then
    select t.storage_limit_bytes into v_limit from public.tenants t where t.id = v_tenant;
    select coalesce(sum(m.bytes), 0) into v_used
      from public.media_files m
      where m.tenant_id = v_tenant and m.counts_toward_limit and m.deleted_at is null;
    if v_used + p_bytes > v_limit then
      raise exception 'storage is full' using hint = 'storage_full';
    end if;
  end if;
  insert into public.media_files (id, tenant_id, kind, bucket, path, bytes, mime, uploaded_by)
  values (p_id, v_tenant, p_kind, p_bucket, p_path, p_bytes, p_mime, private.current_user_id());
end;
$$;

create or replace function private.confirm_media(p_id uuid, p_bytes bigint, p_mime text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant();
  v_kind text;
  v_limit bigint;
  v_used bigint;
begin
  if v_tenant is null then
    raise exception 'no shop in this request' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('media:' || v_tenant::text, 0));
  select m.kind into v_kind
    from public.media_files m
    where m.id = p_id and m.tenant_id = v_tenant and m.confirmed_at is null and m.deleted_at is null
    for update;
  if not found then
    raise exception 'no such upload' using errcode = 'P0002';
  end if;
  if v_kind not in ('plan_proof', 'proof') then
    select t.storage_limit_bytes into v_limit from public.tenants t where t.id = v_tenant;
    select coalesce(sum(m.bytes), 0) into v_used
      from public.media_files m
      where m.tenant_id = v_tenant and m.counts_toward_limit and m.deleted_at is null and m.id <> p_id;
    if v_used + p_bytes > v_limit then
      raise exception 'storage is full' using hint = 'storage_full';
    end if;
  end if;
  update public.media_files
    set bytes = p_bytes, mime = p_mime, confirmed_at = now()
    where id = p_id;
end;
$$;
