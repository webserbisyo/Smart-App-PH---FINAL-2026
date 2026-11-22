import * as React from 'react';
import { GiftIcon, UserRoundIcon, UsersIcon } from 'lucide-react';
import { newOrderWords, type PublicStampCard } from '@smartapp/core';
import { useCustomers } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Switch } from '@smartapp/ui/components/switch';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { CustomerFace } from '@/app/owner-avatar';
import { SearchField } from '@/app/search-field';
import type { CustomerChoice } from './draft.js';

const W = newOrderWords.customer;
const PRESSED = 'aria-pressed:bg-primary aria-pressed:text-primary-foreground';

/**
 * Who the order is for (T111): a guest (a name, "Walk-in" when empty, and an optional mobile number) or a
 * member found by name, mobile or member code. A member earns a stamp when the order is done, and a
 * ready prize can go on this order.
 */
export function CustomerFields({
  value,
  onChange,
  useReward,
  onUseReward,
  card,
  lockMember,
}: {
  value: CustomerChoice;
  onChange: (next: CustomerChoice) => void;
  useReward: boolean;
  onUseReward: (on: boolean) => void;
  card: PublicStampCard | null;
  // Edit order: the prize was decided when the order was made.
  lockMember?: boolean | undefined;
}) {
  const [guest, setGuest] = React.useState(
    value.kind === 'guest' ? value : { kind: 'guest' as const, name: '', phone: '' },
  );
  const cardOn = card !== null && card.status !== 'off';

  return (
    <div className="flex flex-col gap-3">
      <ToggleGroup
        value={[value.kind]}
        onValueChange={(next) => {
          const picked = next[0];
          if (picked === 'guest') onChange(guest);
          if (picked === 'member' && value.kind !== 'member')
            onChange({ kind: 'member', memberId: '', name: '', stamps: null, prizeReady: false });
        }}
        aria-label={W.title}
        spacing={2}
        className="grid grid-cols-2"
      >
        <ToggleGroupItem
          value="guest"
          variant="outline"
          className={`h-11 gap-2 font-semibold md:h-9 ${PRESSED}`}
        >
          <UserRoundIcon aria-hidden="true" />
          {W.guest}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="member"
          variant="outline"
          className={`h-11 gap-2 font-semibold md:h-9 ${PRESSED}`}
        >
          <UsersIcon aria-hidden="true" />
          {W.member}
        </ToggleGroupItem>
      </ToggleGroup>

      {value.kind === 'guest' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Field>
              <FieldLabel htmlFor="new-order-name">{W.name}</FieldLabel>
              <Input
                id="new-order-name"
                value={value.name}
                maxLength={80}
                autoComplete="off"
                placeholder={W.namePlaceholder}
                onChange={(e) => {
                  const next = { ...value, name: e.target.value };
                  setGuest(next);
                  onChange(next);
                }}
                className="h-11 text-base md:h-9 md:text-sm"
              />
              <FieldDescription>{W.nameHint}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-order-phone">{W.phone}</FieldLabel>
              <Input
                id="new-order-phone"
                value={value.phone}
                inputMode="tel"
                autoComplete="off"
                maxLength={20}
                placeholder={W.phonePlaceholder}
                onChange={(e) => {
                  const next = { ...value, phone: e.target.value };
                  setGuest(next);
                  onChange(next);
                }}
                className="h-11 text-base tabular-nums md:h-9 md:text-sm"
              />
            </Field>
          </div>
          {cardOn ? <p className="text-sm text-muted-foreground">{W.joinNudge}</p> : null}
        </>
      ) : value.memberId ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <UsersIcon className="size-5 text-member-text" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{value.name}</p>
              {value.stamps ? (
                <p className="text-sm text-muted-foreground tabular-nums">
                  {W.stamps(value.stamps.have, value.stamps.goal)}
                </p>
              ) : null}
            </div>
            {!lockMember ? (
              <Button
                variant="outline"
                className="h-11 md:h-9"
                onClick={() =>
                  onChange({
                    kind: 'member',
                    memberId: '',
                    name: '',
                    stamps: null,
                    prizeReady: false,
                  })
                }
              >
                {W.change}
              </Button>
            ) : null}
          </div>
          {cardOn ? <p className="text-sm text-muted-foreground">{W.stampNote}</p> : null}
          {value.prizeReady && card && !lockMember ? (
            <Field orientation="horizontal" className="items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="new-order-prize" className="gap-1.5">
                  <GiftIcon className="size-4 text-member-text" aria-hidden="true" />
                  {W.usePrize}
                </FieldLabel>
                <FieldDescription>{W.prizeHint(card.reward.title)}</FieldDescription>
              </div>
              <Switch id="new-order-prize" checked={useReward} onCheckedChange={onUseReward} />
            </Field>
          ) : null}
        </div>
      ) : (
        <MemberSearch onPick={onChange} />
      )}
    </div>
  );
}

function MemberSearch({ onPick }: { onPick: (next: CustomerChoice) => void }) {
  const [q, setQ] = React.useState('');
  const query = useCustomers({
    filter: 'all',
    q: q.trim(),
    stamps: null,
    sort: q.trim() ? 'name' : 'last_order',
    cursor: 0,
    limit: 6,
  });
  const rows = query.data?.rows ?? [];
  return (
    <div className="flex flex-col gap-2">
      <SearchField
        value={q}
        onChange={setQ}
        placeholder={W.findPlaceholder}
        clearLabel={newOrderWords.items.clearSearch}
        ariaLabel={W.find}
      />
      <p className="text-sm text-muted-foreground">{W.findHint}</p>
      {query.isPending ? (
        <div className="flex flex-col gap-2" aria-label={W.searching}>
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl bg-muted/50 px-3 py-4 text-sm text-muted-foreground">
          {W.noMember}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() =>
                  onPick({
                    kind: 'member',
                    memberId: row.id,
                    name: row.name,
                    stamps: { have: Math.min(row.balance, row.goal), goal: row.goal },
                    prizeReady: row.balance >= row.goal,
                  })
                }
                className="flex min-h-14 w-full pressable items-center gap-3 rounded-xl px-2 text-left outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CustomerFace
                  avatar={row.avatar}
                  name={row.name}
                  className="ring-2 ring-member"
                  initialsClassName="bg-member-soft text-member-soft-foreground"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="block truncate text-sm text-muted-foreground tabular-nums">
                    {row.phone}
                    {row.memberCode ? ` · ${row.memberCode}` : ''}
                  </span>
                </span>
                {row.balance >= row.goal ? (
                  <Badge variant="success-light" size="sm" radius="full" className="gap-1">
                    <GiftIcon aria-hidden="true" />
                    {W.prizeReady}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {W.stamps(Math.min(row.balance, row.goal), row.goal)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
