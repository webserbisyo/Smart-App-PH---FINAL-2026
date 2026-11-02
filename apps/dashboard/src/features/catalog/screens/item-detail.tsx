import { useParams, useNavigate } from '@tanstack/react-router';
import { useShop } from '@/app/shop';
import { AlertCircleIcon, ArrowLeftIcon, RefreshCwIcon } from 'lucide-react';
import { catalogWords, errorWords } from '@smartapp/core';
import { useOwnerItem, errorCodeOf } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Button } from '@smartapp/ui/components/button';
import { PageEmpty } from '@/app/page-state';
import { ItemEditor } from '../item-editor.js';

export function CatalogItemScreen() {
  const { itemId } = useParams({ strict: false });
  const navigate = useNavigate();
  const { kind } = useShop();

  const { data: item, isLoading, error, refetch } = useOwnerItem(itemId ?? '');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <Skeleton className="h-96 rounded-2xl md:col-span-8" />
          <Skeleton className="h-96 rounded-2xl md:col-span-4" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <PageEmpty
        className="min-h-80 p-6"
        icon={<AlertCircleIcon className="text-destructive" />}
        title={error ? catalogWords.loadFailed : catalogWords.itemNotFound}
        description={error ? errorWords(errorCodeOf(error)) : catalogWords.itemNotFoundHint}
        action={
          <>
            {error ? (
              <Button
                variant="outline"
                className="h-11 gap-1.5 md:h-9"
                onClick={() => void refetch()}
              >
                <RefreshCwIcon className="size-4" />
                {catalogWords.tryAgain}
              </Button>
            ) : null}
            <Button
              className="h-11 gap-1.5 font-semibold md:h-9"
              onClick={() => void navigate({ to: '/catalog' })}
            >
              <ArrowLeftIcon className="size-4" />
              {catalogWords.backToList(kind)}
            </Button>
          </>
        }
      />
    );
  }

  return <ItemEditor key={item.id} initialItem={item} />;
}
