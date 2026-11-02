import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronRightIcon, CircleAlertIcon, GripVerticalIcon, XIcon } from 'lucide-react';
import {
  actionWords,
  catalogWords,
  errorWords,
  templateChanges,
  VARIANT_DEFAULTS,
  VARIANT_LIMITS,
  type OwnerVariantTemplate,
  type SaveVariantTemplateResult,
  type VariantTemplateDraft,
} from '@smartapp/core';
import {
  errorCodeOf,
  useOwnerItems,
  useOwnerVariantTemplates,
  useRemoveVariantTemplate,
  useSaveVariantTemplate,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { FieldError } from '@smartapp/ui/components/field';
import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle } from '@smartapp/ui/components/item';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
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
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { notify } from '@smartapp/ui/compositions/notify';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { CatalogPhoto } from './catalog-photo.js';

// What a save did, so the item editor can make the same change to its unsaved form.
export interface VariantSaved {
  result: SaveVariantTemplateResult;
  before: OwnerVariantTemplate | null;
  draft: VariantTemplateDraft;
  applyToItems: boolean;
}

export interface VariantTemplateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null opens a new variant.
  template: OwnerVariantTemplate | null;
  // Fills a new variant, e.g. "Save as variant" from an item.
  initial?: { name: string; options: readonly string[] } | undefined;
  onSaved?: ((saved: VariantSaved) => void) | undefined;
  onDeleted?: ((template: OwnerVariantTemplate) => void) | undefined;
}

interface DraftOption {
  key: string;
  // The saved option's id; a new option has none.
  id: string | null;
  name: string;
}

let optionSeq = 0;
function draftOption(name: string, id: string | null = null): DraftOption {
  optionSeq += 1;
  return { key: id ?? `new-${optionSeq}`, id, name };
}

const USED_ON_SHOWN = 5;

