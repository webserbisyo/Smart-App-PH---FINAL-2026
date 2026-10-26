'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FlameIcon, SparklesIcon, XIcon } from 'lucide-react';
import {
  defaultPicks,
  formatPeso,
  linePrice,
  validateLinePicks,
  words,
  type BasketLine,
  type Catalog,
  type Item,
  type Variant,
} from '@smartapp/core';
import { useBasket, useFavourites } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@smartapp/ui/components/drawer';
import { Hitbox } from '@smartapp/ui/components/hitbox';
import { ProgressiveBlur } from '@smartapp/ui/components/progressive-blur';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { HeartToggle } from '@smartapp/ui/compositions/heart-toggle';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { ADD_LOADING_MS, ItemSheetFooter } from './item-sheet-footer';
import { ItemSheetGoesWellWith } from './item-sheet-goes-well-with';
import { ItemSheetGroups } from './item-sheet-groups';
import { ItemSheetNote } from './item-sheet-note';
import { ItemSheetPhotos } from './item-sheet-photos';
import { ItemSheetVariants } from './item-sheet-variants';
import { useAddedToast } from '../use-added-toast';

// The sheet stays open while Add to Cart shows its check, then closes and the cart pops (I7).
const CHECK_MS = 600;

type Layout = 'sheet' | 'dialog';

interface ItemSheetContentProps {
  slug: string;
  item: Item;
  catalog: Catalog;
  now: string | Date;
  layout: Layout;
  onClose: () => void;
  onOpenItem: (id: string) => void;
}

/** Pairings the owner set, else other items from other categories (at most 4 are shown). */
function companionsOf(item: Item, catalog: Catalog): Item[] {
  const active = catalog.items.filter((other) => other.id !== item.id && other.status === 'active');
  const paired = item.pairingIds
    .map((id) => active.find((other) => other.id === id))
    .filter((other): other is Item => Boolean(other));
  return paired.length > 0
    ? paired
    : active.filter((other) => other.categoryId !== item.categoryId);
}

