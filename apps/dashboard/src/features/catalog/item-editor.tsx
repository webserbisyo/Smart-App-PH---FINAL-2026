import * as React from 'react';
import { useNavigate, useBlocker } from '@tanstack/react-router';
import {
  ArchiveIcon,
  BanIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CopyIcon,
  EyeOffIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  WifiOffIcon,
  XIcon,
} from 'lucide-react';
import {
  actionWords,
  formatPeso,
  itemPriceLabel,
  catalogWords,
  errorWords,
  groupRuleLabel,
  type Category,
  type ItemDraft,
  type ItemStatus,
  type OwnerItem,
  type OwnerOptionGroup,
} from '@smartapp/core';
import {
  useSaveItem,
  useRemoveItem,
  useSetItemStatus,
  useOwnerCategories,
  useOwnerOptionGroups,
  useOwnerItems,
  errorCodeOf,
} from '@smartapp/data';
import { env } from '@/app/env';
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { AsyncButton, useAsyncAction } from '@smartapp/ui/compositions/async-button';
import { Notice } from '@/app/notice';
import { SearchField } from '@/app/search-field';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { FieldError as InstalledFieldError } from '@smartapp/ui/components/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { CategoryIcon } from '@smartapp/ui/compositions/category-icon';
import { notify } from '@smartapp/ui/compositions/notify';
import { PhotoUploadSection } from './photo-upload-section.js';
import { AddOnSheet } from './add-on-sheet.js';
import { CategorySheet } from './category-sheet.js';
import { CatalogPhoto } from './catalog-photo.js';
import { ItemPreview } from './item-preview.js';
import { PesoInput } from '@/app/peso-input';
import { PickedChip, PickRow } from './pick-list.js';
import { BookingSection } from './booking-section.js';
import { VariantsSection, type VariantsValue } from './variants-section.js';
import { choicesFrom, pricedAxes, withVersions } from './variants.js';
import { cn } from 'cn';

export interface ItemEditorProps {
  initialItem?: OwnerItem | null | undefined;
  // Duplicate: a new item that starts as a copy of this one and is saved only on Save.
  copyFrom?: OwnerItem | null | undefined;
  // A new item's starting name (from "Add 'x'" on a search with no match).
  initialName?: string | undefined;
}

interface FormState {
  name: string;
  description: string;
  categoryId: string;
  photos: string[];
  basePrice: number;
  choices: VariantsValue;
  optionGroupIds: string[];
  pairingIds: string[];
  featured: boolean;
  isNew: boolean;
  // Advance-order notice and daily limit (decision T48); kept as saved until the editor shows them.
  noticeDays: number;
  dailyLimit: number | null;
  status: ItemStatus;
}

interface FieldErrors {
  name?: string | undefined;
  category?: string | undefined;
  choices?: string | undefined;
}

function initialForm(source: OwnerItem | null, isCopy: boolean): FormState {
  const basePrice = source?.basePrice ?? 0;
  const choices = source
    ? choicesFrom(source.axes, source.variants)
    : withVersions({ axes: [], variants: [], samePrice: [] }, 0);
  return {
    name: source ? (isCopy ? catalogWords.copyName(source.name) : source.name) : '',
    description: source?.description ?? '',
    categoryId: source?.categoryId ?? '',
    photos: source?.photos ?? [],
    basePrice,
    choices,
    optionGroupIds: source?.optionGroupIds ?? [],
    pairingIds: source?.pairingIds ?? [],
    featured: source?.featured ?? false,
    isNew: source?.isNew ?? false,
    noticeDays: source?.noticeDays ?? 0,
    dailyLimit: source?.dailyLimit ?? null,
    status: source && source.status !== 'archived' ? source.status : 'active',
  };
}

function toDraft(form: FormState, categoryId: string): ItemDraft {
  // A choice whose "Same price for all" is on saves +₱0 for every option.
  const { variants } = withVersions(form.choices, form.basePrice);
  const axes = pricedAxes(form.choices);
  return {
    categoryId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    photos: form.photos,
    basePrice: form.basePrice,
    axes: axes.map((axis) => ({ ...axis, name: axis.name.trim() })),
    variants,
    optionGroupIds: form.optionGroupIds,
    pairingIds: form.pairingIds,
    featured: form.featured,
    isNew: form.isNew,
    noticeDays: form.noticeDays,
    dailyLimit: form.dailyLimit,
    status: form.status,
  };
}

