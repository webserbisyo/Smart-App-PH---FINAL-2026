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
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { notify } from '@smartapp/ui/compositions/notify';
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
  // Called with the saved category, e.g. so the item editor can pick a category it just made.
  onSaved?: ((category: Category) => void) | undefined;
}

// Category form: a dialog on tablet and desktop, a bottom drawer on phone.
export function CategorySheet({ open, onOpenChange, category, onSaved }: CategorySheetProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? catalogWords.editCategory : catalogWords.addCategory}
      description={catalogWords.categorySheetDesc}
      scroll
    >
      {open ? (
        <CategoryForm
          key={category ? category.id : 'new'}
          category={category}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      ) : null}
    </ResponsiveDialog>
  );
}

function CategoryForm({
  category,
  onSaved,
  onClose,
}: {
  category?: Category | null | undefined;
  onSaved?: ((category: Category) => void) | undefined;
  onClose: () => void;
}) {
  const [name, setName] = React.useState(category?.name ?? '');
  const [selectedIcon, setSelectedIcon] = React.useState<CategoryIconType>(() => {
    if (!category?.icon) return { kind: 'fluent', key: 'other', style: 'flat' };
    if (typeof category.icon === 'string') {
      const parsed = IconKeyEnum.safeParse(category.icon);
      return { kind: 'fluent', key: parsed.success ? parsed.data : 'other', style: 'flat' };
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
      setErrorMsg(catalogWords.categoryNameRequired);
      return;
    }
    try {
      const saved = await saveCategory.mutateAsync(
        category
          ? { id: category.id, name: trimmed, icon: selectedIcon }
          : { name: trimmed, icon: selectedIcon },
      );
      notify({ title: catalogWords.savedToast(saved.name), tone: 'success' });
      onSaved?.(saved);
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

  const iconName =
    selectedIcon.kind === 'fluent'
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
        : catalogWords.customImage;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {errorMsg ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {errorMsg}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="category-name">{catalogWords.categoryNameLabel}</Label>
          <span className="text-xs text-muted-foreground tabular">
            {catalogWords.charCount(name.length, 40)}
          </span>
        </div>
        <Input
          id="category-name"
          value={name}
          maxLength={40}
          className="h-11 md:h-9"
          placeholder={catalogWords.categoryNamePlaceholder}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{catalogWords.categoryIconLabel}</Label>
        <button
          type="button"
          onClick={() => setIconDialogOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-border/80 bg-muted/20 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card shadow-xs">
            <CategoryIcon
              icon={selectedIcon}
              size={32}
              assetOrigin={env.VITE_STOREFRONT_URL}
              className="size-8 object-contain"
              textClassName="text-3xl"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-sm font-semibold text-foreground capitalize">
              {iconName}
            </span>
            <span className="text-sm text-primary">{catalogWords.changeIcon}</span>
          </span>
        </button>
      </div>

      <ResponsiveDialogFooter>
        <div className="flex items-center justify-between gap-2">
          {category ? (
            <Button
              type="button"
              variant="ghost"
              className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9"
              disabled={removeCategory.isPending}
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {catalogWords.delete}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onClose}>
              {catalogWords.cancel}
            </Button>
            <Button
              type="submit"
              disabled={saveCategory.isPending}
              className="h-11 min-w-24 font-semibold md:h-9"
            >
              {saveCategory.isPending ? catalogWords.saving : catalogWords.save}
            </Button>
          </div>
        </div>
      </ResponsiveDialogFooter>

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

      <CategoryIconDialog
        open={iconDialogOpen}
        onOpenChange={setIconDialogOpen}
        selectedIcon={selectedIcon}
        onSelect={setSelectedIcon}
      />
    </form>
  );
}