// Variant form (decision T46): a dialog on desktop, a bottom drawer on phone, built like the add-on sheet.
export function VariantTemplateSheet({
  open,
  onOpenChange,
  template,
  initial,
  onSaved,
  onDeleted,
}: VariantTemplateSheetProps) {
  const dirty = React.useRef(false);
  const [leaveOpen, setLeaveOpen] = React.useState(false);

  const close = () => {
    dirty.current = false;
    onOpenChange(false);
  };

  return (
    <>
      <ResponsiveDialog
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true);
          else if (dirty.current) setLeaveOpen(true);
          else close();
        }}
        title={template ? catalogWords.editVariantTitle : catalogWords.newVariantTitle}
        description={catalogWords.variantSheetDesc}
        scroll
      >
        {open ? (
          <VariantForm
            key={template?.id ?? 'new'}
            template={template}
            initial={initial}
            onDirty={(value) => {
              dirty.current = value;
            }}
            onSaved={(saved) => {
              onSaved?.(saved);
              close();
            }}
            onDeleted={(deleted) => {
              onDeleted?.(deleted);
              close();
            }}
            onCancel={() => (dirty.current ? setLeaveOpen(true) : close())}
          />
        ) : null}
      </ResponsiveDialog>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.leaveDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">
              {catalogWords.keepEditing}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="h-11 md:h-9"
              onClick={() => {
                setLeaveOpen(false);
                close();
              }}
            >
              {catalogWords.discardChanges}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VariantForm({
  template,
  initial,
  onDirty,
  onSaved,
  onDeleted,
  onCancel,
}: {
  template: OwnerVariantTemplate | null;
  initial: { name: string; options: readonly string[] } | undefined;
  onDirty: (dirty: boolean) => void;
  onSaved: (saved: VariantSaved) => void;
  onDeleted: (template: OwnerVariantTemplate) => void;
  onCancel: () => void;
}) {
  const { kind } = useShop();
  const isOnline = useOnlineStatus();
  const navigate = useNavigate();
  const { data: templates = [] } = useOwnerVariantTemplates();
  const { data: allItems = [] } = useOwnerItems();
  const saveTemplate = useSaveVariantTemplate();
  const removeTemplate = useRemoveVariantTemplate();
  const saveAction = useAsyncAction();
  const keepAction = useAsyncAction();
  const deleteAction = useAsyncAction();

  const startName = template?.name ?? initial?.name ?? '';
  const startOptions = template
    ? template.options.map((o) => draftOption(o.name, o.id))
    : (initial?.options ?? []).map((name) => draftOption(name));
  const [name, setName] = React.useState(startName);
  const [options, setOptions] = React.useState<DraftOption[]>(startOptions);
  const [newOption, setNewOption] = React.useState('');
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [optionError, setOptionError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const isDirty =
    name !== startName ||
    options.map((o) => `${o.id}:${o.name}`).join('|') !==
      startOptions.map((o) => `${o.id}:${o.name}`).join('|');
  React.useEffect(() => onDirty(isDirty), [isDirty, onDirty]);

  const usedOn = template
    ? allItems.filter(
        (item) => item.status !== 'archived' && item.axes.some((a) => a.templateId === template.id),
      )
    : [];

  // Quick start: the shop type's defaults that the shop no longer has.
  const suggestions = template
    ? []
    : VARIANT_DEFAULTS[kind].filter(
        (d) =>
          !templates.some(
            (t) => t.name === d.name && t.options.map((o) => o.name).join() === d.options.join(),
          ),
      );

  const optionProblem = (text: string, exceptKey?: string): string | null => {
    if (!text) return catalogWords.optionNameRequired;
    if (text.length > VARIANT_LIMITS.valueLength) return catalogWords.optionTooLong;
    if (
      options.some((o) => o.key !== exceptKey && o.name.trim().toLowerCase() === text.toLowerCase())
    )
      return catalogWords.optionExists;
    return null;
  };

  const addOptions = (raw: string) => {
    const names = raw
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    let next = options;
    for (const n of names) {
      if (next.length >= VARIANT_LIMITS.values) {
        setOptionError(catalogWords.variantMaxOptions);
        break;
      }
      if (next.some((o) => o.name.trim().toLowerCase() === n.toLowerCase())) {
        setOptionError(catalogWords.optionExists);
        continue;
      }
      if (n.length > VARIANT_LIMITS.valueLength) {
        setOptionError(catalogWords.optionTooLong);
        continue;
      }
      next = [...next, draftOption(n)];
    }
    setOptions(next);
    setNewOption('');
  };

  const draft = (): VariantTemplateDraft => ({
    ...(template ? { id: template.id } : {}),
    name: name.trim(),
    options: options.map((o) => ({ ...(o.id ? { id: o.id } : {}), name: o.name.trim() })),
  });

  const validate = (): boolean => {
    const trimmed = name.trim();
    const nameProblem = !trimmed
      ? catalogWords.variantNameRequired
      : trimmed.length > VARIANT_LIMITS.nameLength
        ? catalogWords.optionTooLong
        : null;
    const firstOptionProblem =
      options.length === 0
        ? catalogWords.variantKeepOne
        : (options.map((o) => optionProblem(o.name.trim(), o.key)).find(Boolean) ?? null);
    setNameError(nameProblem);
    setOptionError(firstOptionProblem);
    return !nameProblem && !firstOptionProblem;
  };

  const changes = template ? templateChanges(template, draft()) : null;
  const touchesItems =
    changes !== null &&
    (changes.renamedTo !== null ||
      changes.renamedOptions.length > 0 ||
      changes.removed.length > 0 ||
      changes.added.length > 0 ||
      changes.reordered);
  const unlinksOnKeep =
    changes !== null &&
    (changes.renamedTo !== null ||
      changes.renamedOptions.length > 0 ||
      changes.removed.length > 0 ||
      changes.reordered);

  const save = async (applyToItems: boolean, action: ReturnType<typeof useAsyncAction>) => {
    const next = draft();
    setSaveError(null);
    try {
      const result = await action.run(() =>
        saveTemplate.mutateAsync({ draft: next, applyToItems }),
      );
      const saved = result.template;
      const updated = result.updatedItemIds.length;
      notify({
        title:
          applyToItems && updated > 0
            ? catalogWords.variantSavedUpdated(saved.name, updated)
            : catalogWords.savedToast(saved.name),
        tone: 'success',
      });
      const firstSoldOut = result.soldOutItemIds[0];
      if (firstSoldOut && changes) {
        notify({
          title: catalogWords.variantSoldOutWarning(
            changes.added.join(', '),
            result.soldOutItemIds.length,
          ),
          tone: 'warning',
          persist: true,
          action: {
            label: catalogWords.openItem,
            onClick: () =>
              void navigate({ to: '/catalog/$itemId', params: { itemId: firstSoldOut } }),
          },
        });
      }
      if (result.skippedItemIds.length > 0) {
        notify({
          title: catalogWords.variantSkippedWarning(result.skippedItemIds.length),
          tone: 'warning',
          persist: true,
        });
      }
      setConfirmOpen(false);
      onSaved({ result, before: template, draft: next, applyToItems });
    } catch (err: unknown) {
      setConfirmOpen(false);
      setSaveError(errorWords(errorCodeOf(err)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!template && templates.length >= VARIANT_LIMITS.templates) {
      setSaveError(catalogWords.variantLimit);
      return;
    }
    if (template && template.usedBy > 0 && touchesItems) {
      setConfirmOpen(true);
      return;
    }
    void save(false, saveAction);
  };

  const handleDelete = async () => {
    if (!template) return;
    try {
      await deleteAction.run(() => removeTemplate.mutateAsync({ id: template.id }));
      notify({ title: catalogWords.variantDeleted(template.name), tone: 'success' });
      setDeleteOpen(false);
      onDeleted(template);
    } catch (err: unknown) {
      setDeleteOpen(false);
      setSaveError(errorWords(errorCodeOf(err)));
    }
  };

  const changeLines = changes
    ? [
        ...changes.added.map((n) => catalogWords.changeAdds(n)),
        ...changes.renamedOptions.map((r) => catalogWords.changeRenamesOption(r.from, r.to)),
        ...changes.removed.map((n) => catalogWords.changeRemoves(n)),
        ...(changes.renamedTo ? [catalogWords.changeRenames(changes.renamedTo)] : []),
        ...(changes.reordered ? [catalogWords.changeOrder] : []),
      ]
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {saveError ? (
        <Notice tone="error" icon={<CircleAlertIcon />}>
          {saveError}
        </Notice>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-2">
          <Label>{catalogWords.variantSuggestions}</Label>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <Button
                key={s.key}
                type="button"
                variant="outline"
                className="h-11 max-w-full gap-1.5 md:h-9"
                onClick={() => {
                  setName(s.name);
                  setOptions(s.options.map((o) => draftOption(o)));
                  setNameError(null);
                  setOptionError(null);
                }}
              >
                <span className="font-semibold">{s.name}</span>
                <span className="truncate text-muted-foreground">{s.options.join(', ')}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="variant-name">{catalogWords.variantNameLabel}</Label>
          <span className="text-xs text-muted-foreground tabular">
            {catalogWords.charCount(name.length, VARIANT_LIMITS.nameLength)}
          </span>
        </div>
        <Input
          id="variant-name"
          value={name}
          maxLength={VARIANT_LIMITS.nameLength}
          aria-invalid={nameError ? true : undefined}
          placeholder={catalogWords.variantNamePlaceholder(kind)}
          className="h-11 text-base md:h-9 md:text-sm"
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
        />
        {nameError ? <FieldError>{nameError}</FieldError> : null}
      </div>

      <div className="space-y-2">
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="variant-new-option">{catalogWords.variantOptionsLabel}</Label>
            <span className="text-xs text-muted-foreground tabular">
              {catalogWords.charCount(options.length, VARIANT_LIMITS.values)}
            </span>
          </div>
          {options.length > 1 ? (
            <p className="text-sm text-muted-foreground">{catalogWords.variantOptionsHelp}</p>
          ) : null}
        </div>

        <Sortable
          value={options}
          getItemValue={(o) => o.key}
          onValueChange={setOptions}
          strategy="vertical"
          className="flex flex-col gap-2"
        >
          {options.map((opt, index) => {
            const last = options.length <= 1;
            return (
              <SortableItem key={opt.key} value={opt.key}>
                <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-card p-1">
                  <SortableItemHandle
                    className="flex h-11 w-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground active:cursor-grabbing md:h-9"
                    aria-label={catalogWords.variantDragAria(opt.name || String(index + 1))}
                  >
                    <GripVerticalIcon className="size-4" />
                  </SortableItemHandle>
                  <Input
                    value={opt.name}
                    maxLength={VARIANT_LIMITS.valueLength}
                    aria-label={catalogWords.variantOptionAria(index + 1)}
                    className="h-11 min-w-0 flex-1 border-transparent bg-transparent text-base shadow-none md:h-9 md:text-sm"
                    onChange={(e) => {
                      const text = e.target.value;
                      setOptions((prev) =>
                        prev.map((o) => (o.key === opt.key ? { ...o, name: text } : o)),
                      );
                      setOptionError(null);
                    }}
                  />
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={
                            last
                              ? catalogWords.variantKeepOne
                              : catalogWords.removeOptionAria(opt.name || String(index + 1))
                          }
                          aria-disabled={last ? true : undefined}
                          className="size-11 shrink-0 text-muted-foreground hover:text-destructive md:size-9"
                          onClick={() => {
                            if (last) {
                              setOptionError(catalogWords.variantKeepOne);
                              return;
                            }
                            setOptions((prev) => prev.filter((o) => o.key !== opt.key));
                          }}
                        />
                      }
                    >
                      <XIcon className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {last
                        ? catalogWords.variantKeepOne
                        : catalogWords.removeOptionAria(opt.name || String(index + 1))}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </SortableItem>
            );
          })}
        </Sortable>

        {options.length < VARIANT_LIMITS.values ? (
          <div className="flex gap-2">
            <Input
              id="variant-new-option"
              value={newOption}
              maxLength={VARIANT_LIMITS.valueLength * 3}
              placeholder={catalogWords.variantOptionPlaceholder}
              aria-invalid={optionError ? true : undefined}
              className="h-11 min-w-0 flex-1 text-base md:h-9 md:text-sm"
              onChange={(e) => {
                const text = e.target.value;
                setOptionError(null);
                if (text.includes(',')) addOptions(text);
                else setNewOption(text);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addOptions(newOption);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 md:h-9"
              disabled={!newOption.trim()}
              onClick={() => addOptions(newOption)}
            >
              {catalogWords.addOptionButton}
            </Button>
          </div>
        ) : null}
        {optionError ? <FieldError>{optionError}</FieldError> : null}
      </div>

      {template ? (
        <div className="space-y-2">
          <Label>{catalogWords.variantUsedOnLabel}</Label>
          {usedOn.length === 0 ? (
            <p className="text-sm text-muted-foreground">{catalogWords.variantUsedOnNone}</p>
          ) : (
            <ItemGroup className="gap-1.5">
              {usedOn.slice(0, USED_ON_SHOWN).map((item) => (
                <Item
                  key={item.id}
                  variant="outline"
                  size="sm"
                  render={
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({ to: '/catalog/$itemId', params: { itemId: item.id } })
                      }
                    />
                  }
                  className="min-h-11 cursor-pointer text-left hover:bg-muted/50"
                >
                  <CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" className="size-8" />
                  <ItemContent className="min-w-0">
                    <ItemTitle className="truncate">{item.name}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ChevronRightIcon className="size-4 text-muted-foreground" />
                  </ItemActions>
                </Item>
              ))}
              {usedOn.length > USED_ON_SHOWN ? (
                <p className="text-sm text-muted-foreground">
                  {catalogWords.variantUsedOnMore(usedOn.length - USED_ON_SHOWN)}
                </p>
              ) : null}
            </ItemGroup>
          )}
        </div>
      ) : null}

      <ResponsiveDialogFooter>
        {!isOnline ? (
          <p className="text-sm text-muted-foreground">{catalogWords.offlineNotice}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          {template ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9"
              disabled={deleteAction.busy}
              onClick={() => setDeleteOpen(true)}
            >
              {catalogWords.delete}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onCancel}>
              {catalogWords.cancel}
            </Button>
            <AsyncButton
              type="submit"
              status={saveAction.status}
              busyLabel={actionWords.saving}
              doneLabel={actionWords.saved}
              disabled={!isOnline}
              className="h-11 font-semibold md:h-9"
            >
              {catalogWords.save}
            </AsyncButton>
          </div>
        </div>
      </ResponsiveDialogFooter>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {catalogWords.updateItemsTitle(template?.usedBy ?? 0, template?.name ?? '')}
            </AlertDialogTitle>
            <AlertDialogDescription render={<div />} className="text-left">
              <ul className="list-disc space-y-1 pl-5">
                {changeLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {changes && changes.added.length > 0 ? (
                <p className="mt-2">
                  {catalogWords.changeAddedNote(changes.added.join(', '), name.trim())}
                </p>
              ) : null}
              {unlinksOnKeep ? <p className="mt-2">{catalogWords.changeKeepNote}</p> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 md:h-9">{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              type="button"
              variant="outline"
              status={keepAction.status}
              busyLabel={actionWords.saving}
              doneLabel={actionWords.saved}
              disabled={saveAction.busy}
              className="h-11 md:h-9"
              onClick={() => void save(false, keepAction)}
            >
              {catalogWords.onlyVariantButton}
            </AsyncButton>
            <AsyncButton
              type="button"
              status={saveAction.status}
              busyLabel={actionWords.saving}
              doneLabel={actionWords.saved}
              disabled={keepAction.busy}
              className="h-11 font-semibold md:h-9"
              onClick={() => void save(true, saveAction)}
            >
              {catalogWords.updateItemsButton(template?.usedBy ?? 0)}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {catalogWords.deleteVariantTitle(template?.name ?? '')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {template && template.usedBy > 0
                ? catalogWords.deleteVariantUsed(template.usedBy, template.name)
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
              className="h-11 font-semibold md:h-9"
              onClick={() => void handleDelete()}
            >
              {catalogWords.deleteVariantButton}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