export function ItemEditor({ initialItem, copyFrom, initialName }: ItemEditorProps) {
  // Discard on an existing item starts the form again from what is saved; its Undo starts it again
  // from the discarded changes.
  const [resetKey, setResetKey] = React.useState(0);
  const [restoreForm, setRestoreForm] = React.useState<FormState | null>(null);
  return (
    <ItemEditorForm
      key={resetKey}
      initialItem={initialItem ?? null}
      copyFrom={copyFrom ?? null}
      initialName={initialName}
      restoreForm={restoreForm}
      onReset={(snapshot) => {
        setRestoreForm(snapshot);
        setResetKey((k) => k + 1);
      }}
    />
  );
}

function ItemEditorForm({
  initialItem,
  copyFrom,
  initialName,
  restoreForm,
  onReset,
}: {
  initialItem: OwnerItem | null;
  copyFrom: OwnerItem | null;
  initialName: string | undefined;
  restoreForm: FormState | null;
  onReset: (snapshot: FormState | null) => void;
}) {
  const navigate = useNavigate();
  const { kind } = useShop();
  const isOnline = useOnlineStatus();
  const { data: categories = [] } = useOwnerCategories();
  const { data: optionGroups = [] } = useOwnerOptionGroups();
  const { data: allItems = [] } = useOwnerItems();
  const saveItem = useSaveItem();
  const removeItem = useRemoveItem();
  const setStatus = useSetItemStatus();
  const saveAction = useAsyncAction();
  const deleteAction = useAsyncAction();
  const archiveAction = useAsyncAction();

  const isCopy = !initialItem && copyFrom !== null;
  // What the form compares against to know it has unsaved changes; a save makes the saved item the new start.
  const [initial, setInitial] = React.useState(() => initialForm(initialItem ?? copyFrom, isCopy));
  const [form, setForm] = React.useState<FormState>(
    () =>
      restoreForm ??
      (!initialItem && !copyFrom && initialName ? { ...initial, name: initialName } : initial),
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [freeConfirmOpen, setFreeConfirmOpen] = React.useState(false);
  const [addOnSheetOpen, setAddOnSheetOpen] = React.useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const leaving = React.useRef(false);
  const errorRef = React.useRef<HTMLDivElement>(null);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    // Fixing a field clears its message.
    if (patch.name !== undefined && fieldErrors.name)
      setFieldErrors((e) => ({ ...e, name: undefined }));
    if (patch.categoryId !== undefined && fieldErrors.category)
      setFieldErrors((e) => ({ ...e, category: undefined }));
    if (patch.choices !== undefined && fieldErrors.choices)
      setFieldErrors((e) => ({ ...e, choices: undefined }));
  };
  const categoryId = form.categoryId || (categories[0]?.id ?? '');
  const isDirty =
    isCopy ||
    JSON.stringify(toDraft(form, form.categoryId)) !==
      JSON.stringify(toDraft(initial, initial.categoryId));

  const blocker = useBlocker({
    shouldBlockFn: () => isDirty && !leaving.current,
    enableBeforeUnload: () => isDirty && !leaving.current,
    withResolver: true,
  });

  const showError = (message: string) => {
    setErrorMsg(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: 'center' }));
  };

  const handleSave = async (e?: React.FormEvent, allowFree = false) => {
    e?.preventDefault();
    const draft = toDraft(form, categoryId);
    const errors: FieldErrors = {
      name: draft.name ? undefined : catalogWords.nameRequired,
      category: draft.categoryId ? undefined : catalogWords.categoryRequired,
      choices: draft.axes.some((axis) => !axis.name)
        ? catalogWords.choiceNeedsName
        : draft.axes.some((axis) => axis.values.length === 0)
          ? catalogWords.choiceNeedsOption
          : undefined,
    };
    setFieldErrors(errors);
    // Errors show under their field; the page scrolls to the first one.
    const firstInvalid = errors.name
      ? 'item-name'
      : errors.category
        ? 'item-cat'
        : errors.choices
          ? 'item-variants'
          : null;
    if (firstInvalid) {
      setErrorMsg(null);
      const el = document.getElementById(firstInvalid);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement)
        el.focus({ preventScroll: true });
      return;
    }
    if (!allowFree && draft.variants.some((v) => v.price === 0)) {
      setFreeConfirmOpen(true);
      return;
    }
    try {
      setErrorMsg(null);
      const saved = await saveAction.run(() =>
        saveItem.mutateAsync(initialItem ? { id: initialItem.id, draft } : { draft }),
      );
      if (initialItem) {
        // Save stays on the item (decision T47): the button shows Saved and the form starts again
        // from what was saved, so the Unsaved bar goes away and the owner keeps editing.
        const next = initialForm(saved, false);
        setInitial(next);
        setForm(next);
        return;
      }
      // A new item becomes that item's page, in place of the New page, so Back still goes to the list.
      notify({
        title: catalogWords.addedToast(saved.name),
        tone: 'success',
        action: {
          label: catalogWords.addAnother,
          onClick: () => void navigate({ to: '/catalog/new' }),
        },
      });
      leaving.current = true;
      void navigate({ to: '/catalog/$itemId', params: { itemId: saved.id }, replace: true });
    } catch (err: unknown) {
      leaving.current = false;
      showError(errorWords(errorCodeOf(err)));
    }
  };

  const handleDiscard = () => {
    if (initialItem) {
      // Discard happens at once, with Undo (ux.md s8: reversible actions never ask).
      const snapshot = form;
      onReset(null);
      notify({
        title: catalogWords.changesDiscarded,
        tone: 'success',
        action: { label: catalogWords.undo, onClick: () => onReset(snapshot) },
      });
      return;
    }
    // A new item with anything typed asks first (the leave dialog); an untouched one just closes.
    void navigate({ to: '/catalog' });
  };

  // Enter in a one-line field moves to the next field instead of saving: on a phone the Go key
  // would otherwise publish a half-made item. Only the Save button saves.
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter' || e.defaultPrevented || e.nativeEvent.isComposing) return;
    const target = e.target;
    if (!(target instanceof HTMLInputElement)) return;
    e.preventDefault();
    const fields = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>(
        'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([disabled]), textarea:not([disabled])',
      ),
    );
    const next = fields[fields.indexOf(target) + 1];
    if (next) next.focus();
    else target.blur();
  };

  const handleDelete = async () => {
    if (!initialItem) return;
    try {
      leaving.current = true;
      await deleteAction.run(() => removeItem.mutateAsync({ id: initialItem.id }));
      notify({ title: catalogWords.itemDeleted(initialItem.name), tone: 'success' });
      void navigate({ to: '/catalog' });
    } catch (err: unknown) {
      leaving.current = false;
      setDeleteConfirmOpen(false);
      showError(errorWords(errorCodeOf(err)));
    }
  };

  const handleArchive = async () => {
    if (!initialItem) return;
    try {
      leaving.current = true;
      await archiveAction.run(() =>
        setStatus.mutateAsync({ id: initialItem.id, status: 'archived' }),
      );
      const previous = initialItem.status;
      const id = initialItem.id;
      notify({
        title: catalogWords.itemArchived(initialItem.name),
        tone: 'success',
        action: {
          label: catalogWords.undo,
          onClick: () => setStatus.mutate({ id, status: previous }),
        },
      });
      void navigate({ to: '/catalog' });
    } catch (err: unknown) {
      leaving.current = false;
      showError(errorWords(errorCodeOf(err)));
    }
  };

  const attachedGroups = form.optionGroupIds
    .map((id) => optionGroups.find((group) => group.id === id))
    .filter((group): group is OwnerOptionGroup => group !== undefined);
  const unattachedGroups = optionGroups.filter((group) => !form.optionGroupIds.includes(group.id));

  const otherItems = allItems.filter(
    (item) => item.id !== initialItem?.id && item.status !== 'archived',
  );
  const draftForPreview = toDraft(form, categoryId);
  const soldOutEverywhere = draftForPreview.variants.every((v) => v.availability === 'sold_out');
  const prices = draftForPreview.variants.map((v) => v.price);
  const lowPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const highPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const status = !initialItem
    ? {
        icon: <SparklesIcon className="size-4" />,
        text: catalogWords.editorDraft,
        tone: 'text-muted-foreground',
      }
    : form.status === 'hidden'
      ? {
          icon: <EyeOffIcon className="size-4" />,
          text: catalogWords.editorHidden,
          tone: 'text-muted-foreground',
        }
      : soldOutEverywhere
        ? {
            icon: <BanIcon className="size-4" />,
            text: catalogWords.editorSoldOut,
            tone: 'text-warning-text',
          }
        : {
            icon: <CheckCircle2Icon className="size-4" />,
            text: catalogWords.editorVisible,
            tone: 'text-success-text',
          };

  const card = 'space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-xs md:p-5';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6 md:px-6 md:pt-6">
      <header className="mb-5 space-y-1.5">
        {/* The top bar already says "New menu item"; the heading only shows once there is a name. */}
        <h1
          className={cn(
            'line-clamp-2 text-xl font-bold text-foreground md:text-2xl',
            !form.name.trim() && 'sr-only',
          )}
        >
          {form.name.trim() || catalogWords.newTitle(kind)}
        </h1>
        <p className={cn('flex items-center gap-1.5 text-sm font-medium', status.tone)}>
          {status.icon}
          {status.text}
        </p>
      </header>

      {!isOnline ? (
        <Notice tone="warning" icon={<WifiOffIcon />} className="mb-4">
          {catalogWords.offlineNotice}
        </Notice>
      ) : null}

      {isCopy && copyFrom ? (
        <Notice tone="brand" icon={<CopyIcon className="text-primary" />} className="mb-4">
          {catalogWords.copyNotice(copyFrom.name)}
        </Notice>
      ) : null}

      {errorMsg ? (
        <Notice ref={errorRef} tone="error" icon={<CircleAlertIcon />} className="mb-4">
          {errorMsg}
        </Notice>
      ) : null}

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <form
          id="item-form"
          noValidate
          onSubmit={(e) => void handleSave(e)}
          onKeyDown={handleFormKeyDown}
          className="w-full min-w-0 flex-1 space-y-4"
        >
          <section className={card}>
            <PhotoUploadSection
              photos={form.photos}
              disabled={!isOnline}
              onChange={(photos) => update({ photos })}
            />
          </section>

          <section className={card}>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {catalogWords.sectionBasics}
              </h2>
              <p className="text-sm text-muted-foreground">{catalogWords.sectionBasicsDesc}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="item-name">{catalogWords.nameLabel}</Label>
                <span className="text-xs text-muted-foreground tabular">
                  {catalogWords.charCount(form.name.length, 80)}
                </span>
              </div>
              <Input
                id="item-name"
                value={form.name}
                maxLength={80}
                aria-invalid={fieldErrors.name ? true : undefined}
                aria-describedby={fieldErrors.name ? 'item-name-error' : undefined}
                placeholder={catalogWords.namePlaceholderFor(kind)}
                enterKeyHint="next"
                className="h-11 md:h-9"
                onChange={(e) => update({ name: e.target.value })}
              />
              <FieldError id="item-name-error" message={fieldErrors.name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-cat">{catalogWords.categoryLabel}</Label>
              <CategorySelect
                categories={categories}
                value={categoryId}
                invalid={Boolean(fieldErrors.category)}
                onChange={(id) => update({ categoryId: id })}
                onNew={() => setCategorySheetOpen(true)}
              />
              <FieldError id="item-cat-error" message={fieldErrors.category} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-price">
                {form.choices.axes.length > 0
                  ? catalogWords.basePriceLabel
                  : catalogWords.priceLabel}
              </Label>
              <PesoInput
                id="item-price"
                className="max-w-48"
                enterKeyHint="next"
                value={form.basePrice}
                onChange={(basePrice) =>
                  update({ basePrice, choices: withVersions(form.choices, basePrice) })
                }
              />
              {form.choices.axes.length > 0 ? (
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p>{catalogWords.basePriceHelp}</p>
                  <p className="font-medium text-foreground tabular">
                    {catalogWords.priceLine(
                      lowPrice === highPrice
                        ? formatPeso(lowPrice)
                        : catalogWords.priceRange(formatPeso(lowPrice), formatPeso(highPrice)),
                      draftForPreview.variants.length,
                    )}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="item-desc">{catalogWords.descLabel}</Label>
                <span className="text-xs text-muted-foreground tabular">
                  {catalogWords.charCount(form.description.length, 300)}
                </span>
              </div>
              <Textarea
                id="item-desc"
                value={form.description}
                maxLength={300}
                rows={3}
                placeholder={catalogWords.descPlaceholderFor(kind)}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
          </section>

          <VariantsSection
            kind={kind}
            error={fieldErrors.choices}
            value={form.choices}
            onChange={(choices) => update({ choices })}
            basePrice={form.basePrice}
            otherItems={otherItems}
            onCopied={(name) => notify({ title: catalogWords.copiedFrom(name), tone: 'success' })}
          />

          <BookingSection
            kind={kind}
            noticeDays={form.noticeDays}
            dailyLimit={form.dailyLimit}
            onChange={update}
            className={card}
          />

          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {catalogWords.sectionAddOns}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {catalogWords.sectionAddOnsHelp(kind)}
                </p>
              </div>
            </div>
            {attachedGroups.length > 0 ? (
              <ul className="space-y-2">
                {attachedGroups.map((group) => (
                  <AttachedAddOn
                    key={group.id}
                    group={group}
                    onRemove={() =>
                      update({
                        optionGroupIds: form.optionGroupIds.filter((id) => id !== group.id),
                      })
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {optionGroups.length === 0
                  ? catalogWords.noAddOnGroupsYet
                  : catalogWords.attachAddOnNone}
              </p>
            )}
            <AttachAddOnMenu
              groups={unattachedGroups}
              onAttach={(id) => update({ optionGroupIds: [...form.optionGroupIds, id] })}
              onCreate={() => setAddOnSheetOpen(true)}
            />
          </section>

          <section className={card}>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                {catalogWords.sectionShowAs}
              </h2>
              <p className="text-sm text-muted-foreground">{catalogWords.sectionShowAsHelp}</p>
            </div>
            <div className="divide-y divide-border/50">
              <SettingSwitch
                id="item-visible"
                label={catalogWords.visibleLabel}
                help={catalogWords.visibleHelp}
                checked={form.status === 'active'}
                onCheckedChange={(c) => update({ status: c ? 'active' : 'hidden' })}
              />
              <SettingSwitch
                id="item-featured"
                label={catalogWords.featuredLabel}
                help={catalogWords.featuredDesc}
                checked={form.featured}
                onCheckedChange={(featured) => update({ featured })}
              />
              <SettingSwitch
                id="item-new"
                label={catalogWords.newLabel}
                help={catalogWords.newDesc}
                checked={form.isNew}
                onCheckedChange={(isNew) => update({ isNew })}
              />
            </div>
          </section>

          <PairingsSection
            items={otherItems}
            pickedIds={form.pairingIds}
            onChange={(pairingIds) => update({ pairingIds })}
          />

          {initialItem ? (
            <section className="flex flex-col gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-destructive">
                  {initialItem.hasOrders ? catalogWords.archiveTitle : catalogWords.deleteTitle}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {initialItem.hasOrders ? catalogWords.archiveHelp : catalogWords.deleteHelp}
                </p>
              </div>
              {initialItem.hasOrders ? (
                <AsyncButton
                  type="button"
                  variant="outline"
                  status={archiveAction.status}
                  busyLabel={actionWords.archiving}
                  doneLabel={actionWords.archived}
                  className="h-11 shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 md:h-9"
                  onClick={() => void handleArchive()}
                >
                  <ArchiveIcon className="size-4" />
                  {catalogWords.archive}
                </AsyncButton>
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  className="h-11 shrink-0 gap-1.5 md:h-9"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2Icon className="size-4" />
                  {catalogWords.delete}
                </Button>
              )}
            </section>
          ) : null}
        </form>

        <aside className="sticky top-20 hidden w-80 shrink-0 lg:block">
          <div className="space-y-3 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {catalogWords.customerPreview}
            </span>
            <ItemPreview
              name={form.name}
              description={form.description}
              photos={form.photos}
              variants={draftForPreview.variants}
              choiceNames={form.choices.axes.map((a) => a.name || catalogWords.choiceUnnamed)}
              axes={draftForPreview.axes}
              featured={form.featured}
              isNew={form.isNew}
            />
          </div>
        </aside>
      </div>

      {isDirty || !initialItem || saveAction.status !== 'idle' ? (
        // Item pages have no phone dock (hideDock), so the bar sits on the bottom edge above the safe area.
        <div className="pointer-events-none sticky bottom-4 z-30 mt-6 flex justify-center pb-safe">
          <div
            role="region"
            aria-label={catalogWords.unsavedPill}
            className="animate-in fade-in-0 slide-in-from-bottom-4 pointer-events-auto flex w-full items-center justify-end gap-1 rounded-full border border-border bg-card p-1.5 pl-3 elevation-md duration-200 motion-reduce:animate-none sm:w-auto sm:pl-4"
          >
            {isDirty && saveAction.status === 'idle' ? (
              <span className="mr-auto flex min-w-0 items-center gap-2 text-sm font-medium text-foreground sm:mr-1">
                <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-warning" />
                {/* Phones show the short word so Discard and Save keep their full size. */}
                <span className={cn('truncate', !initialItem && 'sr-only sm:not-sr-only')}>
                  <span className="sm:hidden">{catalogWords.unsavedShort}</span>
                  <span className="hidden sm:inline">{catalogWords.unsavedPill}</span>
                </span>
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-full px-3 sm:px-4 md:h-10"
              disabled={saveAction.busy}
              onClick={handleDiscard}
            >
              {isDirty ? catalogWords.discard : catalogWords.cancel}
            </Button>
            <AsyncButton
              type="submit"
              form="item-form"
              status={saveAction.status}
              busyLabel={initialItem ? actionWords.saving : actionWords.adding}
              doneLabel={initialItem ? actionWords.saved : actionWords.added}
              disabled={!isOnline}
              className="h-11 min-w-24 rounded-full px-4 font-semibold sm:min-w-28 sm:px-5 md:h-10"
            >
              {initialItem ? catalogWords.save : catalogWords.addItem(kind)}
            </AsyncButton>
          </div>
        </div>
      ) : null}

      <AlertDialog open={freeConfirmOpen} onOpenChange={setFreeConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.freeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.freeDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                const el = document.getElementById('item-price');
                el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
                if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
              }}
            >
              {catalogWords.setPrice}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFreeConfirmOpen(false);
                void handleSave(undefined, true);
              }}
            >
              {catalogWords.saveAsFree}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddOnSheet
        open={addOnSheetOpen}
        onOpenChange={setAddOnSheetOpen}
        group={null}
        quiet
        onSaved={(group) =>
          setForm((prev) => ({ ...prev, optionGroupIds: [...prev.optionGroupIds, group.id] }))
        }
      />
      <CategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        category={null}
        quiet
        onSaved={(category) => update({ categoryId: category.id })}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {catalogWords.deleteItemTitle(initialItem?.name ?? '')}
            </AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.deleteItemDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{catalogWords.cancel}</AlertDialogCancel>
            <AsyncButton
              variant="destructive"
              status={deleteAction.status}
              busyLabel={actionWords.deleting}
              doneLabel={actionWords.deleted}
              onClick={() => void handleDelete()}
            >
              {catalogWords.delete}
            </AsyncButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.leaveDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => blocker.reset?.()}>
              {catalogWords.keepEditing}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => blocker.proceed?.()}
            >
              {catalogWords.discardChanges}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const NEW_CATEGORY = '__new__';

function CategorySelect({
  categories,
  value,
  invalid,
  onChange,
  onNew,
}: {
  categories: readonly Category[];
  value: string;
  invalid: boolean;
  onChange: (id: string) => void;
  onNew: () => void;
}) {
  const find = (id: unknown) => categories.find((c) => c.id === id);
  return (
    <Select
      value={value || null}
      onValueChange={(next) => {
        if (next === NEW_CATEGORY) onNew();
        else if (typeof next === 'string') onChange(next);
      }}
    >
      <SelectTrigger
        id="item-cat"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={invalid ? 'item-cat-error' : undefined}
        className="w-full min-w-0 bg-card data-size-default:h-11 md:data-size-default:h-9"
      >
        <SelectValue placeholder={catalogWords.categorySelect}>
          {(selected: unknown) => {
            const category = find(selected);
            return category ? <CategoryOption category={category} /> : catalogWords.categorySelect;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.id} value={category.id} className="min-h-11 md:min-h-9">
            <CategoryOption category={category} />
          </SelectItem>
        ))}
        {categories.length > 0 ? <SelectSeparator /> : null}
        <SelectItem value={NEW_CATEGORY} className="min-h-11 font-medium text-primary md:min-h-9">
          <PlusIcon className="size-4" />
          {catalogWords.newCategory}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// Field errors use the installed shadcn FieldError (decision T43).
function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return <InstalledFieldError id={id}>{message}</InstalledFieldError>;
}

function CategoryOption({ category }: { category: Category }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CategoryIcon
        icon={category.icon}
        size={20}
        assetOrigin={env.VITE_STOREFRONT_URL}
        className="size-5 shrink-0 object-contain"
        textClassName="text-base leading-none"
      />
      <span className="truncate">{category.name}</span>
    </span>
  );
}

function AttachedAddOn({ group, onRemove }: { group: OwnerOptionGroup; onRemove: () => void }) {
  return (
    <li className="flex min-h-14 items-center gap-3 rounded-xl border border-border/60 bg-muted/20 py-2 pr-1 pl-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{group.name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {catalogWords.groupSummary(
            group.options.length,
            groupRuleLabel(group.min, group.max, group.options.length),
          )}
        </span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={catalogWords.removeAddOnAria(group.name)}
        className="size-11 shrink-0 text-muted-foreground hover:text-destructive md:size-9"
        onClick={onRemove}
      >
        <XIcon className="size-4" />
      </Button>
    </li>
  );
}

