-- T109: the storefront's Sample shops page lives at /samples, so no shop may take "samples" as its link.
-- Data only: reserved_slugs already has its RLS, grants and policies (20261117100000_platform_core.sql).
insert into public.reserved_slugs (slug) values ('samples')
on conflict (slug) do nothing;
