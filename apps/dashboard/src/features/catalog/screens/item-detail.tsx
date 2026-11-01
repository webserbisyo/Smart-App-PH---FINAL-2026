import { useParams, useNavigate } from '@tanstack/react-router';
import { AlertCircleIcon, ArrowLeftIcon, RefreshCwIcon } from 'lucide-react';
import { words, errorWords } from '@smartapp/core';
import { useOwnerItem, errorCodeOf } from '@smartapp/data';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Button } from '@smartapp/ui/components/button';
import { ItemEditor } from '../item-editor.js';

export function CatalogItemScreen() {
  const { itemId } = useParams({ strict: false });
  const navigate = useNavigate();

  const {
    data: item,
    isLoading,
    error,
    refetch,
  } = useOwnerItem(itemId ?? '');

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <Skeleton className="md:col-span-8 h-96 rounded-2xl" />
          <Skeleton className="md:col-span-4 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-80 p-6 text-center space-y-4 max-w-sm mx-auto">
        <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircleIcon className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {error ? 'Failed to load item' : 'Item not found'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {error
              ? errorWords(errorCodeOf(error))
              : 'The item you are looking for does not exist or has been removed.'}
          </p>
        </div>
        <div className="flex items-center gap-2 pt-2">
          {error && (
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCwIcon className="size-3.5 mr-1" />
              {words.screens.catalog.tryAgain}
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            onClick={() => navigate({ to: '/catalog' })}
          >
            <ArrowLeftIcon className="size-3.5 mr-1" />
            Back to catalog
          </Button>
        </div>
      </div>
    );
  }

  return <ItemEditor initialItem={item} />;
}
