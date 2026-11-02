import { useSearch } from '@tanstack/react-router';
import { useOwnerItem } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { ItemEditor } from '../item-editor.js';

export function NewCatalogItemScreen() {
  const { from, name } = useSearch({ strict: false });
  const { data: source, isLoading } = useOwnerItem(from);

  if (from && isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:p-6">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }
  // A copy of an item that is gone falls back to an empty new item.
  return (
    <ItemEditor key={source?.id ?? 'new'} initialItem={null} copyFrom={source} initialName={name} />
  );
}
