import * as React from 'react';
import {
  AlertTriangleIcon,
  CheckIcon,
  GripVerticalIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  catalogWords,
  errorWords,
  FOOD_DEFAULT_TEMPLATES,
  RETAIL_DEFAULT_TEMPLATES,
  VARIANT_LIMITS,
  type OwnerItem,
  type OwnerVariantTemplate,
  type VariantTemplateOption,
} from '@smartapp/core';
import {
  useOwnerItems,
  useSaveVariantTemplate,
  useSaveItem,
  errorCodeOf,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Badge } from '@smartapp/ui/components/badge';
import { FieldError } from '@smartapp/ui/components/field';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Sortable, SortableItem, SortableItemHandle } from '@smartapp/ui/components/reui/sortable';
import { notify } from '@smartapp/ui/compositions/notify';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { useShop } from '@/app/shop';
import { SearchField } from '@/app/search-field';
import { PickRow } from './pick-list.js';
import { cn } from 'cn';

export interface VariantTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: OwnerVariantTemplate | null | undefined;
  onSaved?: ((template: OwnerVariantTemplate) => void) | undefined;
}

interface DraftOption {
  id: string;
  name: string;
}

let optSeq = 0;
function newDraftOption(name = ''): DraftOption {
  optSeq += 1;
  return { id: `opt_draft_${Date.now()}_${optSeq}`, name };
}

