'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  defaultPicks,
  formatPeso,
  linePrice,
  validateLinePicks,
  words,
  type Catalog,
  type Item,
  type Variant,
} from '@smartapp/core';
import { useBasket, useFavourites } from '@smartapp/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { Toggle } from '@smartapp/ui/components/toggle';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { HeartIcon } from 'lucide-react';
import { ItemSheetFooter } from './item-sheet-footer';
import { ItemSheetGoesWellWith } from './item-sheet-goes-well-with';
import { ItemSheetGroups } from './item-sheet-groups';
import { ItemSheetNote } from './item-sheet-note';
import { ItemSheetPhotos } from './item-sheet-photos';
import { ItemSheetVariants } from './item-sheet-variants';

interface ItemSheetContentProps {
  slug: string;
  item: Item;
  catalog: Catalog;
  now: string | Date;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}

function ItemSheetContent({
  slug,
  item,
  catalog,
  now,
  onClose,
  onOpenItem,
}: ItemSheetContentProps) {
  const basket = useBasket(slug);
  const favourites = useFavourites(slug);

  const startingPicks = useMemo(
    () => defaultPicks(item, catalog.optionGroups, now),
    [item, catalog.optionGroups, now],
  );

  const initialVariant = useMemo(() => {
    return item.variants.find((v) => v.id === startingPicks.variantId) ?? item.variants[0] ?? null;
  }, [item.variants, startingPicks.variantId]);

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(initialVariant);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => [
    ...startingPicks.optionIds,
  ]);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [invalidGroupIds, setInvalidGroupIds] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | undefined>(undefined);

  const activeVariant = selectedVariant ?? initialVariant;
  if (!activeVariant) return null;

  // Validate picks
  const problems = validateLinePicks(
    item,
    catalog.optionGroups,
    {
      variantId: activeVariant.id,
      optionIds: selectedOptionIds,
      note,
    },
    now,
  );

  // Calculate live total price
  const totalPrice = linePrice(item, catalog.optionGroups, {
    variantId: activeVariant.id,
    optionIds: selectedOptionIds,
    qty,
  });

  // Groups belonging to this item in owner order
  const itemOptionGroups = item.optionGroupIds
    .map((gid) => catalog.optionGroups.find((g) => g.id === gid))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  // Companion items for "Goes well with"
  const companionItems = catalog.items.filter(
    (other) => other.id !== item.id && other.status === 'active',
  );

  const category = catalog.categories.find((c) => c.id === item.categoryId);
  const isFav = favourites.has(item.id);

  const handleColorPhotoSelect = (colorValue: string) => {
    for (const axis of item.axes) {
      const match = axis.values.find((v) => v.name.toLowerCase() === colorValue.toLowerCase());
      if (match?.photo) {
        const idx = item.photos.indexOf(match.photo);
        if (idx >= 0) {
          setActivePhotoIndex(idx);
          return;
        }
      }
    }
  };

  const handleMissingClick = (problem: { groupId: string | null }) => {
    if (problem.groupId) {
      setInvalidGroupIds([problem.groupId]);
      const el = document.getElementById(`group-${problem.groupId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAdd = () => {
    if (problems.length > 0) {
      const first = problems.find((p) => p.code === 'required_missing' || p.code === 'too_few');
      if (first?.groupId) {
        handleMissingClick(first);
      }
      return;
    }

    basket.add({
      itemId: item.id,
      variantId: activeVariant.id,
      optionIds: selectedOptionIds,
      note: note.trim(),
      qty,
    });

    notify({
      title: `${item.name} added`,
      description: words.storefrontShell.menu.viewBasket,
      tone: 'success',
    });

    onClose();
  };

  const handleQuickAddCompanion = (companion: Item) => {
    const v = companion.variants[0];
    if (!v) return;
    basket.add({
      itemId: companion.id,
      variantId: v.id,
      optionIds: [],
      note: '',
      qty: 1,
    });
    notify({
      title: `${companion.name} added`,
      description: words.storefrontShell.menu.viewBasket,
      tone: 'success',
    });
  };

  return (
    <>
      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* Photos Carousel (c-carousel-11 pattern) */}
        <ItemSheetPhotos
          photos={item.photos}
          itemName={item.name}
          categoryIcon={category?.icon}
          activePhotoIndex={activePhotoIndex}
        />

        {/* Title, description, price, heart */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-foreground">{item.name}</h3>
            {item.description ? (
              <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
            ) : null}
            <p className="pt-1 text-base font-semibold text-primary">
              {formatPeso(
                linePrice(item, catalog.optionGroups, {
                  variantId: activeVariant.id,
                  optionIds: selectedOptionIds,
                  qty: 1,
                }),
              )}
            </p>
          </div>

          <Hitbox
            size="default"
            radius="full"
            render={
              <Toggle
                size="sm"
                variant="outline"
                aria-label={
                  isFav
                    ? words.storefrontShell.menu.unsaveItem(item.name)
                    : words.storefrontShell.menu.saveItem(item.name)
                }
                aria-pressed={isFav}
                pressed={isFav}
                onPressedChange={() => favourites.toggle(item.id)}
                className="size-9 rounded-full border-border bg-card shadow-xs"
              >
                <HeartIcon
                  className={`size-4.5 ${
                    isFav ? 'fill-primary text-primary' : 'text-muted-foreground'
                  }`}
                  aria-hidden="true"
                />
              </Toggle>
            }
          />
        </div>

        {/* Variants (Food radio rows or Retail chips) */}
        <ItemSheetVariants
          item={item}
          selectedVariant={activeVariant}
          onSelectVariant={setSelectedVariant}
          now={now}
          onSelectPhotoByValue={handleColorPhotoSelect}
        />

        {/* Option Groups */}
        <ItemSheetGroups
          groups={itemOptionGroups}
          selectedOptionIds={selectedOptionIds}
          onChangeOptionIds={(ids) => {
            setSelectedOptionIds(ids);
            setInvalidGroupIds([]);
          }}
          invalidGroupIds={invalidGroupIds}
        />

        {/* Special instructions note */}
        <ItemSheetNote value={note} onChange={setNote} />

        {/* Goes well with */}
        <ItemSheetGoesWellWith
          items={companionItems}
          categories={catalog.categories}
          optionGroups={catalog.optionGroups}
          onQuickAdd={handleQuickAddCompanion}
          onOpenItem={onOpenItem}
        />
      </div>

      <ItemSheetFooter
        qty={qty}
        onQtyChange={setQty}
        totalPrice={totalPrice}
        problems={problems}
        onAdd={handleAdd}
        onMissingClick={handleMissingClick}
      />
    </>
  );
}

export interface ItemSheetProps {
  slug: string;
  catalog: Catalog;
  itemId: string | null;
  onClose: () => void;
  onOpenItem: (id: string) => void;
  now?: string | Date | null | undefined;
  isPreview?: boolean;
}

export function ItemSheet({
  slug,
  catalog,
  itemId,
  onClose,
  onOpenItem,
  now: rawNow,
}: ItemSheetProps) {
  const now = useMemo(() => rawNow ?? new Date(), [rawNow]);
  const formFactor = useFormFactor();
  const isPhone = formFactor === 'phone';

  const item = useMemo(() => {
    if (!itemId) return null;
    return catalog.items.find((i) => i.id === itemId && i.status === 'active') ?? null;
  }, [catalog.items, itemId]);

  // If itemId was provided but item is unknown or inactive, notify and close
  useEffect(() => {
    if (itemId && !item) {
      notify({
        title: words.storefrontShell.menu.notAvailableToast,
        tone: 'warning',
      });
      onClose();
    }
  }, [itemId, item, onClose]);

  if (!item) return null;

  if (isPhone) {
    return (
      <Drawer
        open={Boolean(itemId)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        showSwipeHandle
      >
        <DrawerContent className="flex max-h-vh-85 flex-col overflow-hidden p-0">
          <ItemSheetContent
            key={item.id}
            slug={slug}
            item={item}
            catalog={catalog}
            now={now}
            onClose={onClose}
            onOpenItem={onOpenItem}
          />

          <DrawerHeader className="sr-only">
            <DrawerTitle>{item.name}</DrawerTitle>
            <DrawerDescription>{item.description ?? item.name}</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog
      open={Boolean(itemId)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-vh-85 max-w-md flex-col overflow-hidden p-0">
        <ItemSheetContent
          key={item.id}
          slug={slug}
          item={item}
          catalog={catalog}
          now={now}
          onClose={onClose}
          onOpenItem={onOpenItem}
        />

        <DialogHeader className="sr-only">
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description ?? item.name}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
