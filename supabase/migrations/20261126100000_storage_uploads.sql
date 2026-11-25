-- Phase 3 (shop setup, decision T116): the six Storage buckets and the two steps of an owner upload.

-- X8 and R12 to R14: the buckets. Menu, look, QR and profile pictures are public (served through the CDN,
-- each change gets a new path, so the browser may keep them for a year). Customers' payment proofs and the
-- owner's plan receipts are private: only NestJS signs a short link to them. A signed upload link cannot
-- carry a size, so these limits are the only check at upload time; NestJS checks the real size again when
-- the owner confirms. Pictures only (the media_files CHECK has the same list). The browser never calls
-- Storage except to send a file to a link NestJS signed, so storage.objects needs no policies (none means
-- no access for anon and authenticated).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('menu', 'menu', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif']),
  ('look', 'look', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif']),
  ('qr', 'qr', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif']),
  ('profile', 'profile', true, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif']),
  ('proofs', 'proofs', false, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif']),
  ('plan-proofs', 'plan-proofs', false, 5242880, array['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Confirming an upload writes the file's real size and type (R12), so the API's role may change them.
-- RLS (shop_own) still keeps it to the request's shop.
grant update (bytes, mime, width, height) on public.media_files to app_api;

-- Step 1: room for a file (T66). One shop's uploads take turns (a transaction lock), so two phones at once
-- never both fit into the last free megabytes. A plan receipt never counts against the shop's storage.
-- Runs as the caller: RLS keeps every read and the insert to the request's shop.
create function private.reserve_media(
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
  if p_kind <> 'plan_proof' then
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

-- Step 2 (X7): the file arrived; NestJS read its real size and type from Storage. The limit is checked again
-- with the real size. An unknown, finished or deleted upload is "not found" (P0002).
create function private.confirm_media(p_id uuid, p_bytes bigint, p_mime text)
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
  if v_kind <> 'plan_proof' then
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

revoke execute on function private.reserve_media(uuid, text, text, text, bigint, text) from public;
revoke execute on function private.confirm_media(uuid, bigint, text) from public;
grant execute on function private.reserve_media(uuid, text, text, text, bigint, text) to app_api;
grant execute on function private.confirm_media(uuid, bigint, text) to app_api;