function AttachAddOnMenu({
  groups,
  onAttach,
  onCreate,
}: {
  groups: readonly OwnerOptionGroup[];
  onAttach: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" className="h-11 gap-1.5 md:h-9" />}
      >
        <PlusIcon className="size-4" />
        {catalogWords.attachAddOn}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        {groups.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            {catalogWords.addOnsAllAttached}
          </p>
        ) : (
          groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              className="min-h-11 md:min-h-9"
              onClick={() => onAttach(group.id)}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{group.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {catalogWords.groupSummary(
                    group.options.length,
                    groupRuleLabel(group.min, group.max, group.options.length),
                  )}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="min-h-11 text-primary md:min-h-9" onClick={onCreate}>
          <PlusIcon className="size-4" />
          {catalogWords.attachAddOnCreate}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SettingSwitch({
  id,
  label,
  help,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-semibold">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{help}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

const MAX_PAIRINGS = 4;

function PairingsSection({
  items,
  pickedIds,
  onChange,
}: {
  items: readonly OwnerItem[];
  pickedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = React.useState('');
  const picked = pickedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is OwnerItem => item !== undefined);
  const q = query.trim().toLowerCase();
  const matches = items
    .filter((item) => !pickedIds.includes(item.id))
    .filter((item) => !q || item.name.toLowerCase().includes(q))
    .slice(0, 6);
  const full = pickedIds.length >= MAX_PAIRINGS;

  return (
    <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 shadow-xs md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {catalogWords.sectionPairings}
          </h2>
          <p className="text-sm text-muted-foreground">{catalogWords.sectionPairingsHelp}</p>
        </div>
        <Badge variant="secondary" className="tabular">
          {catalogWords.pairingsPicked(pickedIds.length)}
        </Badge>
      </div>

      {picked.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {picked.map((item) => (
            <PickedChip
              key={item.id}
              media={<CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" className="size-8" />}
              name={item.name}
              removeLabel={catalogWords.removePairingAria(item.name)}
              onRemove={() => onChange(pickedIds.filter((id) => id !== item.id))}
            />
          ))}
        </ul>
      ) : null}

      {full ? (
        <p className="text-sm text-muted-foreground">{catalogWords.pairingsFull}</p>
      ) : (
        <div className="space-y-2">
          <SearchField
            value={query}
            onChange={setQuery}
            ariaLabel={catalogWords.pairingsSearch}
            placeholder={catalogWords.pairingsSearch}
            clearLabel={catalogWords.clearSearch}
          />
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{catalogWords.pairingsNoMatch}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matches.map((item) => (
                <li key={item.id}>
                  <PickRow
                    media={<CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" />}
                    title={item.name}
                    description={itemPriceLabel(item)}
                    onPick={() => {
                      onChange([...pickedIds, item.id]);
                      setQuery('');
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
