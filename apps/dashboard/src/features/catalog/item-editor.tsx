import * as React from 'react';
import { useNavigate, useBlocker } from '@tanstack/react-router';
import {
  PlusIcon,
  Trash2Icon,
  ArchiveIcon,
  ArrowLeftIcon,
  CheckIcon,
  SparklesIcon,
} from 'lucide-react';
import {
  itemPriceLabel,
  words,
  errorWords,
  type OwnerItem,
  type ItemDraft,
  type VariantAxis,
  type Variant,
  type ItemStatus,
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
import { useShop } from '@/app/shop';
import { useOnlineStatus } from '@/app/use-online-status';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Textarea } from '@smartapp/ui/components/textarea';
import { Switch } from '@smartapp/ui/components/switch';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Badge } from '@smartapp/ui/components/badge';
import { NativeSelect } from '@smartapp/ui/components/native-select';
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
import { PhotoUploadSection } from './photo-upload-section.js';
import { AddOnSheet } from './add-on-sheet.js';
import { CatalogPhoto } from './catalog-photo.js';
import { cn } from 'cn';

export interface ItemEditorProps {
  initialItem?: OwnerItem | null;
}

export function ItemEditor({ initialItem }: ItemEditorProps) {
  const navigate = useNavigate();
  const { kind } = useShop();
  const isOnline = useOnlineStatus();

  const { data: categories = [] } = useOwnerCategories();
  const { data: optionGroups = [] } = useOwnerOptionGroups();
  const { data: allItems = [] } = useOwnerItems();

  const saveItem = useSaveItem();
  const removeItem = useRemoveItem();
  const setStatus = useSetItemStatus();

  // Form State
  const [name, setName] = React.useState(initialItem?.name ?? '');
  const [description, setDescription] = React.useState(initialItem?.description ?? '');
  const [categoryId, setCategoryId] = React.useState(initialItem?.categoryId ?? '');
  const effectiveCategoryId = categoryId || (categories[0]?.id ?? '');

  const [basePrice, setBasePrice] = React.useState(
    initialItem?.variants[0]?.price ? initialItem.variants[0].price / 100 : 0,
  );
  const [photos, setPhotos] = React.useState<string[]>(initialItem?.photos ?? []);
  const [axes, setAxes] = React.useState<VariantAxis[]>(initialItem?.axes ?? []);
  const [variants, setVariants] = React.useState<Variant[]>(
    initialItem?.variants ?? [
      {
        id: `var_${Date.now()}`,
        values: [],
        price: 0,
        availability: 'available',
        soldOutUntil: null,
      },
    ],
  );
  const [optionGroupIds, setOptionGroupIds] = React.useState<string[]>(
    initialItem?.optionGroupIds ?? [],
  );
  const [pairingIds, setPairingIds] = React.useState<string[]>(initialItem?.pairingIds ?? []);
  const [featured, setFeatured] = React.useState(initialItem?.featured ?? false);
  const [isNew, setIsNew] = React.useState(initialItem?.isNew ?? false);
  const [status, setItemStatus] = React.useState<ItemStatus>(initialItem?.status ?? 'active');

  const [isDirty, setIsDirty] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [addOnSheetOpen, setAddOnSheetOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  // Mark dirty
  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Leave guards
  useBlocker({
    shouldBlockFn: () => isDirty && !isSubmitted,
    withResolver: false,
  });

  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitted) {
        e.preventDefault();
        e.returnValue = words.screens.catalog.unsavedChanges;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isSubmitted]);

  // Rebuild variants when axes change
  const syncVariantsFromAxes = (newAxes: VariantAxis[]) => {
    if (newAxes.length === 0) {
      setVariants([
        {
          id: variants[0]?.id || `var_${Date.now()}`,
          values: [],
          price: Math.round(basePrice * 100),
          availability: 'available',
          soldOutUntil: null,
        },
      ]);
      return;
    }

    const cartesian = (...arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((c) => curr.map((n) => [...c, n])),
        [[]],
      );
    };

    const valueLists = newAxes.map((a) => a.values.map((v) => v.name));
    const combinations = cartesian(...valueLists);

    const nextVariants: Variant[] = combinations.map((combo, idx) => {
      // Find matching existing variant
      const existing = variants.find(
        (v) => v.values.length === combo.length && v.values.every((val, i) => val === combo[i]),
      );
      if (existing) return existing;

      return {
        id: `var_${Date.now()}_${idx}`,
        values: combo,
        price: Math.round(basePrice * 100),
        availability: 'available',
        soldOutUntil: null,
      };
    });

    setVariants(nextVariants);
  };

  const handleAddAxis = () => {
    if (axes.length >= 2) return;
    markDirty();
    const newAxis: VariantAxis = {
      name: axes.length === 0 ? 'Size' : 'Style',
      values: [
        { name: 'Regular', photo: null },
        { name: 'Large', photo: null },
      ],
    };
    const nextAxes = [...axes, newAxis];
    setAxes(nextAxes);
    syncVariantsFromAxes(nextAxes);
  };

  const handleRemoveAxis = (axisIndex: number) => {
    markDirty();
    const nextAxes = axes.filter((_, i) => i !== axisIndex);
    setAxes(nextAxes);
    syncVariantsFromAxes(nextAxes);
  };

  const handleUpdateAxisName = (axisIndex: number, newName: string) => {
    markDirty();
    const nextAxes = axes.map((a, i) => (i === axisIndex ? { ...a, name: newName } : a));
    setAxes(nextAxes);
  };

  const handleAddAxisValue = (axisIndex: number) => {
    markDirty();
    const axis = axes[axisIndex];
    if (!axis || axis.values.length >= 10) return;
    const nextValues = [...axis.values, { name: `Option ${axis.values.length + 1}`, photo: null }];
    const nextAxes = axes.map((a, i) => (i === axisIndex ? { ...a, values: nextValues } : a));
    setAxes(nextAxes);
    syncVariantsFromAxes(nextAxes);
  };

  const handleRemoveAxisValue = (axisIndex: number, valIndex: number) => {
    markDirty();
    const axis = axes[axisIndex];
    if (!axis || axis.values.length <= 1) return;
    const nextValues = axis.values.filter((_, i) => i !== valIndex);
    const nextAxes = axes.map((a, i) => (i === axisIndex ? { ...a, values: nextValues } : a));
    setAxes(nextAxes);
    syncVariantsFromAxes(nextAxes);
  };

  const handleUpdateAxisValueName = (axisIndex: number, valIndex: number, valName: string) => {
    markDirty();
    const axis = axes[axisIndex];
    if (!axis) return;
    const nextValues = axis.values.map((v, i) => (i === valIndex ? { ...v, name: valName } : v));
    const nextAxes = axes.map((a, i) => (i === axisIndex ? { ...a, values: nextValues } : a));
    setAxes(nextAxes);
    syncVariantsFromAxes(nextAxes);
  };

  const updateVariant = (index: number, patch: Partial<Variant>) => {
    markDirty();
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const toggleOptionGroup = (groupId: string) => {
    markDirty();
    setOptionGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  const togglePairing = (targetItemId: string) => {
    markDirty();
    setPairingIds((prev) => {
      if (prev.includes(targetItemId)) {
        return prev.filter((id) => id !== targetItemId);
      }
      if (prev.length >= 4) return prev;
      return [...prev, targetItemId];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Item name cannot be empty.');
      return;
    }
    const finalCategory = effectiveCategoryId;
    if (!finalCategory) {
      setErrorMsg('Please select a category.');
      return;
    }

    // Sync base price to single variant if no axes
    let finalVariants = variants;
    if (axes.length === 0) {
      finalVariants = [
        {
          id: variants[0]?.id || `var_${Date.now()}`,
          values: [],
          price: Math.round(basePrice * 100),
          availability: variants[0]?.availability || 'available',
          soldOutUntil: variants[0]?.soldOutUntil || null,
        },
      ];
    }

    const draft: ItemDraft = {
      categoryId: finalCategory,
      name: trimmed,
      description: description.trim() || null,
      photos,
      axes,
      variants: finalVariants,
      optionGroupIds,
      pairingIds,
      featured,
      isNew,
      status,
    };

    try {
      setIsSubmitted(true);
      if (initialItem) {
        await saveItem.mutateAsync({ id: initialItem.id, draft });
      } else {
        await saveItem.mutateAsync({ draft });
      }
      navigate({ to: '/catalog' });
    } catch (err: unknown) {
      setIsSubmitted(false);
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  const handleDelete = async () => {
    if (!initialItem) return;
    try {
      setIsSubmitted(true);
      await removeItem.mutateAsync({ id: initialItem.id });
      navigate({ to: '/catalog' });
    } catch (err: unknown) {
      setIsSubmitted(false);
      setDeleteConfirmOpen(false);
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  const handleArchive = async () => {
    if (!initialItem) return;
    try {
      setIsSubmitted(true);
      await setStatus.mutateAsync({ id: initialItem.id, status: 'archived' });
      navigate({ to: '/catalog' });
    } catch (err: unknown) {
      setIsSubmitted(false);
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  // Live preview representation
  const previewItem: Pick<OwnerItem, 'name' | 'variants'> = {
    name: name || 'Item name',
    variants:
      axes.length === 0
        ? [
            {
              id: 'preview',
              values: [],
              price: Math.round(basePrice * 100),
              availability: 'available',
              soldOutUntil: null,
            },
          ]
        : variants,
  };

  return (
    <div className="mx-auto max-w-5xl pb-28">
      {/* Header Back & Title */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => navigate({ to: '/catalog' })}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {initialItem
              ? words.screens.catalog.itemTitle(kind)
              : words.screens.catalog.newTitle(kind)}
          </h1>
          <p className="text-xs text-muted-foreground">
            {initialItem
              ? 'Update details, prices and options.'
              : 'Create a new item in your catalog.'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
          {errorMsg}
        </div>
      )}

      {/* Main Layout: 720px Form + Sticky Preview Column */}
      <div className="flex flex-col items-start gap-8 lg:flex-row">
        {/* Form Column */}
        <form onSubmit={handleSave} className="w-full max-w-3xl space-y-6">
          {/* Photos Section */}
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <PhotoUploadSection
              photos={photos}
              disabled={!isOnline}
              onChange={(nextPhotos) => {
                markDirty();
                setPhotos(nextPhotos);
              }}
            />
          </div>

          {/* Basics Section */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {words.screens.catalog.sectionBasics}
              </h3>
              <p className="text-xs text-muted-foreground">
                {words.screens.catalog.sectionBasicsDesc}
              </p>
            </div>

            <div className="space-y-4 pt-1">
              {/* Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="item-name">{words.screens.catalog.nameLabel}</Label>
                  <span className="font-mono text-xs text-muted-foreground">{name.length}/80</span>
                </div>
                <Input
                  id="item-name"
                  value={name}
                  maxLength={80}
                  placeholder={words.screens.catalog.namePlaceholder}
                  onChange={(e) => {
                    markDirty();
                    setName(e.target.value);
                  }}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="item-desc">{words.screens.catalog.descLabel}</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {description.length}/300
                  </span>
                </div>
                <Textarea
                  id="item-desc"
                  value={description}
                  maxLength={300}
                  rows={3}
                  placeholder={words.screens.catalog.descPlaceholder}
                  onChange={(e) => {
                    markDirty();
                    setDescription(e.target.value);
                  }}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="item-cat">{words.screens.catalog.categoryLabel}</Label>
                <NativeSelect
                  id="item-cat"
                  value={effectiveCategoryId}
                  onChange={(e) => {
                    markDirty();
                    setCategoryId(e.target.value);
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              {/* Base Price (shown when no axes) */}
              {axes.length === 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="item-price">{words.screens.catalog.priceLabel}</Label>
                  <div className="relative max-w-xs">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground">
                      ₱
                    </span>
                    <Input
                      id="item-price"
                      type="number"
                      min={0}
                      step={1}
                      value={basePrice ? basePrice : ''}
                      placeholder="0"
                      className="pl-8 font-mono"
                      onChange={(e) => {
                        markDirty();
                        setBasePrice(parseFloat(e.target.value) || 0);
                      }}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sizes & Colours (Variants) Section */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {words.screens.catalog.sectionVariants}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {words.screens.catalog.sectionVariantsDesc}
                </p>
              </div>
              {axes.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleAddAxis}
                >
                  <PlusIcon className="mr-1 size-3.5" />
                  {words.screens.catalog.addAxis}
                </Button>
              )}
            </div>

            {axes.map((axis, axisIndex) => (
              <div
                key={axisIndex}
                className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="max-w-xs flex-1">
                    <Label className="mb-1 block text-xs text-muted-foreground">Choice name</Label>
                    <Input
                      value={axis.name}
                      placeholder="e.g. Size, Temperature, Colour"
                      className="h-8 text-xs"
                      onChange={(e) => handleUpdateAxisName(axisIndex, e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveAxis(axisIndex)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground">Choice values</span>
                    {axis.values.length < 10 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-primary"
                        onClick={() => handleAddAxisValue(axisIndex)}
                      >
                        <PlusIcon className="mr-1 size-3" />
                        Add value
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {axis.values.map((val, valIndex) => (
                      <div
                        key={valIndex}
                        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-card p-1 px-2 text-xs"
                      >
                        <input
                          value={val.name}
                          className="w-20 border-none bg-transparent text-xs focus:outline-hidden"
                          onChange={(e) =>
                            handleUpdateAxisValueName(axisIndex, valIndex, e.target.value)
                          }
                        />
                        {axis.values.length > 1 && (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveAxisValue(axisIndex, valIndex)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Combinations Matrix / Grid */}
            {axes.length > 0 && (
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold">Combinations & Pricing</Label>
                <div className="space-y-2">
                  {variants.map((variant, vIdx) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-card p-2.5 text-xs"
                    >
                      <span className="min-w-28 truncate font-semibold text-foreground">
                        {variant.values.join(' · ')}
                      </span>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-muted-foreground">₱</span>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={variant.price ? variant.price / 100 : ''}
                            placeholder="0"
                            className="h-7 w-24 font-mono text-xs"
                            onChange={(e) => {
                              const p = parseFloat(e.target.value) || 0;
                              updateVariant(vIdx, { price: Math.round(p * 100) });
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Sold out</span>
                          <Switch
                            checked={variant.availability !== 'available'}
                            onCheckedChange={(checked) =>
                              updateVariant(vIdx, {
                                availability: checked ? 'sold_out' : 'available',
                                soldOutUntil: null,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Add-ons Section */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {words.screens.catalog.sectionAddOns}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {words.screens.catalog.sectionAddOnsDesc}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setAddOnSheetOpen(true)}
              >
                <PlusIcon className="mr-1 size-3.5" />
                {words.screens.catalog.createAddOnGroup}
              </Button>
            </div>

            {optionGroups.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground italic">
                No add-on groups created yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                {optionGroups.map((group) => {
                  const isChecked = optionGroupIds.includes(group.id);
                  return (
                    <label
                      key={group.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors select-none',
                        isChecked
                          ? 'border-primary/50 bg-primary/5 shadow-2xs'
                          : 'border-border/60 bg-card hover:bg-muted/30',
                      )}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleOptionGroup(group.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {group.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {group.options.length} options ·{' '}
                          {group.min === 1 ? 'Required' : 'Optional'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Goes Well With (Pairings) Section */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {words.screens.catalog.sectionPairings} ({pairingIds.length}/4)
              </h3>
              <p className="text-xs text-muted-foreground">
                {words.screens.catalog.sectionPairingsDesc}
              </p>
            </div>

            <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto pt-1 sm:grid-cols-2">
              {allItems
                .filter((i) => i.id !== initialItem?.id && i.status !== 'archived')
                .map((pairItem) => {
                  const isSelected = pairingIds.includes(pairItem.id);
                  return (
                    <button
                      key={pairItem.id}
                      type="button"
                      onClick={() => togglePairing(pairItem.id)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border p-2 text-left transition-colors',
                        isSelected
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border/40 bg-card hover:bg-muted/40',
                      )}
                    >
                      <CatalogPhoto photoRef={pairItem.photos[0]} alt={pairItem.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {pairItem.name}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {itemPriceLabel(pairItem)}
                        </p>
                      </div>
                      {isSelected && <CheckIcon className="mr-1 size-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Show As Switches */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {words.screens.catalog.sectionShowAs}
              </h3>
              <p className="text-xs text-muted-foreground">
                {words.screens.catalog.sectionShowAsDesc}
              </p>
            </div>

            <div className="space-y-4 divide-y divide-border/40 pt-1">
              {/* Featured */}
              <div className="flex items-center justify-between pt-2 first:pt-0">
                <div>
                  <Label className="text-xs font-semibold">
                    {words.screens.catalog.featuredLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {words.screens.catalog.featuredDesc}
                  </p>
                </div>
                <Switch
                  checked={featured}
                  onCheckedChange={(c) => {
                    markDirty();
                    setFeatured(c);
                  }}
                />
              </div>

              {/* New */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <Label className="text-xs font-semibold">{words.screens.catalog.newLabel}</Label>
                  <p className="text-xs text-muted-foreground">{words.screens.catalog.newDesc}</p>
                </div>
                <Switch
                  checked={isNew}
                  onCheckedChange={(c) => {
                    markDirty();
                    setIsNew(c);
                  }}
                />
              </div>

              {/* Visible */}
              <div className="flex items-center justify-between pt-4">
                <div>
                  <Label className="text-xs font-semibold">
                    {words.screens.catalog.visibleLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {words.screens.catalog.visibleDesc}
                  </p>
                </div>
                <Switch
                  checked={status === 'active'}
                  onCheckedChange={(c) => {
                    markDirty();
                    setItemStatus(c ? 'active' : 'hidden');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Archive / Delete Danger Zone (for existing items) */}
          {initialItem && (
            <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-destructive">
                    {initialItem.hasOrders ? 'Archive Item' : 'Delete Item'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {initialItem.hasOrders
                      ? 'This item has past orders and cannot be deleted. Archive it to remove it from customer view.'
                      : 'Permanently remove this item from your catalog.'}
                  </p>
                </div>

                {initialItem.hasOrders ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                    onClick={handleArchive}
                  >
                    <ArchiveIcon className="mr-1.5 size-3.5" />
                    {words.screens.catalog.archive}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2Icon className="mr-1.5 size-3.5" />
                    {words.screens.catalog.delete}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Sticky Save Bar */}
          <div className="fixed right-0 bottom-0 left-0 z-40 flex items-center justify-end gap-3 border-t border-border/50 bg-background/90 p-4 shadow-lg backdrop-blur-md">
            <Button
              type="button"
              variant="outline"
              disabled={saveItem.isPending}
              onClick={() => navigate({ to: '/catalog' })}
            >
              {words.screens.catalog.cancel}
            </Button>
            <Button
              type="submit"
              disabled={saveItem.isPending || !isOnline}
              className="min-w-28 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {saveItem.isPending ? words.screens.catalog.saving : words.screens.catalog.save}
            </Button>
          </div>
        </form>

        {/* Sticky Desktop Phone Preview Column */}
        <div className="sticky top-20 hidden w-80 shrink-0 lg:block">
          <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {words.screens.catalog.previewHeading}
              </span>
              <SparklesIcon className="size-4 text-primary" />
            </div>

            {/* Simulated Phone Card */}
            <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-xs">
              <div className="relative h-44 w-full bg-muted">
                <CatalogPhoto
                  photoRef={photos[0]}
                  alt="Preview"
                  size="lg"
                  className="h-full w-full rounded-none"
                />
                <div className="absolute top-2 left-2 flex gap-1">
                  {featured && (
                    <Badge variant="default" className="px-1 py-0 text-xs font-bold">
                      FEATURED
                    </Badge>
                  )}
                  {isNew && (
                    <Badge variant="secondary" className="px-1 py-0 text-xs font-bold">
                      NEW
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm leading-tight font-semibold text-foreground">
                    {name || 'Item Name'}
                  </h4>
                  <span className="shrink-0 font-mono text-xs font-bold">
                    {itemPriceLabel(previewItem)}
                  </span>
                </div>

                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {description || 'Item description will appear here.'}
                </p>

                {axes.length > 0 && (
                  <div className="pt-1">
                    <span className="text-xs text-muted-foreground">
                      Choices: {axes.map((a) => a.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add-on Creation Sheet */}
      <AddOnSheet open={addOnSheetOpen} onOpenChange={setAddOnSheetOpen} group={null} />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{words.screens.catalog.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {words.screens.catalog.confirmDeleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{words.screens.catalog.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {words.screens.catalog.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
