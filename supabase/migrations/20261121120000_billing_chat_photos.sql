-- Database step 9: photos in the Billing chat (decision T107; docs/blueprints/database.md section 4.6).
-- An owner can send a photo (payment proof or a reference screenshot) with an optional reference
-- number in the chat with Smart App PH, and the reference on a plan payment becomes optional because
-- the photo shows it. Photos reuse the plan_proof kind, so they never count toward the 500 MB.

-- One photo per message: a send of three photos is three messages that the chat groups together.
alter table public.billing_messages
  add column photo_media_id uuid,
  add column reference text check (char_length(reference) between 1 and 40),
  add foreign key (tenant_id, photo_media_id)
    references public.media_files (tenant_id, id) on delete set null (photo_media_id);

alter table public.billing_messages drop constraint billing_messages_kind_check;
alter table public.billing_messages add constraint billing_messages_kind_check check (
  kind in ('payment', 'approved', 'rejected', 'note', 'photo', 'reminder', 'extra_days', 'support', 'live')
);
-- A photo line is sent with its photo (NestJS checks it on insert). Deleting the photo later (the
-- 180-day clean-up or a shop deletion) keeps the line, which then shows "Photo removed".
alter table public.billing_messages add constraint billing_messages_reference_photo_check
  check (reference is null or kind = 'photo');

create index billing_messages_photo_media on public.billing_messages (photo_media_id);

-- An owner writes notes, photos and payment lines only; approvals, reminders and extra days come from us.
drop policy billing_messages_send on public.billing_messages;
create policy billing_messages_send on public.billing_messages
  for insert to app_api
  with check (
    tenant_id = private.current_tenant() and "from" = 'owner' and kind in ('note', 'photo', 'payment')
  );

-- The photo shows the reference, so typing it is optional (still unique when typed).
alter table public.plan_payments alter column reference drop not null;
