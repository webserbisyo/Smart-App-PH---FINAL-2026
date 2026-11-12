import * as React from 'react';
import {
  BellIcon,
  BellOffIcon,
  CalendarDaysIcon,
  ClockIcon,
  KanbanSquareIcon,
  ListIcon,
  MoreHorizontalIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { ordersWords } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { SearchField } from '@/app/search-field';
import { BookingRulesSheet } from './booking-rules-sheet.js';
import { BusyMenu } from './busy-menu.js';
import { DevScenarioMenu } from './dev-scenario-menu.js';
import type { OrderView } from './search.js';

const SEARCH_DEBOUNCE_MS = 250;

export interface OrdersToolbarProps {
  slug: string;
  view: OrderView;
  // The views this shop has (Bookings only when it takes orders ahead).
  views: readonly OrderView[];
  onViewChange: (view: OrderView) => void;
  query: string;
  onQueryChange: (q: string) => void;
  soundOn: boolean;
  onSoundChange: (on: boolean) => void;
}

const VIEW_ICON = { board: KanbanSquareIcon, list: ListIcon, bookings: CalendarDaysIcon } as const;

/**
 * The one toolbar row (D2): Board, List and Bookings, search, sound, Busy and "⋯". On phones the search folds into an
 * icon and opens over the row, so the first order stays near the top.
 */
export function OrdersToolbar({
  slug,
  view,
  views,
  onViewChange,
  query,
  onQueryChange,
  soundOn,
  onSoundChange,
}: OrdersToolbarProps) {
  const [text, setText] = React.useState(query);
  const [searchOpen, setSearchOpen] = React.useState(query !== '');
  const [timesOpen, setTimesOpen] = React.useState(false);

  // The address can change the query too (Clear filters, Back).
  const [lastQuery, setLastQuery] = React.useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setText(query);
  }

  React.useEffect(() => {
    if (text === query) return;
    const timer = window.setTimeout(() => onQueryChange(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [text, query, onQueryChange]);

  const search = (
    <SearchField
      value={text}
      onChange={setText}
      placeholder={ordersWords.toolbar.searchPlaceholder}
      clearLabel={ordersWords.toolbar.clearSearch}
      ariaLabel={ordersWords.toolbar.searchLabel}
      className="w-full"
    />
  );

  const SoundIcon = soundOn ? BellIcon : BellOffIcon;

  return (
    <div className="relative flex items-center gap-2" data-slot="orders-toolbar">
      <ToggleGroup
        value={[view]}
        onValueChange={(value) => {
          const next = views.find((v) => v === value[0]);
          if (next) onViewChange(next);
        }}
        aria-label={ordersWords.views.label}
        spacing={1}
        className="shrink-0 rounded-xl border border-border/60 bg-muted/60 p-1"
      >
        {views.map((v) => {
          const Icon = VIEW_ICON[v];
          return (
            <ToggleGroupItem
              key={v}
              value={v}
              aria-label={ordersWords.views[v]}
              className="h-9 gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-7"
            >
              <Icon aria-hidden="true" />
              <span className="hidden md:inline">{ordersWords.views[v]}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>

      {/* Laptop: the search is always there. */}
      <div className="hidden w-full max-w-sm md:block">{search}</div>

      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={ordersWords.toolbar.openSearch}
          onClick={() => setSearchOpen(true)}
          className={cn('size-11 md:hidden', query !== '' && 'text-primary')}
        >
          <SearchIcon />
        </Button>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-pressed={soundOn}
                aria-label={soundOn ? ordersWords.toolbar.soundOn : ordersWords.toolbar.soundOff}
                onClick={() => {
                  onSoundChange(!soundOn);
                  notify({
                    title: soundOn
                      ? ordersWords.toolbar.soundTurnedOff
                      : ordersWords.toolbar.soundTurnedOn,
                    tone: 'info',
                  });
                }}
                className={cn('relative size-11 md:size-9', !soundOn && 'text-muted-foreground')}
              >
                <SoundIcon />
                {!soundOn ? (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-warning md:top-1.5 md:right-1.5" />
                ) : null}
              </Button>
            }
          />
          <TooltipContent>
            {soundOn ? ordersWords.toolbar.soundOn : ordersWords.toolbar.soundOff}
          </TooltipContent>
        </Tooltip>

        <BusyMenu slug={slug} />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={ordersWords.toolbar.more}
                className="size-11 md:size-9"
              >
                <MoreHorizontalIcon />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => setTimesOpen(true)}>
              <ClockIcon />
              {ordersWords.toolbar.orderTimes}
            </DropdownMenuItem>
            <DevScenarioMenu />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Phone: the search opens over the row. */}
      {searchOpen ? (
        <div className="absolute inset-0 z-10 flex items-center gap-1.5 bg-background md:hidden">
          {search}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={ordersWords.toolbar.closeSearch}
            onClick={() => {
              setSearchOpen(false);
              setText('');
              onQueryChange('');
            }}
            className="size-11 shrink-0"
          >
            <XIcon />
          </Button>
        </div>
      ) : null}

      <BookingRulesSheet open={timesOpen} onOpenChange={setTimesOpen} slug={slug} />
    </div>
  );
}
