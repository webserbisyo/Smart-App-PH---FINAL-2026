import * as React from 'react';
import { ClockIcon, GiftIcon, SparklesIcon, StarIcon, UserIcon } from 'lucide-react';
import { formatPeso, membersWords, type CustomerRow } from '@smartapp/core';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { Badge } from '@smartapp/ui/components/reui/badge';
import {
  DataGrid,
  DataGridTable,
  dataGridFeatures,
  useTable,
  type ColumnDef,
  type DataGridFeatures,
} from '@smartapp/ui/components/reui/data-grid/index';
import { initials } from '@smartapp/ui/compositions/shop-image';
import { cn } from 'cn';
import { AnimatePresence, FadeUp } from '@/app/orders/order-motion';
import { StampDots } from './stamp-dots.js';
import { lastInLabel } from './when.js';

const W = membersWords;

/** The one status a row shows: prize to give first, then ready, almost, new, quiet (icon + word + colour). */
export function RowStatus({ row }: { row: CustomerRow }) {
  if (!row.isMember) {
    return (
      <Badge variant="secondary" radius="full" className="gap-1">
        <UserIcon aria-hidden="true" />
        {W.status.guest}
      </Badge>
    );
  }
  if (row.prizeToGive) {
    return (
      <Badge variant="warning-light" radius="full" className="gap-1">
        <GiftIcon aria-hidden="true" />
        {W.status.prize}
      </Badge>
    );
  }
  if (row.segments.includes('ready')) {
    return (
      <Badge variant="success-light" radius="full" className="gap-1">
        <GiftIcon aria-hidden="true" />
        {W.status.ready}
      </Badge>
    );
  }
  if (row.segments.includes('almost')) {
    return (
      <Badge variant="warning-light" radius="full" className="gap-1">
        <StarIcon aria-hidden="true" />
        {W.status.almost}
      </Badge>
    );
  }
  if (row.segments.includes('new')) {
    return (
      <Badge variant="info-light" radius="full" className="gap-1">
        <SparklesIcon aria-hidden="true" />
        {W.status.new}
      </Badge>
    );
  }
  if (row.segments.includes('quiet')) {
    return (
      <Badge variant="secondary" radius="full" className="gap-1">
        <ClockIcon aria-hidden="true" />
        {W.status.quiet}
      </Badge>
    );
  }
  return null;
}

export function MemberAvatar({ name, member }: { name: string; member: boolean }) {
  return (
    <Avatar className="size-9 shrink-0">
      <AvatarFallback
        className={member ? 'bg-member-soft text-member-soft-foreground' : 'bg-muted'}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

interface RowsProps {
  rows: readonly CustomerRow[];
  now: Date;
  onOpen: (row: CustomerRow) => void;
}

/** Phones: one card per person, name and status on top, the card and numbers under it. */
export function PhoneRows({ rows, now, onOpen }: RowsProps) {
  return (
    <div className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {rows.map((row, index) => (
          <FadeUp key={row.id} index={index}>
            <button
              type="button"
              onClick={() => onOpen(row)}
              aria-label={W.openMember(row.name)}
              className={cn(
                'flex w-full items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left shadow-xs transition-colors duration-base hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-muted/60',
                // A reward or prize waiting stands out so the counter sees it first (T61).
                (row.segments.includes('ready') || row.prizeToGive) &&
                  'border-member/50 bg-member-soft/40',
              )}
            >
              <MemberAvatar name={row.name} member={row.isMember} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{row.name}</span>
                  <RowStatus row={row} />
                </span>
                {row.isMember ? (
                  <span className="flex items-center gap-2">
                    <StampDots balance={row.balance} goal={row.goal} />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {W.stamps(row.balance, row.goal)}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums">{row.phone}</span>
                )}
                <span className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                  <span>
                    {row.visits} {W.panel.visits(row.visits)}
                  </span>
                  <span className="font-semibold text-foreground">{formatPeso(row.spent)}</span>
                  <span className="ml-auto">{lastInLabel(row.lastOrderAt, now)}</span>
                </span>
              </span>
            </button>
          </FadeUp>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Tablet and laptop: the ReUI Data Grid with the avatar cell (c-data-grid-2); a row opens the panel. */
export function MembersGrid({ rows, now, onOpen }: RowsProps) {
  const columns = React.useMemo<ColumnDef<DataGridFeatures, CustomerRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: W.cols.member,
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-3">
            <MemberAvatar name={row.original.name} member={row.original.isMember} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{row.original.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {row.original.phone}
              </span>
            </span>
          </span>
        ),
        size: 260,
      },
      {
        id: 'card',
        header: W.cols.card,
        cell: ({ row }) =>
          row.original.isMember ? (
            <StampDots balance={row.original.balance} goal={row.original.goal} />
          ) : null,
        size: 150,
      },
      {
        accessorKey: 'visits',
        header: () => <span className="block w-full text-right">{W.cols.visits}</span>,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{row.original.visits}</span>
        ),
        size: 80,
      },
      {
        accessorKey: 'spent',
        header: () => <span className="block w-full text-right">{W.cols.spent}</span>,
        cell: ({ row }) => (
          <span className="block text-right font-semibold tabular-nums">
            {formatPeso(row.original.spent)}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'lastOrderAt',
        header: W.cols.lastIn,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {lastInLabel(row.original.lastOrderAt, now)}
          </span>
        ),
        size: 120,
      },
      {
        id: 'status',
        header: W.cols.status,
        cell: ({ row }) => <RowStatus row={row.original} />,
        size: 150,
      },
    ],
    [now],
  );

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    getRowId: (row) => row.id,
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div className="w-full overflow-x-auto">
        <DataGrid
          table={table}
          recordCount={rows.length}
          tableLayout={{ dense: false }}
          tableClassNames={{
            headerSticky:
              'sticky top-0 z-20 bg-muted/90 font-medium text-foreground backdrop-blur-xs',
            bodyRow:
              'h-14 cursor-pointer transition-colors duration-base hover:bg-muted/40 active:bg-muted/60',
          }}
          onRowClick={(row) => onOpen(row)}
        >
          <DataGridTable />
        </DataGrid>
      </div>
    </div>
  );
}
