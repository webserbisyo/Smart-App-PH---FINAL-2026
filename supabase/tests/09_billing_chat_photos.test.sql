-- Step 9: photos in the Billing chat (T107).
begin;
grant usage on schema extensions to app_api, app_admin;
select plan(6);

insert into public.tenants (id, slug, name, kind, stage, price_monthly) values
  ('aaaaaaaa-1111-0000-0000-000000000000', 'kanto-smash', 'Kanto Smash', 'food', 'setting_up', 39900),
  ('bbbbbbbb-2222-0000-0000-000000000000', 'tala-apparel', 'Tala Apparel', 'retail', 'setting_up', 39900);

insert into public.media_files (id, tenant_id, kind, bucket, path, bytes, mime) values
  ('aaaaaaaa-9000-0000-0000-000000000000', 'aaaaaaaa-1111-0000-0000-000000000000', 'plan_proof', 'plan-proofs',
   'aaaaaaaa-1111-0000-0000-000000000000/plan_proof/a.webp', 120000, 'image/webp'),
  ('bbbbbbbb-9000-0000-0000-000000000000', 'bbbbbbbb-2222-0000-0000-000000000000', 'plan_proof', 'plan-proofs',
   'bbbbbbbb-2222-0000-0000-000000000000/plan_proof/b.webp', 120000, 'image/webp');

set local role postgres;
select set_config('app.tenant_id', 'aaaaaaaa-1111-0000-0000-000000000000', true);
set local role app_api;

select lives_ok(
  $$ insert into public.billing_messages (tenant_id, "from", kind, photo_media_id, reference)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'owner', 'photo', 'aaaaaaaa-9000-0000-0000-000000000000', '1234 567 890') $$,
  'an owner sends a photo with a reference number'
);
select lives_ok(
  $$ insert into public.billing_messages (tenant_id, "from", kind, photo_media_id)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'owner', 'photo', 'aaaaaaaa-9000-0000-0000-000000000000') $$,
  'the reference number is optional'
);
select throws_ok(
  $$ insert into public.billing_messages (tenant_id, "from", kind, photo_media_id)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'owner', 'photo', 'bbbbbbbb-9000-0000-0000-000000000000') $$,
  '23503', NULL, 'a photo from another shop cannot be sent'
);
select throws_ok(
  $$ insert into public.billing_messages (tenant_id, "from", kind, text, reference)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 'owner', 'note', 'hello', '123') $$,
  '23514', NULL, 'only a photo carries a reference number'
);
select lives_ok(
  $$ insert into public.plan_payments (tenant_id, months, amount, method, covers_until)
     values ('aaaaaaaa-1111-0000-0000-000000000000', 1, 39900, 'gcash', current_date + 30) $$,
  'a plan payment can be sent without a reference'
);

set local role postgres;
delete from public.media_files where id = 'aaaaaaaa-9000-0000-0000-000000000000';
select is(
  (select count(*)::integer from public.billing_messages where kind = 'photo' and photo_media_id is null),
  2,
  'deleting the photo keeps the chat line'
);

select * from finish();
rollback;
