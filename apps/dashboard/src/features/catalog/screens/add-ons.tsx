import * as React from 'react';
import {
  ListPlusIcon,
  PlusIcon,
  CopyIcon,
  EditIcon,
  RefreshCwIcon,
  WifiOffIcon,
} from 'lucide-react';
import {
  words,
  groupRuleLabel,
  errorWords,
  type OwnerOptionGroup,
  type OwnerItem,
} from '@smartapp/core';
import {
  useOwnerOptionGroups,
  useOwnerItems,
  useSaveOptionGroup,
  errorCodeOf,
} from '@smartapp/data';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { PageHeader } from '@smartapp/ui/compositions/page-header';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Avatar, AvatarFallback } from '@smartapp/ui/components/avatar';
import { AvatarGroup } from '@smartapp/ui/components/avatar-group';
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

  const { data: items = [] } = useOwnerItems();
  const saveGroup = useSaveOptionGroup();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<OwnerOptionGroup | null>(null);

  // Map each option group to the items using it
  const itemsUsingGroup = React.useMemo(() => {
    const map = new Map<string, OwnerItem[]>();
    for (const item of items) {
      if (item.status === 'archived') continue;
      for (const gid of item.optionGroupIds) {
        const list = map.get(gid) ?? [];
        list.push(item);
        map.set(gid, list);
      }
    }
    return map;
  }, [items]);

  function handleOpenAdd() {
    setSelectedGroup(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(group: OwnerOptionGroup) {
    setSelectedGroup(group);
    setSheetOpen(true);
  }

  function handleDuplicate(e: React.MouseEvent, group: OwnerOptionGroup) {
    e.stopPropagation();
    saveGroup.mutate({
      name: `${group.name} (Copy)`,
      min: group.min,
      max: group.max,
      options: group.options.map((opt) => ({
        name: opt.name,
        priceDelta: opt.priceDelta,
        isDefault: opt.isDefault,
        soldOut: opt.soldOut,
      })),
    });
  }

  return (
    <div className="flex min-h-full flex-col pb-16">
      <PageHeader
        title={words.screens.catalog.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 rounded-xl bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            onClick={handleOpenAdd}
          >
            <PlusIcon className="mr-1.5 size-4" />
            {words.screens.catalog.addAddOnGroup}
          </Button>
        }
      />

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 md:p-6">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 rounded-xl border border-warning/20 bg-warning-soft p-3 text-xs text-warning-text">
            <WifiOffIcon className="size-4 shrink-0" />
            <span>{words.screens.catalog.offlineNotice}</span>
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
              <h3 className="text-base font-semibold text-foreground">
                Failed to load add-on groups
              </h3>
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
              {words.screens.catalog.tryAgain}
            </Button>
          </div>
        ) : optionGroups.length === 0 ? (
          <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-4 rounded-2xl border border-dashed border-border bg-card/50 p-8 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListPlusIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground">
                {words.screens.catalog.emptyAddOns}
              </h3>
              <p className="text-xs text-muted-foreground">
                Create options like toppings, sugar levels, or extras for your items.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-primary text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="mr-1 size-3.5" />
              {words.screens.catalog.addAddOnGroup}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {optionGroups.map((group) => {
              const ruleLabel = groupRuleLabel(group.min, group.max);
              const usingItems = itemsUsingGroup.get(group.id) ?? [];
              const usedByCount = group.usedBy ?? usingItems.length;

              return (
                <div
                  key={group.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenEdit(group)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEdit(group);
                    }
                  }}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 text-left shadow-xs transition-all duration-180 hover:border-primary/40 hover:shadow-sm"
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

                      <Badge variant="outline" className="shrink-0 font-mono text-xs">
                        {words.screens.catalog.optionCount(group.options.length)}
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
                          {opt.soldOut && (
                            <span className="ml-1 text-xs font-bold text-warning-text uppercase">
                              (Out)
                            </span>
                          )}
                        </span>
                      ))}
                      {group.options.length > 5 && (
                        <span className="inline-flex items-center rounded-md bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">
                          +{group.options.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/50 pt-4">
                    {/* Used By Thumbnails */}
                    <div className="flex min-w-0 items-center gap-2">
                      {usingItems.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <AvatarGroup size={24} max={3}>
                            {usingItems.map((item) => (
                              <Avatar key={item.id} className="size-6 border border-background">
                                <AvatarFallback className="text-xs font-bold">
                                  {item.name.slice(0, 1)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {words.screens.catalog.usedByCount(usedByCount)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">
                          {words.screens.catalog.usedByCount(0)}
                        </span>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        title={words.screens.catalog.duplicate}
                        aria-label={`Duplicate ${group.name}`}
                        onClick={(e) => handleDuplicate(e, group)}
                      >
                        <CopyIcon className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        title={words.screens.catalog.edit}
                        aria-label={`Edit ${group.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(group);
                        }}
                      >
                        <EditIcon className="size-3.5" />
                      </Button>
                    </div>
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
