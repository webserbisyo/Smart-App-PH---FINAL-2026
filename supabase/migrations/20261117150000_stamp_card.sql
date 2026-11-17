-- Database step 6: stamp card (docs/blueprints/database.md section 4.6, decisions T57, T58, M4, M10, S24, S26).
-- One card per shop. The stamp history is append-only and a member's balance is the sum of its
-- deltas (never stored). Mistakes are fixed with a new entry (`undone`, `reversed`, `returned`).

-- A prize variant must belong to the prize item.
alter table public.item_variants add constraint item_variants_tenant_item_id unique (tenant_id, item_id, id);

create table public.stamp_cards (
  tenant_id uuid primary key references public.tenants (id) on delete cascade,
  status text not null default 'off' check (status in ('off', 'on', 'paused')),
  -- The rule (StampRuleSchema). min_order_total is the subtotal before the reward discount.
  min_order_total integer not null default 0 check (min_order_total >= 0),
  stamps_needed integer not null default 8 check (stamps_needed between 4 and 20),
  welcome_stamps smallint not null default 1 check (welcome_stamps in (0, 1)),
  max_earned integer default 1 check (max_earned between 1 and 10),
  period text default 'day' check (period in ('day', 'week', 'month')),
  -- The prize (RewardSchema).
  reward_kind text not null check (reward_kind in ('discount', 'free_item', 'custom')),
  reward_amount integer check (reward_amount > 0),
  reward_item_id uuid,
  reward_variant_id uuid,
  reward_title text not null check (char_length(reward_title) between 1 and 60),
  reward_description text check (char_length(reward_description) <= 200),
  reward_media_id uuid,
  -- Limited prizes (S26): both null = unlimited.
  quantity_total integer check (quantity_total >= 1),
  quantity_left integer check (quantity_left >= 0),
  one_per_customer boolean not null default false,
  updated_at timestamptz not null default now(),
  -- item_is_reward (M10): the prize item and variant cannot be deleted while they are the prize.
  constraint stamp_cards_reward_item_fk foreign key (tenant_id, reward_item_id)
    references public.items (tenant_id, id) on delete restrict,
  constraint stamp_cards_reward_variant_fk foreign key (tenant_id, reward_item_id, reward_variant_id)
    references public.item_variants (tenant_id, item_id, id) on delete restrict,
  foreign key (tenant_id, reward_media_id) references public.media_files (tenant_id, id) on delete set null (reward_media_id),
  check ((max_earned is null) = (period is null)),
  check (reward_kind <> 'discount' or reward_amount is not null),
  -- Only a free item names an item, so a discount never blocks deleting a menu item.
  check ((reward_kind = 'free_item') = (reward_item_id is not null)),
  check ((reward_item_id is null) = (reward_variant_id is null)),
  check ((quantity_total is null) = (quantity_left is null)),
  check (quantity_left is null or quantity_left <= quantity_total)
);

create index stamp_cards_reward_item on public.stamp_cards (reward_item_id);
create index stamp_cards_reward_variant on public.stamp_cards (reward_variant_id);
create index stamp_cards_reward_media on public.stamp_cards (reward_media_id);

select private.apply_shop_rls('public.stamp_cards');
grant select, insert, update on public.stamp_cards to app_api;
grant select, insert, update, delete on public.stamp_cards to app_admin;

-- A prize claim (custom prizes): the code and QR the counter checks.
create table public.reward_claims (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null,
  code text not null check (char_length(code) between 4 and 16),
  status text not null default 'pending' check (status in ('pending', 'given', 'cancelled')),
  -- The prize's title at the moment of the claim (history, not a copy of the card).
  title text not null check (char_length(title) between 1 and 60),
  cancel_reason text check (char_length(cancel_reason) between 1 and 200),
  given_at timestamptz,
  given_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, code),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete cascade,
  check ((status = 'given') = (given_at is not null)),
  check ((status = 'cancelled') = (cancel_reason is not null))
);

create index reward_claims_member on public.reward_claims (member_id, created_at desc);
create index reward_claims_pending on public.reward_claims (tenant_id) where status = 'pending';
create index reward_claims_given_by on public.reward_claims (given_by);

select private.apply_shop_rls('public.reward_claims');
grant select, insert, update (status, cancel_reason, given_at, given_by) on public.reward_claims to app_api;
grant select, insert, update, delete on public.reward_claims to app_admin;

