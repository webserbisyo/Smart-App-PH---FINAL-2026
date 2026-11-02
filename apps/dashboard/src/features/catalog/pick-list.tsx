import type * as React from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@smartapp/ui/components/item';

/**
 * A picked item with a remove button (Goes well with, Used on), from the installed shadcn Item and
 * Button (decision T43).
 */
export function PickedChip({
  media,
  name,
  removeLabel,
  onRemove,
}: {
  media: React.ReactNode;
  name: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <Item
      render={<li />}
      variant="outline"
      size="xs"
      className="w-auto gap-1.5 rounded-xl border-primary/30 bg-primary/5 py-0.5 pr-0.5 pl-1.5"
    >
      <ItemMedia>{media}</ItemMedia>
      <ItemContent>
        <ItemTitle className="max-w-36 truncate">{name}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={removeLabel}
          className="size-11 text-muted-foreground hover:text-destructive md:size-8"
          onClick={onRemove}
        >
          <XIcon className="size-4" />
        </Button>
      </ItemActions>
    </Item>
  );
}

/** One search match to add, as an installed Item rendered as a button. */
export function PickRow({
  media,
  title,
  description,
  onPick,
}: {
  media: React.ReactNode;
  title: string;
  description?: string | undefined;
  onPick: () => void;
}) {
  return (
    <Item
      render={<button type="button" onClick={onPick} />}
      variant="outline"
      size="xs"
      className="min-h-11 w-full rounded-xl border-border/50 bg-card p-1.5 text-left hover:border-primary/40 hover:bg-muted/40"
    >
      <ItemMedia>{media}</ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full truncate">{title}</ItemTitle>
        {description ? <ItemDescription className="tabular">{description}</ItemDescription> : null}
      </ItemContent>
      <ItemActions>
        <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
      </ItemActions>
    </Item>
  );
}
