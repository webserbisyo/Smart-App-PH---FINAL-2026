import * as React from 'react';
import {
  ICON_KEYS,
  iconPath,
  catalogWords,
  errorWords,
  type Category,
  type IconKey,
} from '@smartapp/core';
import { useSaveCategory, useRemoveCategory, errorCodeOf } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
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
import { env } from '@/app/env';
import { cn } from 'cn';

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
  const [selectedIcon, setSelectedIcon] = React.useState<IconKey>(category?.icon ?? 'burger');
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
          <SheetDescription>Organize your items into customer-facing categories.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSave} className="mt-6 flex flex-1 flex-col justify-between space-y-6">
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
                placeholder="e.g. Burgers, Drinks, Desserts"
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>{catalogWords.categoryIconLabel}</Label>
              <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-border/80 bg-muted/20 p-3">
                {ICON_KEYS.map((key) => {
                  const isSelected = selectedIcon === key;
                  const src = `${env.VITE_STOREFRONT_URL.replace(/\/+$/, '')}${iconPath(key)}`;

                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={`Select icon ${key}`}
                      onClick={() => setSelectedIcon(key)}
                      className={cn(
                        'flex size-11 items-center justify-center rounded-xl border p-1.5 transition-all',
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30'
                          : 'border-border/40 bg-card hover:bg-muted/60',
                      )}
                    >
                      <img src={src} alt={key} className="size-6 object-contain" loading="lazy" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <SheetFooter className="flex flex-row items-center justify-between gap-2 border-t border-border pt-4">
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
    </>
  );
}
