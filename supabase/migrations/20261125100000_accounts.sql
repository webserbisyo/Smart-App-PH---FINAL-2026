-- Phase 2 (accounts, decision T116): more reserved shop links and the sign-up lead hand-over.

-- X2: links nobody may take. `demo` and `samples` are storefront paths (T109); the rest are our own
-- subdomains (T105 domain plan) and the staging addresses (Q4). Data only: reserved_slugs already has its
-- RLS, grants and policies (20261117100000_platform_core.sql).
insert into public.reserved_slugs (slug) values
  ('demo'), ('stays'), ('rsvp'), ('docs'), ('dev'), ('staging'), ('api-staging'), ('staging-app')
on conflict (slug) do nothing;

-- Sign-up step 3 links the step 1 lead to the new shop. The lead has no shop yet, so the API's role cannot
-- see it (signup_leads_own needs tenant_id = the request's shop) and an UPDATE through RLS changes no row.
-- This trusted function does only that one hand-over: the lead must be unlinked and carry the signed-in
-- owner's email, and the shop is always the request's shop. It answers where the sign-up came from.
-- The hand-over happens before the shop row is written (the shop takes its channel and campaign from the
-- lead, and the API's role cannot change them afterwards), so the lead's key to the shop is checked at commit.
alter table public.signup_leads
  alter constraint signup_leads_tenant_fk deferrable initially deferred;

create function private.claim_signup_lead(p_lead_id uuid, p_email text)
returns table (channel text, campaign text, phone text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tenant uuid := private.current_tenant();
begin
  if v_tenant is null then
    raise exception 'no shop in this request' using errcode = '42501';
  end if;
  return query
    update public.signup_leads l
       set tenant_id = v_tenant
     where l.id = p_lead_id
       and l.email = lower(p_email)
       and l.tenant_id is null
    returning l.channel, l.campaign, l.phone;
end;
$$;

revoke execute on function private.claim_signup_lead(uuid, text) from public;
grant execute on function private.claim_signup_lead(uuid, text) to app_api;
