-- Phase 6: the private exports bucket (20261129100000_exports_bucket.sql, X10).
begin;
select plan(2);

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'exports' $$,
  $$ values (false, 209715200::bigint, array['application/zip']::text[]) $$,
  'exports is private, 200 MB, ZIP only'
);

-- Nobody reads it through Supabase: only the API's signed links.
select is_empty(
  $$ select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
       and (qual ilike '%exports%' or with_check ilike '%exports%') $$,
  'no browser policy names the exports bucket'
);

select * from finish();
rollback;
