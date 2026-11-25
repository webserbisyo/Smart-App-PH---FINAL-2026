-- The counter note on a member ("less ice"), written by the owner on the member panel (T117, founder yes 2026-11-25).
-- Owner-only, never shown to the member. Cleared when the member is erased, like their contacts.
alter table public.members
  add column note text check (note is null or char_length(note) between 1 and 300);

alter table public.members drop constraint members_check1;
alter table public.members
  add constraint members_check1 check (
    erased_at is null or (email is null and phone is null and user_id is null and note is null)
  );

-- RLS, policies and grants on public.members stay as they are (20261117130000_members.sql):
-- app_api already has select, insert and update on the whole table, behind the shop policy.
