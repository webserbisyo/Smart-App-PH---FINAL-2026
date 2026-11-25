-- Launch phase 4 (decision T117, docs/blueprints/phases-4-6.md X1 and X2).
--
-- X1: a size or an add-on that was ever ordered can now be removed from the menu (Q11). Order lines already
-- keep the name, the size label and the price at the moment of sale, so the history stays right; the link to
-- the menu row simply becomes empty. Removing a whole item that was ordered stays blocked (item_has_orders).
--
-- X2: sample variant templates are marked, so "Clear samples" can find them.

-- order_lines.variant_id: nullable, emptied when the size is removed.
alter table public.order_lines alter column variant_id drop not null;
alter table public.order_lines drop constraint order_lines_tenant_id_variant_id_fkey;
alter table public.order_lines
  add constraint order_lines_tenant_id_variant_id_fkey foreign key (tenant_id, variant_id)
  references public.item_variants (tenant_id, id) on delete set null (variant_id);

-- order_line_options.option_id was part of the key, so the row gets its own id first.
alter table public.order_line_options drop constraint order_line_options_pkey;
alter table public.order_line_options add column id uuid not null default gen_random_uuid();
alter table public.order_line_options add constraint order_line_options_pkey primary key (id);
alter table public.order_line_options alter column option_id drop not null;
-- One row per add-on on a line while the add-on exists (empty links never clash).
alter table public.order_line_options
  add constraint order_line_options_line_option_key unique (line_id, option_id);
alter table public.order_line_options drop constraint order_line_options_tenant_id_option_id_fkey;
alter table public.order_line_options
  add constraint order_line_options_tenant_id_option_id_fkey foreign key (tenant_id, option_id)
  references public.options (tenant_id, id) on delete set null (option_id);

-- X2: templates copied from a sample pack.
alter table public.variant_templates add column is_sample boolean not null default false;

-- Two ready-made variants may share a name (food: "Size" Regular/Large and "Size" Small/Medium/Large, T46
-- defaults in core words.ts); the owner tells them apart by their options. The old unique name blocked a
-- new shop's defaults, so it goes. Option labels stay unique inside one variant.
drop index public.variant_templates_name;
create index variant_templates_tenant on public.variant_templates (tenant_id);
