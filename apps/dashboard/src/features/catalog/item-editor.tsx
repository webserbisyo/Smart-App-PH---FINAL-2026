import * as React from 'react';
import { useNavigate, useBlocker } from '@tanstack/react-router';
import {
  ArchiveIcon,
  BanIcon,
  CheckCircle2Icon,
  CopyIcon,
  EyeOffIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
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
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
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
import { PesoInput } from './components/peso-input.js';
import { VariantsSection, type VariantsValue } from './variants-section.js';
import { buildVariants, sharedPrice } from './variants.js';
import { cn } from 'cn';

export interface ItemEditorProps {
  initialItem?: OwnerItem | null | undefined;
  // Duplicate: a new item that starts as a copy of this one and is saved only on Save.
  copyFrom?: OwnerItem | null | undefined;
}

interface FormState {
  name: string;
  description: string;
  categoryId: string;
  photos: string[];
  basePrice: number;
  samePrice: boolean;
  choices: VariantsValue;
  optionGroupIds: string[];
  pairingIds: string[];
  featured: boolean;
  isNew: boolean;
  status: ItemStatus;
}

function initialForm(source: OwnerItem | null, isCopy: boolean): FormState {
  const variants = source?.variants ?? buildVariants([], [], 0);
  const shared = sharedPrice(variants);
  return {
    name: source ? (isCopy ? catalogWords.copyName(source.name) : source.name) : '',
    description: source?.description ?? '',
    categoryId: source?.categoryId ?? '',
    photos: source?.photos ?? [],
    basePrice: shared ?? variants[0]?.price ?? 0,
    samePrice: (source?.axes.length ?? 0) === 0 || shared !== null,
    choices: { axes: source?.axes ?? [], variants },
    optionGroupIds: source?.optionGroupIds ?? [],
    pairingIds: source?.pairingIds ?? [],
    featured: source?.featured ?? false,
    isNew: source?.isNew ?? false,
    status: source && source.status !== 'archived' ? source.status : 'active',
  };
}

function toDraft(form: FormState, categoryId: string): ItemDraft {
  const { axes, variants } = form.choices;
  const finalVariants =
    axes.length === 0
      ? buildVariants([], variants, form.basePrice)
      : form.samePrice
        ? variants.map((v) => ({ ...v, price: form.basePrice }))
        : variants;
  return {
    categoryId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    photos: form.photos,
    axes: axes.map((axis) => ({ ...axis, name: axis.name.trim() })),
    variants: finalVariants,
    optionGroupIds: form.optionGroupIds,
    pairingIds: form.pairingIds,
    featured: form.featured,
    isNew: form.isNew,
    status: form.status,
  };
}

export function ItemEditor({ initialItem, copyFrom }: ItemEditorProps) {
  // Discard on an existing item starts the form again from what is saved.
  const [resetKey, setResetKey] = React.useState(0);
  return (
    <ItemEditorForm
      key={resetKey}
      initialItem={initialItem ?? null}
      copyFrom={copyFrom ?? null}
      onReset={() => setResetKey((k) => k + 1)}
    />
  );
}

function ItemEditorForm({
  initialItem,
  copyFrom,
  onReset,
}: {
  initialItem: OwnerItem | null;
  copyFrom: OwnerItem | null;
  onReset: () => void;
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

  const isCopy = !initialItem && copyFrom !== null;
  const [initial] = React.useState(() => initialForm(initialItem ?? copyFrom, isCopy));
  const [form, setForm] = React.useState<FormState>(initial);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [nameInvalid, setNameInvalid] = React.useState(false);
  const [addOnSheetOpen, setAddOnSheetOpen] = React.useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const leaving = React.useRef(false);
  const errorRef = React.useRef<HTMLParagraphElement>(null);

  const update = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));
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

  const leaveTo = (to: '/catalog') => {
    leaving.current = true;
    void navigate({ to });
  };

  const showError = (message: string) => {
    setErrorMsg(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ block: 'center' }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const draft = toDraft(form, categoryId);
    const problem = !draft.name
      ? catalogWords.nameRequired
      : !draft.categoryId
        ? catalogWords.categoryRequired
        : draft.axes.some((axis) => !axis.name)
          ? catalogWords.choiceNeedsName
          : draft.axes.some((axis) => axis.values.length === 0)
            ? catalogWords.choiceNeedsOption
            : null;
    setNameInvalid(!draft.name);
    if (problem) {
      showError(problem);
      return;
    }
    try {
      leaving.current = true;
      const saved = await saveItem.mutateAsync(
        initialItem ? { id: initialItem.id, draft } : { draft },
      );
      notify({ title: catalogWords.savedToast(saved.name), tone: 'success' });
      void navigate({ to: '/catalog' });
    } catch (err: unknown) {
      leaving.current = false;
      showError(errorWords(errorCodeOf(err)));
    }
  };

  const handleDiscard = () => {
    if (initialItem) {
      onReset();
      return;
    }
    leaveTo('/catalog');
  };

  const handleDelete = async () => {
    if (!initialItem) return;
    try {
      leaving.current = true;
      await removeItem.mutateAsync({ id: initialItem.id });
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
      await setStatus.mutateAsync({ id: initialItem.id, status: 'archived' });
      notify({ title: catalogWords.itemArchived(initialItem.name), tone: 'success' });
      void navigate({ to: '/catalog' });
    } catch (err: unknown) {
      leaving.current = false;
      showError(errorWords(errorCodeOf(err)));
    }
  };

  const toggleOptionGroup = (groupId: string) =>
    update({
      optionGroupIds: form.optionGroupIds.includes(groupId)
        ? form.optionGroupIds.filter((id) => id !== groupId)
        : [...form.optionGroupIds, groupId],
    });

  const otherItems = allItems.filter(
    (item) => item.id !== initialItem?.id && item.status !== 'archived',
  );
  const draftForPreview = toDraft(form, categoryId);
  const soldOutEverywhere = draftForPreview.variants.every((v) => v.availability === 'sold_out');
  const showPrice = form.choices.axes.length === 0 || form.samePrice;

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
        <h1
          className={cn(
            'line-clamp-2 text-xl font-bold text-foreground md:text-2xl',
            !form.name.trim() && 'text-muted-foreground',
          )}
        >
          {form.name.trim() || catalogWords.newTitle(kind)}
        </h1>
        <p className={cn('flex items-center gap-1.5 text-sm font-medium', status.tone)}>
          {status.icon}
          {status.text}
        </p>
      </header>

      {isCopy && copyFrom ? (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <CopyIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>{catalogWords.copyNotice(copyFrom.name)}</span>
        </div>
      ) : null}

      {errorMsg ? (
        <p
          ref={errorRef}
          role="alert"
          className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMsg}
        </p>
      ) : null}

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <form id="item-form" onSubmit={handleSave} className="w-full min-w-0 flex-1 space-y-4">
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
                aria-invalid={nameInvalid ? true : undefined}
                placeholder={catalogWords.namePlaceholder}
                className="h-11 md:h-9"
                onChange={(e) => {
                  update({ name: e.target.value });
                  if (nameInvalid) setNameInvalid(false);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="item-cat">{catalogWords.categoryLabel}</Label>
              <div className="flex gap-2">
                <CategorySelect
                  categories={categories}
                  value={categoryId}
                  onChange={(id) => update({ categoryId: id })}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 gap-1 px-3 md:h-9"
                  onClick={() => setCategorySheetOpen(true)}
                  aria-label={catalogWords.newCategory}
                >
                  <PlusIcon className="size-4" />
                  <span className="hidden sm:inline">{catalogWords.newCategory}</span>
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-price">
                {form.choices.axes.length > 0 && form.samePrice
                  ? catalogWords.priceForAll
                  : catalogWords.priceLabel}
              </Label>
              {showPrice ? (
                <PesoInput
                  id="item-price"
                  className="max-w-48"
                  value={form.basePrice}
                  onChange={(basePrice) => update({ basePrice })}
                />
              ) : (
                <p className="flex min-h-11 items-center text-sm text-muted-foreground md:min-h-9">
                  {catalogWords.pricePerSize}
                </p>
              )}
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
                placeholder={catalogWords.descPlaceholder}
                onChange={(e) => update({ description: e.target.value })}
              />
            </div>
          </section>

          <VariantsSection
            kind={kind}
            value={form.choices}
            onChange={(choices) => update({ choices })}
            samePrice={form.samePrice}
            onSamePriceChange={(samePrice) => update({ samePrice })}
            basePrice={form.basePrice}
            otherItems={otherItems}
            onCopied={(name) => notify({ title: catalogWords.copiedFrom(name), tone: 'success' })}
          />

          <section className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">
                  {catalogWords.sectionAddOns}
                </h2>
                <p className="text-sm text-muted-foreground">{catalogWords.sectionAddOnsHelp}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-1.5 md:h-9"
                onClick={() => setAddOnSheetOpen(true)}
              >
                <PlusIcon className="size-4" />
                {catalogWords.newAddOnGroup}
              </Button>
            </div>
            {optionGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">{catalogWords.noAddOnGroupsYet}</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {optionGroups.map((group) => (
                  <AddOnChoice
                    key={group.id}
                    group={group}
                    checked={form.optionGroupIds.includes(group.id)}
                    onToggle={() => toggleOptionGroup(group.id)}
                  />
                ))}
              </div>
            )}
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 md:h-9"
                  onClick={() => void handleArchive()}
                >
                  <ArchiveIcon className="size-4" />
                  {catalogWords.archive}
                </Button>
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
            <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
              <div className="relative h-44 w-full bg-muted">
                <CatalogPhoto
                  photoRef={form.photos[0]}
                  alt=""
                  size="lg"
                  className="size-full rounded-none"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  {form.featured ? <Badge>{catalogWords.previewFeatured}</Badge> : null}
                  {form.isNew ? <Badge variant="secondary">{catalogWords.previewNew}</Badge> : null}
                </div>
              </div>
              <div className="space-y-1.5 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {form.name.trim() || catalogWords.previewName}
                  </h3>
                  <span className="shrink-0 text-sm font-bold tabular">
                    {itemPriceLabel({ variants: draftForPreview.variants })}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {form.description.trim() || catalogWords.previewDescription}
                </p>
                {form.choices.axes.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {catalogWords.previewChoices(
                      form.choices.axes.map((a) => a.name || catalogWords.choiceUnnamed).join(', '),
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {isDirty ? (
        <div className="pointer-events-none sticky bottom-4 z-30 mt-6 flex justify-center shell-phone:above-dock">
          <div
            role="region"
            aria-label={catalogWords.unsavedPill}
            className="animate-in fade-in-0 slide-in-from-bottom-4 pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card p-1.5 pl-4 elevation-md duration-200 motion-reduce:animate-none"
          >
            <span className="mr-1 flex items-center gap-2 text-sm font-medium text-foreground">
              <span aria-hidden="true" className="size-2 rounded-full bg-warning" />
              <span>{catalogWords.unsavedPill}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-full px-4 md:h-10"
              disabled={saveItem.isPending}
              onClick={handleDiscard}
            >
              {catalogWords.discard}
            </Button>
            <Button
              type="submit"
              form="item-form"
              disabled={saveItem.isPending || !isOnline}
              className="h-11 min-w-24 rounded-full px-5 font-semibold md:h-10"
            >
              {saveItem.isPending ? catalogWords.saving : catalogWords.save}
            </Button>
          </div>
        </div>
      ) : null}

      <AddOnSheet
        open={addOnSheetOpen}
        onOpenChange={setAddOnSheetOpen}
        group={null}
        onSaved={(group) =>
          setForm((prev) => ({ ...prev, optionGroupIds: [...prev.optionGroupIds, group.id] }))
        }
      />
      <CategorySheet
        open={categorySheetOpen}
        onOpenChange={setCategorySheetOpen}
        category={null}
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
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
            >
              {catalogWords.delete}
            </AlertDialogAction>
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

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: readonly Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const find = (id: unknown) => categories.find((c) => c.id === id);
  return (
    <Select
      value={value || null}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
    >
      <SelectTrigger id="item-cat" className="h-11 w-full min-w-0 flex-1 bg-card md:h-9">
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
      </SelectContent>
    </Select>
  );
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

function AddOnChoice({
  group,
  checked,
  onToggle,
}: {
  group: OwnerOptionGroup;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={cn(
        'flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors select-none',
        checked ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card hover:bg-muted/30',
      )}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">{group.name}</span>
        <span className="block text-sm text-muted-foreground">
          {catalogWords.groupSummary(group.options.length, groupRuleLabel(group.min, group.max))}
        </span>
      </span>
    </label>
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
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-1 pr-1 pl-1.5"
            >
              <CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" className="size-8" />
              <span className="max-w-40 truncate text-sm font-medium">{item.name}</span>
              <button
                type="button"
                aria-label={catalogWords.removePairingAria(item.name)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive"
                onClick={() => onChange(pickedIds.filter((id) => id !== item.id))}
              >
                <XIcon className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {full ? (
        <p className="text-sm text-muted-foreground">{catalogWords.pairingsFull}</p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              aria-label={catalogWords.pairingsSearch}
              placeholder={catalogWords.pairingsSearch}
              className="h-11 pl-9 md:h-9"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{catalogWords.pairingsNoMatch}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([...pickedIds, item.id]);
                      setQuery('');
                    }}
                    className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-border/50 bg-card p-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <CatalogPhoto photoRef={item.photos[0]} alt="" size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                      <span className="block text-sm text-muted-foreground tabular">
                        {itemPriceLabel(item)}
                      </span>
                    </span>
                    <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
