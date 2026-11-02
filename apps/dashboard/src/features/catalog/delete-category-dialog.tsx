import * as React from 'react';
import { actionWords, catalogWords, errorWords, type Category } from '@smartapp/core';
import {
  useBulkMoveCategory,
  useOwnerCategories,
  useOwnerItems,
  useRemoveCategory,
  errorCodeOf,
} from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@smartapp/ui/components/select';
import { Label } from '@smartapp/ui/components/label';
import { notify } from '@smartapp/ui/compositions/notify';
import { AsyncButton, useAsyncAction } from '@/app/async-button';

export interface DeleteCategoryDialogProps {
  category: Category | null;
  onOpenChange: (open: boolean) => void;
  onDeleted?: (() => void) | undefined;
}

// Deleting a category that still has items asks where they go first (finding E1), then moves them
// and deletes it, so the delete never fails after the owner confirmed.
export function DeleteCategoryDialog({
  category,
  onOpenChange,
  onDeleted,
}: DeleteCategoryDialogProps) {
  const { data: categories = [] } = useOwnerCategories();
  const { data: items = [] } = useOwnerItems();
  const moveItems = useBulkMoveCategory();
  const removeCategory = useRemoveCategory();
  const [targetId, setTargetId] = React.useState<string | null>(null);

  const inCategory = category ? items.filter((item) => item.categoryId === category.id) : [];
  const others = categories.filter((c) => c.id !== category?.id);
  const target = targetId ?? others[0]?.id ?? null;
  const needsMove = inCategory.length > 0;
  const blocked = needsMove && others.length === 0;
  const deleteAction = useAsyncAction();
  const visibleCount = inCategory.filter((item) => item.status !== 'archived').length;

  const handleDelete = async () => {
    if (!category || blocked) return;
    try {
      await deleteAction.run(async () => {
        if (needsMove && target) {
          await moveItems.mutateAsync({ items: inCategory, targetCategoryId: target });
        }
        await removeCategory.mutateAsync({ id: category.id });
      });
      notify({ title: catalogWords.categoryDeleted(category.name), tone: 'success' });
      onOpenChange(false);
      onDeleted?.();
    } catch (err: unknown) {
      notify({ title: errorWords(errorCodeOf(err)), tone: 'error' });
    }
  };

  return (
    <AlertDialog open={category !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {category ? catalogWords.deleteCategoryTitle(category.name) : null}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {!needsMove
              ? catalogWords.deleteCategoryEmpty
              : blocked
                ? catalogWords.deleteCategoryOnly
                : catalogWords.deleteCategoryMove(Math.max(visibleCount, 1))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {needsMove && !blocked ? (
          <div className="space-y-1.5">
            <Label htmlFor="delete-category-target">{catalogWords.moveTo}</Label>
            <Select value={target ?? ''} onValueChange={(value) => setTargetId(value ?? null)}>
              <SelectTrigger
                id="delete-category-target"
                className="w-full bg-card data-size-default:h-11 md:data-size-default:h-9"
              >
                <SelectValue placeholder={catalogWords.selectCategory}>
                  {(value: unknown) => others.find((c) => c.id === value)?.name ?? null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {others.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="min-h-11 md:min-h-8">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 md:h-9">{catalogWords.cancel}</AlertDialogCancel>
          {!blocked ? (
            <AsyncButton
              variant="destructive"
              status={deleteAction.status}
              busyLabel={needsMove ? actionWords.moving : actionWords.deleting}
              doneLabel={actionWords.deleted}
              onClick={() => void handleDelete()}
              className="h-11 font-semibold md:h-9"
            >
              {needsMove ? catalogWords.moveAndDelete : catalogWords.delete}
            </AsyncButton>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
