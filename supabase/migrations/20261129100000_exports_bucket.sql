-- Phase 6 (decision T117, X10): a private Storage bucket for the owner's data export (orders and payments as
-- CSV, payment photos when asked) and the Storage › Files download zip. Only NestJS writes to it and signs a
-- 24-hour link; a timed job removes the file when the link ends. Like the other buckets, storage.objects gets
-- no policies (none means no access for anon and authenticated). 200 MB is the most one zip may be.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exports', 'exports', false, 209715200, array['application/zip'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