-- The stamp history (LEDGER_KINDS without `pending`, which is counted from open orders).
create table public.stamp_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  member_id uuid not null,
  kind text not null
    check (kind in ('welcome', 'earned', 'used', 'claimed', 'returned', 'reversed', 'given', 'removed', 'undone')),
  delta integer not null check (delta between -50 and 50 and delta <> 0),
  -- Manual changes: the category the member sees, and a note only the shop sees.
  reason_category text check (reason_category in ('counter_purchase', 'correction', 'goodwill', 'other')),
  private_note text check (char_length(private_note) between 1 and 200),
  order_id uuid,
  claim_id uuid,
  -- An `undone` entry points at the counter change it cancels (T58, 10 seconds).
  undoes_id uuid,
  client_key text check (char_length(client_key) between 8 and 64),
  by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, member_id) references public.members (tenant_id, id) on delete cascade,
  foreign key (tenant_id, order_id) references public.orders (tenant_id, id) on delete set null (order_id),
  foreign key (tenant_id, claim_id) references public.reward_claims (tenant_id, id) on delete set null (claim_id),
  foreign key (tenant_id, undoes_id) references public.stamp_entries (tenant_id, id) on delete cascade,
  -- Which way each kind moves the balance; `undone` goes either way.
  check (kind not in ('welcome', 'earned', 'returned', 'given') or delta > 0),
  check (kind not in ('used', 'claimed', 'reversed', 'removed') or delta < 0),
  check ((kind in ('given', 'removed')) = (reason_category is not null)),
  check (private_note is null or kind in ('given', 'removed')),
  check ((kind = 'undone') = (undoes_id is not null)),
  check (kind <> 'earned' or order_id is not null),
  check (kind <> 'claimed' or claim_id is not null)
);

-- One welcome per member, one earned and one reward per order, one undo per entry, one entry per tap.
create unique index stamp_entries_welcome on public.stamp_entries (member_id) where kind = 'welcome';
create unique index stamp_entries_earned on public.stamp_entries (order_id) where kind = 'earned';
create unique index stamp_entries_used on public.stamp_entries (order_id) where kind = 'used';
create unique index stamp_entries_undoes on public.stamp_entries (undoes_id) where undoes_id is not null;
create unique index stamp_entries_client_key on public.stamp_entries (tenant_id, client_key) where client_key is not null;
create index stamp_entries_member on public.stamp_entries (tenant_id, member_id, created_at);
create index stamp_entries_member_id on public.stamp_entries (member_id);
create index stamp_entries_order on public.stamp_entries (order_id);
create index stamp_entries_claim on public.stamp_entries (claim_id);
create index stamp_entries_by_user on public.stamp_entries (by_user_id);

select private.apply_shop_rls('public.stamp_entries');
-- Append-only: the API adds entries and never changes or removes one.
grant select, insert on public.stamp_entries to app_api;
grant select, insert, update, delete on public.stamp_entries to app_admin;

-- ---------------------------------------------------------------------------------------------
-- Guards (database.md section 5). security invoker: they run inside the caller's RLS.
-- ---------------------------------------------------------------------------------------------

-- A member's balance; locks the member row first so two changes at once queue up and the balance
-- never goes below zero (NestJS checks the result before it inserts a negative entry).
create function private.lock_stamp_balance(p_member_id uuid)
returns integer
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_balance integer;
begin
  perform 1 from public.members m
   where m.id = p_member_id and m.tenant_id = private.current_tenant()
   for update;
  if not found then
    raise exception 'member not found' using errcode = 'P0002';
  end if;
  select coalesce(sum(e.delta), 0)::integer into v_balance
    from public.stamp_entries e
   where e.tenant_id = private.current_tenant() and e.member_id = p_member_id;
  return v_balance;
end;
$$;

-- Take one limited prize; false = reward_all_claimed. Unlimited prizes always pass.
create function private.take_prize()
returns boolean
language sql
volatile
set search_path = ''
as $$
  with taken as (
    update public.stamp_cards c
       set quantity_left = c.quantity_left - 1
     where c.tenant_id = private.current_tenant()
       and (c.quantity_left is null or c.quantity_left > 0)
    returning 1
  )
  select exists (select 1 from taken)
$$;

-- Give a cancelled claim's prize back (never above the total).
create function private.give_back_prize()
returns void
language sql
volatile
set search_path = ''
as $$
  update public.stamp_cards c
     set quantity_left = least(c.quantity_left + 1, c.quantity_total)
   where c.tenant_id = private.current_tenant()
     and c.quantity_left is not null
$$;

revoke execute on function private.lock_stamp_balance(uuid) from public;
revoke execute on function private.take_prize() from public;
revoke execute on function private.give_back_prize() from public;
grant execute on function private.lock_stamp_balance(uuid) to app_api, app_admin;
grant execute on function private.take_prize() to app_api, app_admin;
grant execute on function private.give_back_prize() to app_api, app_admin;
