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
    <div className="flex flex-col min-h-full pb-16">
      <PageHeader
        title={words.screens.catalog.title(kind)}
        tabs={useCatalogTabs()}
        actions={
          <Button
            type="button"
            variant="default"
            size="sm"
            className="h-9 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleOpenAdd}
          >
            <PlusIcon className="size-4 mr-1.5" />
            {words.screens.catalog.addAddOnGroup}
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-6 max-w-6xl mx-auto w-full space-y-4">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-warning-soft border border-warning/20 text-warning-text text-xs">
            <WifiOffIcon className="size-4 shrink-0" />
            <span>{words.screens.catalog.offlineNotice}</span>
          </div>
        )}

        {/* Loading Skeleton */}
        {groupsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-5 rounded-2xl border border-border/60 bg-card space-y-4"
              >
                <div className="space-y-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : groupsError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4">
            <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <ListPlusIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base">
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
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-sm mx-auto space-y-4 border border-dashed border-border rounded-2xl p-8 bg-card/50">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <ListPlusIcon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-base">
                {words.screens.catalog.emptyAddOns}
              </h3>
              <p className="text-xs text-muted-foreground">
                Create options like toppings, sugar levels, or extras for your items.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="size-3.5 mr-1" />
              {words.screens.catalog.addAddOnGroup}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-primary/40 hover:shadow-sm transition-all duration-180 cursor-pointer text-left"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">
                          {group.name}
                        </h3>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {ruleLabel}
                        </p>
                      </div>

                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {words.screens.catalog.optionCount(group.options.length)}
                      </Badge>
                    </div>

                    {/* Options Preview Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {group.options.slice(0, 5).map((opt) => (
                        <span
                          key={opt.name}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 border border-border/40 text-xs text-muted-foreground"
                        >
                          {opt.name}
                          {opt.soldOut && (
                            <span className="ml-1 text-xs text-warning-text font-bold uppercase">
                              (Out)
                            </span>
                          )}
                        </span>
                      ))}
                      {group.options.length > 5 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted/30 text-xs text-muted-foreground">
                          +{group.options.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-3">
                    {/* Used By Thumbnails */}
                    <div className="flex items-center gap-2 min-w-0">
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
                          <span className="text-xs text-muted-foreground font-mono truncate">
                            {words.screens.catalog.usedByCount(usedByCount)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">
                          {words.screens.catalog.usedByCount(0)}
                        </span>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1 shrink-0">
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

      <AddOnSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        group={selectedGroup}
      />

      <DevScenarioPanel />
    </div>
  );
}