export function VariantTemplateSheet({
  open,
  onOpenChange,
  template,
  onSaved,
}: VariantTemplateSheetProps) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = React.useState(false);
  const isDirtyRef = React.useRef(false);

  function handleRequestClose() {
    if (isDirtyRef.current) {
      setConfirmDiscardOpen(true);
    } else {
      onOpenChange(false);
    }
  }

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleRequestClose();
          } else {
            onOpenChange(true);
          }
        }}
        title={template ? catalogWords.editVariant : catalogWords.addVariant}
        description={catalogWords.variantsSubtitle}
        scroll
      >
        {open ? (
          <VariantTemplateForm
            key={template ? template.id : 'new'}
            template={template}
            onSaved={onSaved}
            onClose={() => onOpenChange(false)}
            onDirtyChange={(dirty) => {
              isDirtyRef.current = dirty;
            }}
          />
        ) : null}
      </ResponsiveDialog>

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.unsavedChangesTitle}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.unsavedChangesDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{catalogWords.keepEditing}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscardOpen(false);
                isDirtyRef.current = false;
                onOpenChange(false);
              }}
            >
              {catalogWords.discard}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VariantTemplateForm({
  template,
  onSaved,
  onClose,
  onDirtyChange,
}: {
  template?: OwnerVariantTemplate | null | undefined;
  onSaved?: ((template: OwnerVariantTemplate) => void) | undefined;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { kind } = useShop();
  const [name, setName] = React.useState(template?.name ?? '');
  const [options, setOptions] = React.useState<DraftOption[]>(() => {
    if (template && template.options.length > 0) {
      return template.options.map((o) => ({ id: o.id, name: o.name }));
    }
    return [newDraftOption(), newDraftOption()];
  });
  const [newOptionInput, setNewOptionInput] = React.useState('');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // For existing templates with usedBy > 0, saving with changes prompts update-items dialog
  const [showApplyConfirm, setShowApplyConfirm] = React.useState(false);
  const saveVariant = useSaveVariantTemplate();
  const saveAction = useAsyncAction();

  // Linked items
  const { data: allItems = [] } = useOwnerItems();
  const activeItems = React.useMemo(
    () => allItems.filter((i) => i.status !== 'archived'),
    [allItems],
  );

  // Which items currently link this template
  const initialUsedOnIds = React.useMemo(() => {
    if (!template) return [];
    return activeItems
      .filter((item) => item.axes.some((axis) => axis.templateId === template.id))
      .map((item) => item.id);
  }, [activeItems, template]);

  const [usedOn, setUsedOn] = React.useState<string[]>(initialUsedOnIds);
  const [itemSearch, setItemSearch] = React.useState('');

  const saveItemMutation = useSaveItem();

  // Quick start suggestions for templates
  const defaultSpecs = kind === 'retail' ? RETAIL_DEFAULT_TEMPLATES : FOOD_DEFAULT_TEMPLATES;

  // Track dirtiness
  const isDirty = React.useMemo(() => {
    if (!template) {
      return name.trim().length > 0 || options.some((o) => o.name.trim().length > 0);
    }
    if (name !== template.name) return true;
    if (options.length !== template.options.length) return true;
    for (let i = 0; i < options.length; i++) {
      if (options[i]?.name !== template.options[i]?.name) return true;
    }
    // Also check if usedOn changed
    const usedOnSet = new Set(usedOn);
    const initialSet = new Set(initialUsedOnIds);
    if (usedOnSet.size !== initialSet.size) return true;
    for (const id of usedOnSet) {
      if (!initialSet.has(id)) return true;
    }
    return false;
  }, [template, name, options, usedOn, initialUsedOnIds]);

  React.useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  function handleAddOption(val?: string) {
    const trimmed = (val ?? newOptionInput).trim();
    if (!trimmed) return;
    if (options.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(catalogWords.duplicateOptionError);
      return;
    }
    if (options.length >= VARIANT_LIMITS.options) {
      setErrorMsg(catalogWords.maxOptionsReached);
      return;
    }
    setOptions((prev) => [...prev, newDraftOption(trimmed)]);
    setNewOptionInput('');
    setErrorMsg(null);
  }

  function handleRemoveOption(id: string) {
    if (options.length <= 1) {
      setErrorMsg('A variant needs at least one option.');
      return;
    }
    setOptions((prev) => prev.filter((o) => o.id !== id));
    setErrorMsg(null);
  }

  function handleOptionRename(id: string, newName: string) {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, name: newName } : o)));
    setErrorMsg(null);
  }

  function handleApplyPreset(spec: { name: string; options: readonly string[] }) {
    setName(spec.name);
    setOptions(spec.options.map((opt) => newDraftOption(opt)));
    setErrorMsg(null);
  }

  function validate(): boolean {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg(catalogWords.emptyChoiceNameError);
      return false;
    }
    if (options.length === 0) {
      setErrorMsg('A variant needs at least one option.');
      return false;
    }
    for (const opt of options) {
      if (!opt.name.trim()) {
        setErrorMsg(catalogWords.emptyOptionError);
        return false;
      }
    }
    const names = options.map((o) => o.name.trim().toLowerCase());
    const unique = new Set(names);
    if (unique.size !== names.length) {
      setErrorMsg(catalogWords.duplicateOptionError);
      return false;
    }
    setErrorMsg(null);
    return true;
  }

  async function performSave(applyToItems: boolean) {
    if (!validate()) return;
    try {
      await saveAction.run(async () => {
        const cleanOptions = options.map((o) => ({
          ...(template && template.options.some((to) => to.id === o.id) ? { id: o.id } : {}),
          name: o.name.trim(),
        }));

        const result = await saveVariant.mutateAsync({
          draft: {
            ...(template ? { id: template.id } : {}),
            name: name.trim(),
            options: cleanOptions,
          },
          applyToItems,
        });

        // Sync usedOn item changes (linking newly picked items or unlinking unpicked items)
        const newlyLinkedItemIds = usedOn.filter((id) => !initialUsedOnIds.includes(id));
        const unlinkedItemIds = initialUsedOnIds.filter((id) => !usedOn.includes(id));

        for (const itemId of newlyLinkedItemIds) {
          const item = activeItems.find((i) => i.id === itemId);
          if (item) {
            // Check if item already has 3 choices
            if (item.axes.length < VARIANT_LIMITS.axes) {
              const newAxis = {
                name: result.template.name,
                templateId: result.template.id,
                values: result.template.options.map((o) => ({
                  name: o.name,
                  photo: null,
                  priceDelta: 0,
                })),
              };
              await saveItemMutation.mutateAsync({
                id: item.id,
                draft: {
                  categoryId: item.categoryId,
                  name: item.name,
                  description: item.description,
                  photos: item.photos,
                  basePrice: item.basePrice,
                  axes: [...item.axes, newAxis],
                  variants: item.variants,
                  optionGroupIds: item.optionGroupIds,
                  pairingIds: item.pairingIds,
                  featured: item.featured,
                  isNew: item.isNew,
                  status: item.status,
                },
              });
            }
          }
        }

        for (const itemId of unlinkedItemIds) {
          const item = activeItems.find((i) => i.id === itemId);
          if (item) {
            const updatedAxes = item.axes.map((a) =>
              a.templateId === (template?.id ?? result.template.id)
                ? { ...a, templateId: null }
                : a,
            );
            await saveItemMutation.mutateAsync({
              id: item.id,
              draft: {
                categoryId: item.categoryId,
                name: item.name,
                description: item.description,
                photos: item.photos,
                basePrice: item.basePrice,
                axes: updatedAxes,
                variants: item.variants,
                optionGroupIds: item.optionGroupIds,
                pairingIds: item.pairingIds,
                featured: item.featured,
                isNew: item.isNew,
                status: item.status,
              },
            });
          }
        }

        // Show warnings if any
        if (result.soldOutItemIds.length > 0) {
          notify({
            title: catalogWords.itemsSoldOutNotice(result.soldOutItemIds.length),
            tone: 'warning',
          });
        }
        if (result.skippedItemIds.length > 0) {
          notify({
            title: catalogWords.itemsSkippedNotice(result.skippedItemIds.length),
            tone: 'warning',
          });
        }

        notify({ title: catalogWords.variantSaved, tone: 'success' });
        onDirtyChange(false);
        onSaved?.(result.template);
        onClose();
      });
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  }

  function handleSaveClick(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // If existing template has items linking it, prompt with update-items dialog
    if (template && (template.usedBy > 0 || initialUsedOnIds.length > 0)) {
      setShowApplyConfirm(true);
    } else {
      void performSave(false);
    }
  }

  // Filter items for search
  const filteredItems = React.useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return activeItems;
    return activeItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [activeItems, itemSearch]);

  const usedCount = usedOn.length;

  return (
    <form onSubmit={handleSaveClick} className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-6">
        {/* Quick start suggestions */}
        {!template && defaultSpecs.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {catalogWords.suggestionsLabel}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {defaultSpecs.map((spec) => (
                <button
                  key={spec.key}
                  type="button"
                  onClick={() => handleApplyPreset(spec)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/40 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <SparklesIcon className="size-3 text-primary" />
                  <span>{spec.name}</span>
                  <span className="text-muted-foreground">({spec.options.join(', ')})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Variant Name */}
        <div className="space-y-2">
          <Label htmlFor="variant-name" className="text-sm font-semibold">
            {catalogWords.variantNameLabel}
          </Label>
          <Input
            id="variant-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrorMsg(null);
            }}
            placeholder={catalogWords.variantNamePlaceholder}
            className="h-11 md:h-10"
            maxLength={40}
            required
          />
        </div>

        {/* Options list with Sortable */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{catalogWords.variantOptionsLabel}</Label>
            <span className="text-xs text-muted-foreground">
              {options.length}/{VARIANT_LIMITS.options}
            </span>
          </div>

          <Sortable
            value={options}
            getItemValue={(opt) => opt.id}
            onValueChange={setOptions}
          >
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <SortableItem key={opt.id} value={opt.id}>
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-1.5 transition-colors focus-within:border-primary/50 focus-within:bg-background">
                    <SortableItemHandle
                      className="flex size-9 cursor-grab items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground active:cursor-grabbing"
                      aria-label={catalogWords.reorder}
                    >
                      <GripVerticalIcon className="size-4" />
                    </SortableItemHandle>

                    <Input
                      value={opt.name}
                      onChange={(e) => handleOptionRename(opt.id, e.target.value)}
                      placeholder={catalogWords.addOptionPlaceholder}
                      className="h-9 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
                      maxLength={30}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(opt.id)}
                      disabled={options.length <= 1}
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove option ${opt.name || idx + 1}`}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                </SortableItem>
              ))}
            </div>
          </Sortable>

          {/* Quick add new option row */}
          {options.length < VARIANT_LIMITS.options && (
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder={catalogWords.addOptionPlaceholder}
                className="h-10 flex-1"
                maxLength={30}
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 gap-1"
                onClick={() => handleAddOption()}
                disabled={!newOptionInput.trim()}
              >
                <PlusIcon className="size-4" />
                {catalogWords.addOption}
              </Button>
            </div>
          )}
        </div>

        {/* Error message */}
        {errorMsg && <FieldError>{errorMsg}</FieldError>}

        {/* Used On Items Section */}
        {activeItems.length > 0 && (
          <div className="space-y-3 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                {catalogWords.usedByCount(usedCount)}
              </Label>
              {usedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {usedCount}
                </Badge>
              )}
            </div>

            {activeItems.length > 6 && (
              <SearchField
                value={itemSearch}
                onChange={setItemSearch}
                placeholder="Search items to link..."
                className="h-9 text-xs"
              />
            )}

            <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-border/50 p-2">
              {filteredItems.map((item) => {
                const isLinked = usedOn.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setUsedOn((prev) =>
                        isLinked ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                      );
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg p-2 text-left text-sm transition-colors hover:bg-muted/50',
                      isLinked && 'bg-primary/5 font-medium text-primary',
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border">
                      {isLinked && <CheckIcon className="size-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })}
              {filteredItems.length === 0 && (
                <p className="p-3 text-center text-xs text-muted-foreground">No items match</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <ResponsiveDialogFooter className="flex-row items-center justify-end gap-2 border-t border-border/60 bg-muted/20 p-4">
        <Button type="button" variant="outline" onClick={onClose} className="h-10">
          {catalogWords.cancel}
        </Button>
        <AsyncButton
          type="submit"
          loading={saveAction.isPending}
          className="h-10 min-w-24 font-semibold"
        >
          {catalogWords.save}
        </AsyncButton>
      </ResponsiveDialogFooter>

      {/* Confirm update linked items dialog */}
      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.updateItemsTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {catalogWords.updateItemsDesc(template?.usedBy ?? initialUsedOnIds.length)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>{catalogWords.cancel}</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowApplyConfirm(false);
                void performSave(false);
              }}
            >
              {catalogWords.onlyVariantBtn}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setShowApplyConfirm(false);
                void performSave(true);
              }}
            >
              {catalogWords.updateItemsBtn(template?.usedBy ?? initialUsedOnIds.length)}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
