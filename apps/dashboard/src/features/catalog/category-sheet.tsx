import * as React from 'react';
import {
  catalogWords,
  errorWords,
  IconKeyEnum,
  type Category,
  type CategoryIcon as CategoryIconType,
} from '@smartapp/core';
import { useSaveCategory, useRemoveCategory, errorCodeOf } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { CategoryIcon } from '@smartapp/ui/compositions/category-icon';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@smartapp/ui/components/sheet';
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
import { CategoryIconDialog } from './components/category-icon-dialog.js';
import { env } from '@/app/env';

export interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null | undefined;
}

export function CategorySheet({ open, onOpenChange, category }: CategorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? (
        <CategorySheetForm
          key={category ? category.id : 'new'}
          category={category}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </Sheet>
  );
}

function CategorySheetForm({
  category,
  onClose,
}: {
  category?: Category | null | undefined;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(category?.name ?? '');
  const [selectedIcon, setSelectedIcon] = React.useState<CategoryIconType>(() => {
    if (!category?.icon) return { kind: 'fluent', key: 'burger', style: 'flat' };
    if (typeof category.icon === 'string') {
      const parsed = IconKeyEnum.safeParse(category.icon);
      return { kind: 'fluent', key: parsed.success ? parsed.data : 'burger', style: 'flat' };
    }
    return category.icon;
  });
  const [iconDialogOpen, setIconDialogOpen] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);

  const saveCategory = useSaveCategory();
  const removeCategory = useRemoveCategory();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }

    try {
      if (category) {
        await saveCategory.mutateAsync({
          id: category.id,
          name: trimmed,
          icon: selectedIcon,
        });
      } else {
        await saveCategory.mutateAsync({
          name: trimmed,
          icon: selectedIcon,
        });
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    try {
      await removeCategory.mutateAsync({ id: category.id });
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err: unknown) {
      setDeleteConfirmOpen(false);
      setErrorMsg(errorWords(errorCodeOf(err)));
    }
  };

  return (
    <>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{category ? catalogWords.editCategory : catalogWords.addCategory}</SheetTitle>
          <SheetDescription>{catalogWords.categorySheetDesc}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="flex flex-1 flex-col justify-between space-y-6 px-4">
          <div className="space-y-5">
            {errorMsg && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive">
                {errorMsg}
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="category-name">{catalogWords.categoryNameLabel}</Label>
                <span className="font-mono text-xs text-muted-foreground">{name.length}/40</span>
              </div>
              <Input
                id="category-name"
                value={name}
                maxLength={40}
                placeholder={catalogWords.categoryNamePlaceholder}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>{catalogWords.categoryIconLabel}</Label>
              <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/20 p-3">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card shadow-xs">
                  <CategoryIcon
                    icon={selectedIcon}
                    size={32}
                    assetOrigin={env.VITE_STOREFRONT_URL}
                    className="size-8 object-contain"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="truncate text-xs font-semibold text-foreground">
                    {selectedIcon.kind === 'fluent'
                      ? catalogWords.fluentIconLabel(
                          selectedIcon.key,
                          {
                            flat: catalogWords.styleFlat,
                            color: catalogWords.styleColor,
                            '3d': catalogWords.style3d,
                          }[selectedIcon.style],
                        )
                      : selectedIcon.kind === 'emoji'
                        ? catalogWords.emojiLabel(selectedIcon.char)
                        : catalogWords.customImage}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 w-fit text-xs font-medium"
                    onClick={() => setIconDialogOpen(true)}
                  >
                    {catalogWords.iconDialogTitle}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="-mx-4 flex flex-row items-center justify-between gap-2 border-t border-border pt-4">
            {category ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="text-xs font-semibold"
                disabled={removeCategory.isPending}
                onClick={() => setDeleteConfirmOpen(true)}
              >
                {catalogWords.delete}
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {catalogWords.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saveCategory.isPending}
                className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {saveCategory.isPending ? catalogWords.saving : catalogWords.save}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{catalogWords.deleteCategoryConfirm}</AlertDialogTitle>
            <AlertDialogDescription>{catalogWords.confirmDeleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{catalogWords.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {catalogWords.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Icon Dialog */}
      <CategoryIconDialog
        open={iconDialogOpen}
        onOpenChange={setIconDialogOpen}
        selectedIcon={selectedIcon}
        onSelect={setSelectedIcon}
      />
    </>
  );
}
