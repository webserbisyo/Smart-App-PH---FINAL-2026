import { Fragment, type ReactNode } from 'react';
import { cn } from 'cn';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@smartapp/ui/components/item';

export interface InfoRow {
  id: string;
  icon?: ReactNode;
  label: string;
  // Under the label (an address, a handle).
  description?: string | null | undefined;
  // Right side (hours, a price, a status).
  value?: ReactNode;
  // A tappable row: phone, Messenger, map.
  href?: string | undefined;
  external?: boolean | undefined;
  // Today's row in the hours list.
  highlight?: boolean | undefined;
}

/** Label and value rows in one bordered group (composition C8): hours, contact, order details. */
export function InfoList({
  rows,
  className,
}: {
  rows: readonly InfoRow[];
  className?: string | undefined;
}) {
  if (rows.length === 0) return null;
  return (
    <ItemGroup className={cn('gap-0 overflow-hidden rounded-xl border bg-card', className)}>
      {rows.map((row, index) => (
        <Fragment key={row.id}>
          {index > 0 ? <ItemSeparator className="my-0" /> : null}
          <Item
            size="sm"
            data-highlight={row.highlight ? '' : undefined}
            className="min-h-11 rounded-none data-highlight:bg-shop-10-soft data-highlight:font-semibold data-highlight:text-shop-10-soft-foreground"
            render={
              row.href ? (
                <a
                  href={row.href}
                  target={row.external ? '_blank' : undefined}
                  rel={row.external ? 'noopener noreferrer' : undefined}
                />
              ) : undefined
            }
          >
            {row.icon ? <ItemMedia variant="icon">{row.icon}</ItemMedia> : null}
            <ItemContent className="min-w-0">
              <ItemTitle>{row.label}</ItemTitle>
              {row.description ? (
                <ItemDescription className="truncate">{row.description}</ItemDescription>
              ) : null}
            </ItemContent>
            {row.value ? (
              <ItemActions className="text-right text-sm tabular">{row.value}</ItemActions>
            ) : null}
          </Item>
        </Fragment>
      ))}
    </ItemGroup>
  );
}
