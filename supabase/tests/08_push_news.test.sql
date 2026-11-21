-- Step 8: push News (T106).
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(10);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.categories (id, tenant_id, name, icon) values
  ('aaaaaaaa-c000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'Burgers', '{"kind":"emoji","char":"🍔"}');
insert into public.items (id, tenant_id, category_id, name, base_price) values
  ('aaaaaaaa-1000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-c000-0000-0000-000000000000', 'Classic Smash', 18900);

insert into public.push_subscriptions (id, tenant_id, endpoint, p256dh, auth) values
  ('aaaaaaaa-5000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'https://push.example.com/a1', 'p256dh-key-aaaa', 'auth-aaaa');

insert into public.push_campaigns (id, tenant_id, title, body, link_kind, link_item_id, status, sent_at, phones) values
  ('aaaaaaaa-6000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'New: Classic Smash', 'Try it today.', 'item', 'aaaaaaaa-1000-0000-0000-000000000000', 'sent', now(), 1),
  ('bbbbbbbb-6000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'New tote', 'In store now.', 'home', null, 'draft', null, 0);
insert into public.push_deliveries (tenant_id, campaign_id, subscription_id, status, sent_at) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-6000-0000-0000-000000000000', 'aaaaaaaa-5000-0000-0000-000000000000', 'sent', now());

select is(
  (select news from public.push_subscriptions where id = 'aaaaaaaa-5000-0000-0000-000000000000'),
  false,
  'a phone gets no news until the customer says yes'
);
select col_default_is(
  'public', 'shop_settings', 'push_stamp_added', 'true',
  'the automatic stamp push is on for a new shop'
);

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select results_eq($$ select title from public.push_campaigns $$, ARRAY['New: Classic Smash'], 'a shop sees only its own news');
select is((select count(*)::integer from public.push_deliveries), 1, 'a shop sees only its own deliveries');
select throws_ok(
  $$ insert into public.push_campaigns (tenant_id, title, body) values ('aaaaaaaa-1111-0000-0000-000000000000', repeat('x', 41), 'Hi') $$,
  '23514', NULL, 'a title is at most 40 characters'
);
select throws_ok(
  $$ insert into public.push_campaigns (tenant_id, title, body, status) values ('aaaaaaaa-1111-0000-0000-000000000000', 'Hi', 'Hello', 'waiting') $$,
  '23514', NULL, 'waiting news always says why and when'
);
select throws_ok(
  $$ insert into public.push_campaigns (tenant_id, title, body, audience) values ('aaaaaaaa-1111-0000-0000-000000000000', 'Hi', 'Hello', 'vip') $$,
  '23514', NULL, 'the audience is one of the member groups'
);
select throws_ok(
  $$ insert into public.push_campaigns (tenant_id, title, body) values ('bbbbbbbb-2222-0000-0000-000000000000', 'Hi', 'Hello') $$,
  '42501', NULL, 'a shop cannot write news for another shop'
);
update public.push_subscriptions set news = true, news_changed_at = now() where id = 'aaaaaaaa-5000-0000-0000-000000000000';
select is((select news from public.push_subscriptions), true, 'the API saves the phone''s news yes');

set local role postgres;
delete from public.items where id = 'aaaaaaaa-1000-0000-0000-000000000000';
select is(
  (select link_item_id from public.push_campaigns where id = 'aaaaaaaa-6000-0000-0000-000000000000'),
  null,
  'deleting the linked item keeps the news, without its item'
);

select * from finish();
rollback;
