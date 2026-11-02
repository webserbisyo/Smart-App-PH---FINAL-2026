import * as React from 'react';
import {
  BanIcon,
  ListPlusIcon,
  MoreHorizontalIcon,
  PlusIcon,
  CopyIcon,
  PencilIcon,
  Trash2Icon,
  WifiOffIcon,
} from 'lucide-react';
import {
  actionWords,
  catalogWords,
  groupRuleLabel,
  errorWords,
  type OwnerOptionGroup,
} from '@smartapp/core';
import {
  useOwnerOptionGroups,
  useRemoveOptionGroup,
  useSaveOptionGroup,
  errorCodeOf,
} from '@smartapp/data';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { FloatingAddButton } from '../floating-add-button.js';
import { notify } from '@smartapp/ui/compositions/notify';
import { AsyncButton, useAsyncAction } from '@/app/async-button';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';

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
  const removeGroup = useRemoveOptionGroup();
  const deleteAction = useAsyncAction();
  const [deleteTarget, setDeleteTarget] = React.useState<OwnerOptionGroup | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAction.run(() => removeGroup.mutateAsync({ id: deleteTarget.id }));
      notify({ title: catalogWords.groupDeleted(deleteTarget.name), tone: 'success' });
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  }

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
    <div className="flex min-h-full flex-col">
      <PageHeader title={catalogWords.title(kind)} tabs={useCatalogTabs()} />

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 pb-40 md:p-6 md:pb-16">
        {optionGroups.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 basis-60 text-sm text-muted-foreground">
              {catalogWords.addOnsHint}
            </p>
            <Button
              type="button"
              className="hidden h-9 gap-1.5 font-semibold md:inline-flex"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="size-4" />
              {catalogWords.addAddOnGroup}
            </Button>
          </div>
        ) : null}

        {/* Offline Banner */}
        {!isOnline && (
          <Notice tone="warning" icon={<WifiOffIcon />}>
            {catalogWords.offlineNotice}
          </Notice>
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
          <PageError
            title={catalogWords.loadFailed}
            message={errorWords(errorCodeOf(groupsError))}
            retryLabel={catalogWords.tryAgain}
            onRetry={() => void refetchGroups()}
          />
        ) : optionGroups.length === 0 ? (
          <PageEmpty
            variant="box"
            icon={<ListPlusIcon />}
            title={catalogWords.emptyAddOns}
            description={catalogWords.addOnsHint}
            action={
              <Button className="h-11 gap-1.5 font-semibold md:h-9" onClick={handleOpenAdd}>
                <PlusIcon className="size-4" />
                {catalogWords.addAddOnGroup}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {optionGroups.map((group) => {
              const ruleLabel = groupRuleLabel(group.min, group.max, group.options.length);
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(group)}
                          >
                            <Trash2Icon className="size-4" />
                            {catalogWords.delete}
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

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {catalogWords.deleteGroupTitle(deleteTarget?.name ?? '')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && deleteTarget.usedBy > 0
                ? catalogWords.deleteGroupUsed(deleteTarget.usedBy)
                : catalogWords.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              status={deleteAction.status}
              busyLabel={actionWords.deleting}
              doneLabel={actionWords.deleted}
              onClick={() => void handleDelete()}
              className="h-11 font-semibold md:h-9"
            >
              {catalogWords.delete}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {optionGroups.length > 0 ? (
        <FloatingAddButton label={catalogWords.addAddOnGroup} onClick={handleOpenAdd} />
      ) : null}

      <DevScenarioPanel />
    </div>
  );
}
