'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { BanIcon, FlameIcon, SparklesIcon, XIcon } from 'lucide-react';
import {
  defaultPicks,
  formatPeso,
  goesWellWith,
  itemSoldOutLabel,
  lineIdentity,
  linePrice,
  openingWhen,
  validateLinePicks,
  words,
  type BasketLine,
  type Catalog,
  type Item,
  type Variant,
  orderFlowWords,
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
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { HeartToggle } from '@smartapp/ui/compositions/heart-toggle';
import { notify } from '@smartapp/ui/compositions/notify';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { ADD_LOADING_MS, ItemSheetFooter } from './item-sheet-footer';
import { ItemSheetGoesWellWith } from './item-sheet-goes-well-with';
import { ItemSheetGroups } from './item-sheet-groups';
import { ItemSheetNote } from './item-sheet-note';
import { ItemSheetPhotos } from '@smartapp/ui/compositions/item-photos';
import { ItemSheetVariants } from './item-sheet-variants';
import { useAddedToast } from '../use-added-toast';
import { useQuickAdd } from '../use-quick-add';
import { useStockAt } from '../../basket/use-stock-at';

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
  // A basket line being changed (T127): the sheet starts from its picks and Update replaces it.
  edit: BasketLine | null;
  // A sheet opened over another sheet or the basket: no Goes well, so sheets never stack deeper.
  nested: boolean;
  // Opened from the open basket: the toast has no View basket.
  inBasket: boolean;
}

type EditScope = 'all' | 'one';

