import * as React from 'react';
import {
  BanIcon,
  ListPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from 'lucide-react';
import { catalogWords, groupRuleLabel, errorWords, type OwnerOptionGroup } from '@smartapp/core';
import { useOwnerOptionGroups, useSaveOptionGroup, errorCodeOf } from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { notify } from '@smartapp/ui/compositions/notify';
import { cn } from 'cn';
import { useCatalogTabs } from '../tabs.js';
import { AddOnSheet } from '../add-on-sheet.js';
import { DevScenarioPanel } from '../dev-scenario-panel.js';

export function CatalogAddOnsScreen() {
  const { kind } = useShop();
  const isOnline = useOnlineStatus();

  const {
    data: optionGroups = [],
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useOwnerOptionGroups();

  const saveGroup = useSaveOptionGroup();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<OwnerOptionGroup | null>(null);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`group-${highlightId}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  function handleOpenAdd() {
    setSelectedGroup(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(group: OwnerOptionGroup) {
    setSelectedGroup(group);
    setSheetOpen(true);
  }

  async function handleDuplicate(group: OwnerOptionGroup) {
    try {
      const copy = await saveGroup.mutateAsync({
        name: catalogWords.groupCopyName(group.name).slice(0, 40),
        min: group.min,
        max: group.max,
        options: group.options.map((opt) => ({
          name: opt.name,
          priceDelta: opt.priceDelta,
          isDefault: opt.isDefault,
          soldOut: opt.soldOut,
        })),
      });
      setHighlightId(copy.id);
      notify({
        title: catalogWords.groupCopied(group.name),
        tone: 'success',
        action: { label: catalogWords.edit, onClick: () => handleOpenEdit(copy) },
      });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  }

  return (
    <div className="flex min-h-full flex-col pb-16">
      <PageHeader
        title={catalogWords.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-11 rounded-xl font-semibold md:h-9"
            onClick={handleOpenAdd}
          >
            <PlusIcon className="mr-1.5 size-4" />
            {catalogWords.addAddOnGroup}
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 rounded-xl border border-warning/20 bg-warning-soft p-3 text-xs text-warning-text">
            <WifiOffIcon className="size-4 shrink-0" />
            <span>{catalogWords.offlineNotice}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {groupsLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : groupsError ? (
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ListPlusIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">{catalogWords.loadFailed}</h3>
              <p className="text-xs text-muted-foreground">
                {errorWords(errorCodeOf(groupsError))}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => void refetchGroups()}
            >
              <RefreshCwIcon className="size-3.5" />
              {catalogWords.tryAgain}
            </Button>
          </div>
        ) : optionGroups.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListPlusIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {catalogWords.emptyAddOns}
              </h3>
              <p className="text-xs text-muted-foreground">{catalogWords.addOnsHint}</p>
            </div>
            <Button
              size="sm"
              className="bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="mr-1 size-3.5" />
              {catalogWords.addAddOnGroup}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {optionGroups.map((group) => {
              const ruleLabel = groupRuleLabel(group.min, group.max);
              const usedByCount = group.usedBy;

              return (
                <div
                  key={group.id}
                  id={`group-${group.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenEdit(group)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEdit(group);
                    }
                  }}
                  className={cn(
                    'group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-all duration-180 hover:border-primary/40 hover:shadow-sm md:p-5',
                    highlightId === group.id && 'border-primary ring-2 ring-primary/30',
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {group.name}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                          {ruleLabel}
                        </p>
                      </div>

                      <Badge variant="outline" className="shrink-0 tabular">
                        {catalogWords.optionCount(group.options.length)}
                      </Badge>
                    </div>

                    {/* Options Preview Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {group.options.slice(0, 5).map((opt) => (
                        <span
                          key={opt.name}
                          className="inline-flex items-center rounded-md border border-border/40 bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {opt.name}
                          {opt.soldOut ? (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-warning-text">
                              <BanIcon className="size-3" />
                              {catalogWords.optionSoldOut}
                            </span>
                          ) : null}
                        </span>
                      ))}
                      {group.options.length > 5 && (
                        <span className="inline-flex items-center rounded-md bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">
                          {catalogWords.moreOptions(group.options.length - 5)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/50 pt-2">
                    <span className="truncate text-sm text-muted-foreground">
                      {usedByCount > 0
                        ? catalogWords.usedByCount(usedByCount)
                        : catalogWords.notUsedYet}
                    </span>

                    <span className="contents" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-11 shrink-0 text-muted-foreground hover:text-foreground md:size-9"
                              aria-label={catalogWords.groupActionsAria(group.name)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <MoreHorizontalIcon className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleOpenEdit(group)}>
                            <PencilIcon className="size-4" />
                            {catalogWords.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleDuplicate(group)}>
                            <CopyIcon className="size-4" />
                            {catalogWords.duplicate}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddOnSheet open={sheetOpen} onOpenChange={setSheetOpen} group={selectedGroup} />

      <DevScenarioPanel />
    </div>
  );
}
