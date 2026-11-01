import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  MoreVerticalIcon,
  PencilIcon,
  CopyIcon,
  EyeOffIcon,
  EyeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArchiveIcon,
  Trash2Icon,
  GripVerticalIcon,
  BanIcon,
} from 'lucide-react';
import {
  itemPriceLabel,
  words,
  type OwnerItem,
  type OwnerOptionGroup,
  type Availability,
} from '@smartapp/core';
import {
  useSetItemStatus,
  useSetSoldOut,
  useSaveItem,
  useRemoveItem,
} from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Badge } from '@smartapp/ui/components/badge';
import { Switch } from '@smartapp/ui/components/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@smartapp/ui/components/dialog';
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
import { BadgeOverflow } from '@smartapp/ui/components/badge-overflow';
import { CatalogPhoto } from './catalog-photo.js';
import { cn } from 'cn';

export interface ItemRowProps {
  item: OwnerItem;
  optionGroups?: OwnerOptionGroup[];
  isReordering?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

function computeSoldOutUntil(type: 'today' | 'indefinite'): string | null {
  if (type === 'today') {
    return new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  }
  return null;
}

export function ItemRow({
  item,
  optionGroups = [],
  isReordering = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  dragHandleProps,
}: ItemRowProps) {
  const navigate = useNavigate();
  const setStatus = useSetItemStatus();
  const setSoldOut = useSetSoldOut();
  const saveItem = useSaveItem();
  const removeItem = useRemoveItem();

  const [soldOutModalOpen, setSoldOutModalOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const isSoldOut = item.variants.every((v) => v.availability === 'sold_out');
  const isHidden = item.status === 'hidden';
  const isSample = item.sample;

  // Attached option groups
  const attachedGroups = React.useMemo(() => {
    return optionGroups.filter((g) => item.optionGroupIds.includes(g.id));
  }, [optionGroups, item.optionGroupIds]);

  const handleToggleSoldOut = (checked: boolean) => {
    if (checked) {
      if (item.variants.length > 1) {
        setSoldOutModalOpen(true);
      } else {
        const firstVar = item.variants[0];
        if (firstVar) {
          setSoldOut.mutate({
            variantId: firstVar.id,
            availability: 'sold_out',
            soldOutUntil: null,
          });
        }
      }
    } else {
      for (const v of item.variants) {
        setSoldOut.mutate({
          variantId: v.id,
          availability: 'available',
        });
      }
    }
  };

  const handleApplySoldOutChoice = (type: 'today' | 'indefinite', variantId?: string) => {
    const availability: Availability = 'sold_out';
    const soldOutUntil = computeSoldOutUntil(type);

    if (variantId) {
      setSoldOut.mutate({ variantId, availability, soldOutUntil });
    } else {
      for (const v of item.variants) {
        setSoldOut.mutate({ variantId: v.id, availability, soldOutUntil });
      }
    }
    setSoldOutModalOpen(false);
  };

  const handleToggleVisible = (checked: boolean) => {
    setStatus.mutate({
      id: item.id,
      status: checked ? 'active' : 'hidden',
    });
  };

  const handleDuplicate = () => {
    saveItem.mutate({
      draft: {
        categoryId: item.categoryId,
        name: `${item.name} (Copy)`,
        description: item.description,
        photos: item.photos,
        axes: item.axes,
        variants: item.variants.map((v, i) => ({
          id: `var_${Math.random().toString(36).slice(2, 9)}_${i}`,
          values: v.values,
          price: v.price,
          availability: v.availability,
          soldOutUntil: v.soldOutUntil,
        })),
        optionGroupIds: item.optionGroupIds,
        pairingIds: item.pairingIds,
        featured: item.featured,
        isNew: item.isNew,
        status: 'hidden',
      },
    });
  };

  const handleArchive = () => {
    setStatus.mutate({
      id: item.id,
      status: 'archived',
    });
  };

  const handleDelete = () => {
    removeItem.mutate({ id: item.id });
    setDeleteConfirmOpen(false);
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center justify-between gap-3 p-3.5 rounded-2xl border bg-card transition-all duration-180',
          isSoldOut ? 'opacity-65 border-border/50' : 'border-border/80 hover:border-primary/40 hover:shadow-xs',
        )}
      >
        {/* Left: Reorder Handle or Item Thumbnail & Name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {isReordering ? (
            <div {...dragHandleProps} className="text-muted-foreground hover:text-foreground cursor-grab p-1">
              <GripVerticalIcon className="size-5" />
            </div>
          ) : null}

          {/* 56px square photo */}
          <div className="relative shrink-0">
            <CatalogPhoto
              photoRef={item.photos[0] ?? null}
              alt={item.name}
              size="md"
              className={cn('size-14 rounded-xl', isSoldOut && 'grayscale')}
            />
            {isSample && (
              <Badge
                variant="outline"
                className="absolute -top-1.5 -left-1.5 px-1 py-0 text-xs font-semibold uppercase bg-background shadow-xs"
              >
                {words.screens.catalog.sampleBadge}
              </Badge>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground line-clamp-2 tracking-tight">
                {item.name}
              </h3>
              {item.featured && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5 font-medium">
                  {words.screens.catalog.featuredLabel}
                </Badge>
              )}
              {item.isNew && (
                <Badge variant="outline" className="text-xs py-0 px-1.5 text-muted-foreground">
                  {words.screens.catalog.newLabel}
                </Badge>
              )}
              {isSoldOut && (
                <Badge
                  variant="destructive"
                  className="text-xs py-0 px-1.5 font-medium"
                >
                  <BanIcon className="size-3 mr-1" />
                  {words.screens.catalog.statSoldOut}
                </Badge>
              )}
            </div>

            {/* Add-on groups badge-overflow */}
            {attachedGroups.length > 0 && (
              <div className="pt-0.5">
                <BadgeOverflow
                  items={attachedGroups}
                  getBadgeLabel={(g) => g.name}
                  lineCount={1}
                  className="max-w-44 sm:max-w-64"
                  renderBadge={(g) => (
                    <Badge key={g.id} variant="outline" className="text-xs py-0 px-1 text-muted-foreground font-normal">
                      {g.name}
                    </Badge>
                  )}
                  renderOverflow={(count) => (
                    <Badge variant="secondary" className="text-xs py-0 px-1 font-mono">
                      +{count}
                    </Badge>
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Price & Status Controls */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Right-aligned tabular price */}
          <div className="text-right">
            <span className="font-bold text-sm font-mono tracking-tight text-foreground">
              {itemPriceLabel(item)}
            </span>
          </div>

          {/* Sold Out Switch with 44px touch area */}
          <div className="flex items-center gap-1.5">
            <label htmlFor={`sold-out-${item.id}`} className="sr-only">
              {words.screens.catalog.statSoldOut}
            </label>
            <div className="flex items-center justify-center size-11">
              <Switch
                id={`sold-out-${item.id}`}
                checked={isSoldOut}
                onCheckedChange={handleToggleSoldOut}
                aria-label={words.screens.catalog.statSoldOut}
              />
            </div>
          </div>

          {/* Visible Switch with 44px touch area */}
          <div className="hidden sm:flex items-center justify-center size-11">
            <Switch
              id={`visible-${item.id}`}
              checked={!isHidden}
              onCheckedChange={handleToggleVisible}
              aria-label={words.screens.catalog.visibleLabel}
            />
          </div>
        </div>

        {/* More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                aria-label={words.screens.catalog.moreActions}
              />
            }
          >
            <MoreVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate({ to: `/catalog/$itemId`, params: { itemId: item.id } })}>
              <PencilIcon className="size-4 mr-2" />
              {words.screens.catalog.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDuplicate}>
              <CopyIcon className="size-4 mr-2" />
              {words.screens.catalog.duplicate}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleVisible(isHidden)}>
              {isHidden ? <EyeIcon className="size-4 mr-2" /> : <EyeOffIcon className="size-4 mr-2" />}
              {isHidden ? words.screens.catalog.show : words.screens.catalog.hide}
            </DropdownMenuItem>

            {canMoveUp && onMoveUp && (
              <DropdownMenuItem onClick={onMoveUp}>
                <ChevronUpIcon className="size-4 mr-2" />
                {words.screens.catalog.moveUp}
              </DropdownMenuItem>
            )}
            {canMoveDown && onMoveDown && (
              <DropdownMenuItem onClick={onMoveDown}>
                <ChevronDownIcon className="size-4 mr-2" />
                {words.screens.catalog.moveDown}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {item.hasOrders ? (
              <DropdownMenuItem onClick={handleArchive}>
                <ArchiveIcon className="size-4 mr-2 text-warning-text" />
                {words.screens.catalog.archive}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2Icon className="size-4 mr-2" />
                {words.screens.catalog.delete}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sold Out Modal Choice (Back tomorrow vs Until turned on) */}
      <Dialog open={soldOutModalOpen} onOpenChange={setSoldOutModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{words.screens.catalog.soldOutTitle}</DialogTitle>
            <DialogDescription>
              {words.screens.catalog.soldOutDescription}
            </DialogDescription>
          </DialogHeader>

          {item.variants.length > 1 ? (
            <div className="space-y-3 py-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {words.screens.catalog.selectVariantsSoldOut}
              </span>
              <div className="space-y-2">
                {item.variants.map((v) => {
                  const varSoldOut = v.availability === 'sold_out';
                  return (
                    <div key={v.id} className="flex items-center justify-between p-2 rounded-lg border border-border/60">
                      <span className="text-sm font-medium">{v.values.join(' / ')}</span>
                      <Button
                        size="sm"
                        variant={varSoldOut ? 'destructive' : 'outline'}
                        className="text-xs h-7"
                        onClick={() => handleApplySoldOutChoice(varSoldOut ? 'indefinite' : 'today', v.id)}
                      >
                        {varSoldOut ? 'Mark Available' : 'Mark Sold Out'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 py-3">
              <button
                type="button"
                onClick={() => handleApplySoldOutChoice('today')}
                className="w-full text-left p-3 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/40 transition-colors"
              >
                <p className="font-semibold text-sm text-foreground">
                  {words.screens.catalog.soldOutToday}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {words.screens.catalog.soldOutTodayDesc}
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleApplySoldOutChoice('indefinite')}
                className="w-full text-left p-3 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/40 transition-colors"
              >
                <p className="font-semibold text-sm text-foreground">
                  {words.screens.catalog.soldOutIndefinitely}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {words.screens.catalog.soldOutIndefinitelyDesc}
                </p>
              </button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSoldOutModalOpen(false)}>
              {words.screens.catalog.cancel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {words.screens.catalog.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
