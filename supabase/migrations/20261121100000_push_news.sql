-- Database step 8: push News (decision T106, P1 to P14; docs/blueprints/database.md section 4.5).
-- The owner's news to the shop's phones, one row per phone per news (also the send queue for the
-- @nestjs/schedule job, D5), the phone's own news yes or no, and the two automatic pushes. Limits
-- (2 a week, 1 a day, quiet 9 PM to 8 AM Manila) are checked in NestJS with the rules in core.

-- A news photo is its own kind, so it counts toward the 500 MB like the shop's other pictures.
alter table public.media_files drop constraint media_files_kind_check;
alter table public.media_files add constraint media_files_kind_check check (
  kind in ('logo', 'banner', 'item', 'category', 'qr', 'avatar', 'plan_proof', 'proof', 'member_photo', 'news_photo')
);

-- The phone's choices (P5: news is a separate, unticked yes) and its health for clean sending.
alter table public.push_subscriptions
  add column news boolean not null default false,
  add column news_changed_at timestamptz,
  add column platform text not null default 'other' check (platform in ('android', 'ios', 'desktop', 'other')),
  add column last_ok_at timestamptz,
  add column fail_count smallint not null default 0 check (fail_count between 0 and 100);

create index push_subscriptions_news on public.push_subscriptions (tenant_id) where news;
grant update (news, news_changed_at, platform, last_ok_at, fail_count) on public.push_subscriptions to app_api;

-- The two automatic pushes (P3): a stamp was added, a reward is ready. Both on for a new shop.
alter table public.shop_settings
  add column push_stamp_added boolean not null default true,
  add column push_reward_ready boolean not null default true;

-- ---------------------------------------------------------------------------------------------
-- push_campaigns: one news. Drafts and cancelled news never count toward the week's limit; the
-- results are computed from push_deliveries and orders when the page loads (no summary columns).
-- ---------------------------------------------------------------------------------------------
create table public.push_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 40),
  body text not null check (char_length(body) between 1 and 120),
  image_media_id uuid,
  link_kind text not null default 'home' check (link_kind in ('home', 'item', 'rewards')),
  link_item_id uuid,
  audience text not null default 'everyone'
    check (audience in ('everyone', 'members', 'ready', 'almost', 'regulars', 'quiet', 'new')),
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'waiting', 'canceled')),
  wait_reason text check (wait_reason in ('link_gone', 'plan_lapsed', 'shop_paused')),
  send_at timestamptz,
  sent_at timestamptz,
  phones integer not null default 0 check (phones >= 0),
  copied_from_id uuid,
  -- Help mode can write a draft but never send (P13): who made the row is kept for the shop's log.
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, image_media_id) references public.media_files (tenant_id, id) on delete restrict,
  foreign key (tenant_id, link_item_id) references public.items (tenant_id, id) on delete set null (link_item_id),
  foreign key (tenant_id, copied_from_id) references public.push_campaigns (tenant_id, id) on delete set null (copied_from_id),
  -- An item link loses its item when the item is deleted; NestJS then holds the news as waiting (link_gone).
  check (link_kind = 'item' or link_item_id is null),
  check ((status = 'waiting') = (wait_reason is not null)),
  check (status not in ('scheduled', 'waiting') or send_at is not null),
  check ((status = 'sent') = (sent_at is not null))
);

create index push_campaigns_list on public.push_campaigns (tenant_id, created_at desc);
-- The week and day limits and the send job read the news that count, by time.
create index push_campaigns_due on public.push_campaigns (tenant_id, coalesce(sent_at, send_at))
  where status in ('scheduled', 'sending', 'sent', 'waiting');
create index push_campaigns_image on public.push_campaigns (image_media_id);
create index push_campaigns_item on public.push_campaigns (link_item_id);
create index push_campaigns_copied on public.push_campaigns (copied_from_id);
create index push_campaigns_created_by on public.push_campaigns (created_by);

select private.apply_shop_rls('public.push_campaigns');
grant select, insert, update, delete on public.push_campaigns to app_api;
grant select, insert, update, delete on public.push_campaigns to app_admin;

-- ---------------------------------------------------------------------------------------------
-- push_deliveries: one row per phone per news. queued -> sent | failed; opened_at when the push is
-- tapped; stopped_at when the customer turned news off from it. The phone's endpoint is never copied.
-- ---------------------------------------------------------------------------------------------
create table public.push_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  campaign_id uuid not null,
  subscription_id uuid,
  member_id uuid,
  platform text not null default 'other' check (platform in ('android', 'ios', 'desktop', 'other')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  attempts smallint not null default 0 check (attempts between 0 and 10),
  sent_at timestamptz,
  opened_at timestamptz,
  stopped_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, subscription_id),
  foreign key (tenant_id, campaign_id) references public.push_campaigns (tenant_id, id) on delete cascade,
  -- A phone that is gone keeps its row for the counts.
  foreign key (tenant_id, subscription_id) references public.push_subscriptions (tenant_id, id) on delete set null (subscription_id),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete set null (member_id),
  check ((status = 'sent') = (sent_at is not null)),
  check (opened_at is null or sent_at is not null)
);

create index push_deliveries_campaign on public.push_deliveries (campaign_id, status);
create index push_deliveries_queue on public.push_deliveries (created_at) where status = 'queued';
create index push_deliveries_tenant on public.push_deliveries (tenant_id);
create index push_deliveries_subscription on public.push_deliveries (subscription_id);
create index push_deliveries_member on public.push_deliveries (member_id);

select private.apply_shop_rls('public.push_deliveries');
grant select, insert, update on public.push_deliveries to app_api;
grant select, insert, update, delete on public.push_deliveries to app_admin;
