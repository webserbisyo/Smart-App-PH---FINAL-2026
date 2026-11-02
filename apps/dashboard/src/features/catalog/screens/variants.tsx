import * as React from 'react';
import {
  CopyIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  WifiOffIcon,
} from 'lucide-react';
import {
  catalogWords,
  errorWords,
  type OwnerVariantTemplate,
} from '@smartapp/core';
import {
  useOwnerVariantTemplates,
  useRemoveVariantTemplate,
  useSaveVariantTemplate,
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
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { PageEmpty, PageError } from '@/app/page-state';
import { cn } from 'cn';
import { useCatalogTabs } from '../tabs.js';
import { VariantTemplateSheet } from '../variant-template-sheet.js';

export function CatalogVariantsScreen() {
  const { kind } = useShop();
  const isOnline = useOnlineStatus();

  const {
    data: variantTemplates = [],
    isLoading: templatesLoading,
    error: templatesError,
    refetch: refetchTemplates,
  } = useOwnerVariantTemplates();

  const saveTemplate = useSaveVariantTemplate();
  const removeTemplate = useRemoveVariantTemplate();
  const deleteAction = useAsyncAction();
  const [deleteTarget, setDeleteTarget] = React.useState<OwnerVariantTemplate | null>(null);

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<OwnerVariantTemplate | null>(null);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`template-${highlightId}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  function handleOpenAdd() {
    setSelectedTemplate(null);
    setSheetOpen(true);
  }

  function handleOpenEdit(template: OwnerVariantTemplate) {
    setSelectedTemplate(template);
    setSheetOpen(true);
  }

  async function handleDuplicate(template: OwnerVariantTemplate) {
    try {
      const copyName = `${template.name} (copy)`.slice(0, 40);
      const res = await saveTemplate.mutateAsync({
        draft: {
          name: copyName,
          options: template.options.map((opt) => ({ name: opt.name })),
        },
        applyToItems: false,
      });
      setHighlightId(res.template.id);
      notify({
        title: catalogWords.variantDuplicated(copyName),
        tone: 'success',
        action: { label: catalogWords.edit, onClick: () => handleOpenEdit(res.template) },
      });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteAction.run(() => removeTemplate.mutateAsync({ id: deleteTarget.id }));
      notify({ title: catalogWords.variantDeleted, tone: 'success' });
      setDeleteTarget(null);
    } catch (err: unknown) {
      setDeleteTarget(null);
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title={catalogWords.title(kind)} tabs={useCatalogTabs()} />

      <div className="mx-auto w-full max-w-6xl flex-1 space-y-4 p-4 pb-40 md:p-6 md:pb-16">
        {variantTemplates.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 basis-60 text-sm text-muted-foreground">
              {catalogWords.variantsSubtitle}
            </p>
            <Button
              type="button"
              className="hidden h-9 gap-1.5 font-semibold md:inline-flex"
              onClick={handleOpenAdd}
            >
              <PlusIcon className="size-4" />
              {catalogWords.addVariant}
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
        {templatesLoading ? (
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
        ) : templatesError ? (
          <PageError
            title="Failed to load variants"
            message={errorWords(errorCodeOf(templatesError))}
            retryLabel={catalogWords.tryAgain}
            onRetry={() => void refetchTemplates()}
          />
        ) : variantTemplates.length === 0 ? (
          <PageEmpty
            variant="box"
            icon={<LayersIcon />}
            title={catalogWords.emptyVariants}
            description={catalogWords.variantsSubtitle}
            action={
              <Button className="h-11 gap-1.5 font-semibold md:h-9" onClick={handleOpenAdd}>
                <PlusIcon className="size-4" />
                {catalogWords.addVariant}
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {variantTemplates.map((template) => {
              const usedByCount = template.usedBy;

              return (
                <div
                  key={template.id}
                  id={`template-${template.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleOpenEdit(template)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenEdit(template);
                    }
                  }}
                  className={cn(
                    'group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 text-left shadow-xs transition-all duration-180 hover:border-primary/40 hover:shadow-sm md:p-5',
                    highlightId === template.id && 'border-primary ring-2 ring-primary/30',
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                          {template.name}
                        </h3>
                      </div>

                      <Badge variant="outline" className="shrink-0 tabular">
                        {catalogWords.optionCount(template.options.length)}
                      </Badge>
                    </div>

                    {/* Options Preview Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {template.options.slice(0, 5).map((opt) => (
                        <span
                          key={opt.id}
                          className="inline-flex items-center rounded-md border border-border/40 bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {opt.name}
                        </span>
                      ))}
                      {template.options.length > 5 && (
                        <span className="inline-flex items-center rounded-md bg-muted/30 px-1.5 py-0.5 text-xs text-muted-foreground">
                          +{template.options.length - 5} more
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
                              aria-label={`Actions for ${template.name}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                          }
                        >
                          <MoreHorizontalIcon className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleOpenEdit(template)}>
                            <PencilIcon className="size-4" />
                            {catalogWords.edit}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void handleDuplicate(template)}>
                            <CopyIcon className="size-4" />
                            {catalogWords.duplicate}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(template)}
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

      <FloatingAddButton label={catalogWords.addVariant} onClick={handleOpenAdd} />

      <VariantTemplateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        template={selectedTemplate}
        onSaved={(saved) => {
          setHighlightId(saved.id);
        }}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.deleteVariantTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                catalogWords.deleteVariantDesc(deleteTarget.name, deleteTarget.usedBy)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              loading={deleteAction.isPending}
              onClick={handleDelete}
            >
              {catalogWords.deleteVariantConfirm ?? catalogWords.delete}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