function ItemSheetContent({
  slug,
  item,
  catalog,
  now,
  layout,
  onClose,
  onOpenItem,
}: ItemSheetContentProps) {
  const basket = useBasket(slug);
  const favourites = useFavourites(slug);
  const addedToast = useAddedToast();

  const startingPicks = useMemo(
    () => defaultPicks(item, catalog.optionGroups, now),
    [item, catalog.optionGroups, now],
  );
  const initialVariant = useMemo(
    () => item.variants.find((v) => v.id === startingPicks.variantId) ?? item.variants[0] ?? null,
    [item.variants, startingPicks.variantId],
  );

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(initialVariant);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => [
    ...startingPicks.optionIds,
  ]);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);
  const [invalidGroupIds, setInvalidGroupIds] = useState<string[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | undefined>(undefined);

  // A line waiting for the check animation. It is added when the sheet closes, or at once if the
  // sheet goes away first (another item, leaving the page), so a tap on Add is never lost.
  const pending = useRef<BasketLine | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commit = () => {
    const line = pending.current;
    if (!line) return;
    pending.current = null;
    basket.add(line);
    addedToast(item.name);
  };
  const latest = useRef({ commit, onClose });
  useEffect(() => {
    latest.current = { commit, onClose };
  });
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      latest.current.commit();
    },
    [],
  );

  const activeVariant = selectedVariant ?? initialVariant;
  if (!activeVariant) return null;

  const picks = { variantId: activeVariant.id, optionIds: selectedOptionIds };
  const problems = validateLinePicks(item, catalog.optionGroups, { ...picks, note }, now);
  const unitTotal = linePrice(item, catalog.optionGroups, { ...picks, qty: 1 });
  const totalPrice = linePrice(item, catalog.optionGroups, { ...picks, qty });

  const itemOptionGroups = item.optionGroupIds
    .map((gid) => catalog.optionGroups.find((g) => g.id === gid))
    .filter((g): g is NonNullable<typeof g> => Boolean(g));
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
      document
        .getElementById(`group-${problem.groupId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleAdd = () => {
    if (pending.current) return;
    pending.current = { itemId: item.id, ...picks, note: note.trim(), qty };
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current.commit();
      latest.current.onClose();
    }, ADD_LOADING_MS + CHECK_MS);
  };

  const handleQuickAddCompanion = (companion: Item) => {
    const v = companion.variants[0];
    if (!v) return;
    basket.add({ itemId: companion.id, variantId: v.id, optionIds: [], note: '', qty: 1 });
    addedToast(companion.name);
  };

  const heart = (
    <HeartToggle
      pressed={isFav}
      onPressedChange={() => favourites.toggle(item.id)}
      label={words.storefrontShell.menu.saveItem(item.name)}
      pressedLabel={words.storefrontShell.menu.unsaveItem(item.name)}
      size="md"
      className="absolute top-3 right-3"
    />
  );

  const photos = (
    <ItemSheetPhotos
      photos={item.photos}
      itemName={item.name}
      categoryIcon={category?.icon}
      activePhotoIndex={activePhotoIndex}
      ratio={layout === 'sheet' ? '4:3' : '1:1'}
      sizes={layout === 'sheet' ? '100vw' : '448px'}
      className={layout === 'sheet' ? 'rounded-t-xl' : undefined}
      overlay={
        <>
          {layout === 'sheet' ? (
            <Hitbox
              size="sm"
              radius="full"
              className="absolute top-3 left-3"
              render={
                <DrawerClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={words.storefrontShell.menu.itemSheet.close}
                      className="size-11 rounded-full border glass shadow-sm"
                    />
                  }
                >
                  <XIcon aria-hidden="true" className="size-5" />
                </DrawerClose>
              }
            />
          ) : null}
          {heart}
        </>
      }
    />
  );

  const M = words.storefrontShell.menu;
  // Both labels fit here, unlike the card (decision R29), with the card's icons.
  const badges =
    item.featured || item.isNew ? (
      <div className="flex flex-wrap gap-1.5">
        {item.featured ? (
          <Badge variant="warning" size="lg" radius="full" className="gap-1 pr-2 pl-1.5">
            <FlameIcon aria-hidden="true" strokeWidth={2.5} />
            {M.badges.bestSeller}
          </Badge>
        ) : null}
        {item.isNew ? (
          <Badge variant="default" size="lg" radius="full" className="gap-1 pr-2 pl-1.5">
            <SparklesIcon aria-hidden="true" strokeWidth={2.5} />
            {M.badges.new}
          </Badge>
        ) : null}
      </div>
    ) : null;

  const about = (
    <div className="flex flex-col gap-2">
      {badges}
      <h3 className="text-xl font-bold tracking-tight text-balance md:text-2xl">{item.name}</h3>
      {item.description ? (
        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
          {item.description}
        </p>
      ) : null}
      <p className="pt-1 text-lg font-bold tabular">{formatPeso(unitTotal)}</p>
    </div>
  );

  const choices = (
    <>
      <ItemSheetVariants
        item={item}
        selectedVariant={activeVariant}
        onSelectVariant={setSelectedVariant}
        now={now}
        onSelectPhotoByValue={handleColorPhotoSelect}
      />

      <ItemSheetGroups
        groups={itemOptionGroups}
        selectedOptionIds={selectedOptionIds}
        onChangeOptionIds={(ids) => {
          setSelectedOptionIds(ids);
          setInvalidGroupIds([]);
        }}
        invalidGroupIds={invalidGroupIds}
      />

      <ItemSheetNote value={note} onChange={setNote} />
    </>
  );

  const goesWellWith = (
    <ItemSheetGoesWellWith
      items={companionsOf(item, catalog)}
      categories={catalog.categories}
      optionGroups={catalog.optionGroups}
      onQuickAdd={handleQuickAddCompanion}
      onOpenItem={onOpenItem}
    />
  );

  // Choices soften as they scroll under the Add bar (Magic UI Progressive Blur, decision R38).
  const scrollEdge = <ProgressiveBlur position="bottom" height="2.5rem" />;

  const footer = (
    <ItemSheetFooter
      qty={qty}
      onQtyChange={setQty}
      totalPrice={totalPrice}
      problems={problems}
      onAdd={handleAdd}
      onMissingClick={handleMissingClick}
    />
  );

  if (layout === 'sheet') {
    return (
      <>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {photos}
            <div className="flex flex-col gap-5 px-4 pt-4 pb-10">
              {about}
              {choices}
              {goesWellWith}
            </div>
          </div>
          {scrollEdge}
        </div>
        {footer}
      </>
    );
  }

  // Desktop (decision R27): the left side is about the item (photo, name, badges, description,
  // pairings), the right side is making it yours (a small sticky title, choices, Add bar).
  return (
    <div className="grid min-h-0 flex-1 md:grid-cols-2">
      <div className="scrollbar-none min-h-0 overflow-y-auto overscroll-contain border-r">
        {photos}
        <div className="flex flex-col gap-6 px-5 pt-5 pb-6">
          {about}
          {goesWellWith}
        </div>
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex min-h-14 items-center gap-3 border-b px-5 py-3 pr-14">
          <p className="min-w-0 flex-1 truncate font-semibold">{item.name}</p>
          <p className="shrink-0 font-bold tabular">{formatPeso(unitTotal)}</p>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-5 px-4 pt-4 pb-10 md:px-5">{choices}</div>
          </div>
          {scrollEdge}
        </div>
        {footer}
      </div>
    </div>
  );
}

export interface ItemSheetProps {
  slug: string;
  catalog: Catalog;
  itemId: string | null;
  onClose: () => void;
  onOpenItem: (id: string) => void;
  now?: string | Date | null | undefined;
}

/** Item sheet (redesign 6): bottom sheet on phones, photo-left dialog from tablets up. */
export function ItemSheet({
  slug,
  catalog,
  itemId,
  onClose,
  onOpenItem,
  now: rawNow,
}: ItemSheetProps) {
  const now = useMemo(() => rawNow ?? new Date(), [rawNow]);
  const isPhone = useFormFactor() === 'phone';

  const [prevItemId, setPrevItemId] = useState(itemId);
  const [activeItem, setActiveItem] = useState<Item | null>(() => {
    if (!itemId) return null;
    return catalog.items.find((i) => i.id === itemId && i.status === 'active') ?? null;
  });
  const [isOpen, setIsOpen] = useState(Boolean(itemId));

  if (prevItemId !== itemId) {
    setPrevItemId(itemId);
    if (itemId) {
      const found = catalog.items.find((i) => i.id === itemId && i.status === 'active') ?? null;
      if (found) {
        setActiveItem(found);
        setIsOpen(true);
      }
    } else {
      setIsOpen(false);
    }
  }

  // An unknown or hidden item in ?item= says so and closes.
  useEffect(() => {
    if (itemId && !catalog.items.some((i) => i.id === itemId && i.status === 'active')) {
      notify({ title: words.storefrontShell.menu.notAvailableToast, tone: 'warning' });
      onClose();
    }
  }, [catalog.items, itemId, onClose]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsOpen(false);
      onClose();
    }
  };

  if (!activeItem) return null;

  const content = (
    <ItemSheetContent
      key={activeItem.id}
      slug={slug}
      item={activeItem}
      catalog={catalog}
      now={now}
      layout={isPhone ? 'sheet' : 'dialog'}
      onClose={() => handleOpenChange(false)}
      onOpenItem={onOpenItem}
    />
  );

  if (isPhone) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="flex max-h-vh-92 flex-col overflow-hidden p-0">
          {content}
          <DrawerHeader className="sr-only">
            <DrawerTitle>{activeItem.name}</DrawerTitle>
            <DrawerDescription>{activeItem.description ?? activeItem.name}</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-vh-85 flex-col gap-0 overflow-hidden p-0 sm:max-w-md md:max-w-4xl">
        {content}
        <DialogHeader className="sr-only">
          <DialogTitle>{activeItem.name}</DialogTitle>
          <DialogDescription>{activeItem.description ?? activeItem.name}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