function ItemSheetContent({
  slug,
  item,
  catalog,
  now,
  layout,
  onClose,
  edit,
  nested,
  inBasket,
}: ItemSheetContentProps) {
  const basket = useBasket(slug);
  const favourites = useFavourites(slug);
  const addedToast = useAddedToast();
  const quickAdd = useQuickAdd();
  // Stock is judged at the time the order is for (T127).
  const stockAt = useStockAt(slug, now);
  // A Goes well item that needs choices opens over this sheet and comes back here (T127).
  const [companionId, setCompanionId] = useState<string | null>(null);
  const [scope, setScope] = useState<EditScope>('all');

  const startingPicks = useMemo(
    () =>
      edit
        ? { variantId: edit.variantId, optionIds: edit.optionIds }
        : defaultPicks(item, catalog.optionGroups, stockAt),
    [edit, item, catalog.optionGroups, stockAt],
  );
  const initialVariant = useMemo(
    () => item.variants.find((v) => v.id === startingPicks.variantId) ?? item.variants[0] ?? null,
    [item.variants, startingPicks.variantId],
  );

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(initialVariant);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>(() => [
    ...startingPicks.optionIds,
  ]);
  const [note, setNote] = useState(edit?.note ?? '');
  const [qty, setQty] = useState(edit?.qty ?? 1);
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
    if (edit) {
      // Update (T127): the whole line, or just one of it; a line that now matches another joins it.
      const result = basket.update(lineIdentity(edit), line, scope === 'one');
      notify({
        title:
          result === 'joined'
            ? orderFlowWords.joinedToast(item.name)
            : orderFlowWords.updatedToast(item.name),
        tone: 'success',
      });
      return;
    }
    basket.add(line);
    if (inBasket) {
      notify({ title: words.storefrontShell.menu.addedToast(item.name), tone: 'success' });
    } else {
      addedToast(item.name);
    }
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
  const problems = validateLinePicks(item, catalog.optionGroups, { ...picks, note }, stockAt);
  // "Just 1" changes one piece; the others stay on their line.
  const lineQty = edit && scope === 'one' ? 1 : qty;
  const unitTotal = linePrice(item, catalog.optionGroups, { ...picks, qty: 1 });
  const totalPrice = linePrice(item, catalog.optionGroups, { ...picks, qty: lineQty });
  const soldOutProblem = problems.some((p) => p.code === 'sold_out' || p.code === 'sold_out_today');
  const soldOutWords = soldOutProblem
    ? activeVariant.availability === 'sold_out_today' && activeVariant.soldOutUntil
      ? orderFlowWords.soldOutBack(openingWhen(activeVariant.soldOutUntil, now))
      : orderFlowWords.soldOut
    : null;
  const itemSoldOut = itemSoldOutLabel(item, stockAt);

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
    if (pending.current || soldOutProblem) return;
    pending.current = { itemId: item.id, ...picks, note: note.trim(), qty: lineQty };
    timer.current = setTimeout(() => {
      timer.current = null;
      latest.current.commit();
      latest.current.onClose();
    }, ADD_LOADING_MS + CHECK_MS);
  };

  // "+" on a Goes well item: added at once when it needs no choice, else it opens over this sheet.
  const handleCompanion = (companion: Item) => {
    if (!quickAdd(companion, { inBasket })) setCompanionId(companion.id);
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
    itemSoldOut || item.featured || item.isNew ? (
      <div className="flex flex-wrap gap-1.5">
        {itemSoldOut ? (
          <Badge variant="secondary" size="lg" radius="full" className="gap-1 pr-2 pl-1.5">
            <BanIcon aria-hidden="true" strokeWidth={2.5} />
            {itemSoldOut}
          </Badge>
        ) : null}
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

  // Edit a line of 2 or more (T127): change all of them, or just one.
  const editScope =
    edit && edit.qty > 1 ? (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">{orderFlowWords.editScope}</span>
        <ToggleGroup
          value={[scope]}
          onValueChange={(next) => {
            const picked = next[0];
            if (picked === 'all' || picked === 'one') setScope(picked);
          }}
          className="w-full"
        >
          <ToggleGroupItem
            value="all"
            variant="outline"
            className="h-11 flex-1 font-semibold aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground"
          >
            {orderFlowWords.editAll(edit.qty)}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="one"
            variant="outline"
            className="h-11 flex-1 font-semibold aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground"
          >
            {orderFlowWords.editOne}
          </ToggleGroupItem>
        </ToggleGroup>
        {scope === 'one' ? (
          <p className="text-sm text-muted-foreground">
            {orderFlowWords.editOneHint(edit.qty - 1)}
          </p>
        ) : null}
      </div>
    ) : null;

  const choices = (
    <>
      {editScope}
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

  // Pairings first, then other categories; never sold out or already in the basket (T127). Hidden when
  // editing a line or in a sheet opened over another one.
  const inBasketIds = new Set(basket.lines.map((l) => l.itemId));
  const goesWell =
    edit || nested ? null : (
      <>
        <ItemSheetGoesWellWith
          items={goesWellWith(catalog, [item], stockAt, { exclude: inBasketIds, limit: 4 })}
          categories={catalog.categories}
          onAdd={handleCompanion}
          onOpenItem={setCompanionId}
        />
        <ItemSheet
          slug={slug}
          catalog={catalog}
          itemId={companionId}
          onClose={() => setCompanionId(null)}
          now={now}
          nested
          inBasket={inBasket}
        />
      </>
    );

  // Choices soften as they scroll under the Add bar (Magic UI Progressive Blur, decision R38).
  const scrollEdge = <ProgressiveBlur position="bottom" height="2.5rem" />;

  const footer = (
    <ItemSheetFooter
      qty={lineQty}
      onQtyChange={setQty}
      qtyLocked={Boolean(edit && scope === 'one')}
      totalPrice={totalPrice}
      problems={problems}
      soldOut={soldOutWords}
      mode={edit ? 'update' : 'add'}
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
              {goesWell}
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
          {goesWell}
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
  now?: string | Date | null | undefined;
  // Edit this basket line (T127) instead of adding a new one.
  edit?: BasketLine | null | undefined;
  // Opened over another sheet or the basket (T127).
  nested?: boolean | undefined;
  inBasket?: boolean | undefined;
}

/** Item sheet (redesign 6): bottom sheet on phones, photo-left dialog from tablets up. */
export function ItemSheet({
  slug,
  catalog,
  itemId,
  onClose,
  now: rawNow,
  edit = null,
  nested = false,
  inBasket = false,
}: ItemSheetProps) {
  const now = useMemo(() => rawNow ?? new Date(), [rawNow]);
  const isPhone = useFormFactor() === 'phone';

  const [prevItemId, setPrevItemId] = useState(itemId);
  const [activeItem, setActiveItem] = useState<Item | null>(() => {
    if (!itemId) return null;
    return catalog.items.find((i) => i.id === itemId && i.status === 'active') ?? null;
  });
  const [isOpen, setIsOpen] = useState(Boolean(itemId));
  const [activeEdit, setActiveEdit] = useState<BasketLine | null>(edit);

  if (prevItemId !== itemId) {
    setPrevItemId(itemId);
    if (itemId) {
      const found = catalog.items.find((i) => i.id === itemId && i.status === 'active') ?? null;
      if (found) {
        setActiveItem(found);
        setActiveEdit(edit);
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
      key={`${activeItem.id}|${activeEdit ? lineIdentity(activeEdit) : ''}`}
      slug={slug}
      item={activeItem}
      catalog={catalog}
      now={now}
      layout={isPhone ? 'sheet' : 'dialog'}
      onClose={() => handleOpenChange(false)}
      edit={activeEdit}
      nested={nested}
      inBasket={inBasket}
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
