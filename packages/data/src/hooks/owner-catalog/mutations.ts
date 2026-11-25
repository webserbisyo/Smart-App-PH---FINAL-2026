import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Availability,
  Category,
  CategoryDraft,
  ItemDraft,
  ItemStatus,
  OptionGroupDraft,
  OwnerItem,
  SaveVariantTemplateInput,
  SortOrderInput,
  UploadKind,
} from '@smartapp/core';
import { errorWords } from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
import { ApiRequestError } from '../../api-client';
import { ownerHomeQk } from '../owner-home/qk';
import { ownerSettingsQk } from '../owner-settings/qk';
import { ownerCatalogQk } from './qk';

export function useSaveCategory() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: CategoryDraft) => ownerCatalog.saveCategory(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.categories() });
    },
  });
}

export function useRemoveCategory() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => ownerCatalog.removeCategory(input),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.categories() });
      const previous = qc.getQueryData<Category[]>(ownerCatalogQk.categories());
      if (previous) {
        qc.setQueryData<Category[]>(
          ownerCatalogQk.categories(),
          previous.filter((c) => c.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.categories(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.categories() });
    },
  });
}

export function useSaveItem() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { id?: string; draft: ItemDraft }) => ownerCatalog.saveItem(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useRemoveItem() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => ownerCatalog.removeItem(input),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
      const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
      if (previous) {
        qc.setQueryData<OwnerItem[]>(
          ownerCatalogQk.items(),
          previous.filter((i) => i.id !== id),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.items(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useSetItemStatus() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; status: ItemStatus }) => ownerCatalog.setItemStatus(input),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
      const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
      if (previous) {
        qc.setQueryData<OwnerItem[]>(
          ownerCatalogQk.items(),
          previous.map((item) => (item.id === id ? { ...item, status } : item)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.items(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useSetSoldOut() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      variantId: string;
      availability: Availability;
      soldOutUntil?: string | null;
    }) => ownerCatalog.setSoldOut(input),
    onMutate: async ({ variantId, availability, soldOutUntil }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
      const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
      if (previous) {
        qc.setQueryData<OwnerItem[]>(
          ownerCatalogQk.items(),
          previous.map((item) => {
            const hasVariant = item.variants.some((v) => v.id === variantId);
            if (!hasVariant) return item;
            return {
              ...item,
              variants: item.variants.map((v) =>
                v.id === variantId ? { ...v, availability, soldOutUntil: soldOutUntil ?? null } : v,
              ),
            };
          }),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.items(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useSaveOptionGroup() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: OptionGroupDraft) => ownerCatalog.saveOptionGroup(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.optionGroups() });
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useRemoveOptionGroup() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => ownerCatalog.removeOptionGroup(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.optionGroups() });
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useSaveVariantTemplate() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveVariantTemplateInput) => ownerCatalog.saveVariantTemplate(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.variantTemplates() });
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useRemoveVariantTemplate() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string }) => ownerCatalog.removeVariantTemplate(input),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.variantTemplates() });
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useSaveSortOrder() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: SortOrderInput) => ownerCatalog.saveSortOrder(input),
    onMutate: async (input) => {
      if (input.kind === 'category') {
        await qc.cancelQueries({ queryKey: ownerCatalogQk.categories() });
        const previous = qc.getQueryData<Category[]>(ownerCatalogQk.categories());
        if (previous) {
          const map = new Map(previous.map((c) => [c.id, c]));
          const sorted: Category[] = [];
          input.ids.forEach((id, idx) => {
            const cat = map.get(id);
            if (cat) {
              sorted.push({ ...cat, sort: idx });
              map.delete(id);
            }
          });
          for (const rem of map.values()) {
            sorted.push(rem);
          }
          qc.setQueryData<Category[]>(ownerCatalogQk.categories(), sorted);
        }
        return { previousCategories: previous };
      }
      if (input.kind === 'item') {
        await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
        const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
        if (previous) {
          const map = new Map(previous.map((i) => [i.id, i]));
          const sorted: OwnerItem[] = [];
          for (const id of input.ids) {
            const item = map.get(id);
            if (item) {
              sorted.push(item);
              map.delete(id);
            }
          }
          for (const rem of map.values()) {
            sorted.push(rem);
          }
          qc.setQueryData<OwnerItem[]>(ownerCatalogQk.items(), sorted);
        }
        return { previousItems: previous };
      }
      return {};
    },
    onError: (_err, _vars, context) => {
      if (context?.previousCategories) {
        qc.setQueryData(ownerCatalogQk.categories(), context.previousCategories);
      }
      if (context?.previousItems) {
        qc.setQueryData(ownerCatalogQk.items(), context.previousItems);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.all });
    },
  });
}

/** Asks for room and a signed upload (T66): `bytes` is the size after shrinking. The meter moves after. */
export function useCreateUploadUrl() {
  const { uploads } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { kind: UploadKind; bytes?: number | undefined }) =>
      uploads.createUploadUrl(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ownerSettingsQk.storage() }),
  });
}

/** What an upload gives the screen: the ref to save, and whether it only lives on this phone (sample data). */
export interface SentUpload {
  ref: string;
  bytes: number;
  sample: boolean;
}

/**
 * One owner picture, all three steps (T116): room and a signed place, the file sent straight to storage,
 * then the confirm that checks it and counts it. On sample data the pretend place takes no file.
 */
export function useUploadImage() {
  const { uploads } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { kind: UploadKind; blob: Blob }): Promise<SentUpload> => {
      const target = await uploads.createUploadUrl({ kind: input.kind, bytes: input.blob.size });
      const sample = target.uploadUrl.startsWith('mock://');
      if (!sample) {
        let response: Response;
        try {
          response = await fetch(target.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': input.blob.type, 'x-upsert': 'false' },
            body: input.blob,
          });
        } catch {
          throw new ApiRequestError({ status: 0, code: 'offline', message: errorWords('offline') });
        }
        if (!response.ok) {
          throw new ApiRequestError({
            status: response.status,
            code: 'unknown',
            message: errorWords('unknown'),
          });
        }
      }
      const done = await uploads.confirmUpload({ id: target.id });
      return { ref: done.ref, bytes: done.bytes, sample };
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ownerSettingsQk.storage() }),
  });
}

export function useBulkSetSoldOut() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    // One request, all or nothing (Q7, T117).
    mutationFn: (input: {
      items: { variantId: string; availability: Availability; soldOutUntil?: string | null }[];
    }) =>
      ownerCatalog.bulkItems({
        action: 'soldOut',
        variants: input.items.map((item) => ({
          variantId: item.variantId,
          availability: item.availability,
          soldOutUntil: item.soldOutUntil ?? null,
        })),
      }),
    onMutate: async ({ items }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
      const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
      if (previous) {
        const itemMap = new Map(items.map((i) => [i.variantId, i]));
        qc.setQueryData<OwnerItem[]>(
          ownerCatalogQk.items(),
          previous.map((item) => ({
            ...item,
            variants: item.variants.map((v) => {
              const target = itemMap.get(v.id);
              if (!target) return v;
              return {
                ...v,
                availability: target.availability,
                soldOutUntil: target.soldOutUntil ?? null,
              };
            }),
          })),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.items(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useBulkSetItemStatus() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { itemIds: string[]; status: ItemStatus }) =>
      ownerCatalog.bulkItems({ action: 'status', ids: input.itemIds, status: input.status }),
    onMutate: async ({ itemIds, status }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
      const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
      if (previous) {
        const idSet = new Set(itemIds);
        qc.setQueryData<OwnerItem[]>(
          ownerCatalogQk.items(),
          previous.map((item) => (idSet.has(item.id) ? { ...item, status } : item)),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.items(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}

export function useBulkMoveCategory() {
  const { ownerCatalog } = useAdapters();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (input: { items: OwnerItem[]; targetCategoryId: string }) =>
      ownerCatalog.bulkItems({
        action: 'move',
        ids: input.items.map((item) => item.id),
        categoryId: input.targetCategoryId,
      }),
    onMutate: async ({ items, targetCategoryId }) => {
      await qc.cancelQueries({ queryKey: ownerCatalogQk.items() });
      const previous = qc.getQueryData<OwnerItem[]>(ownerCatalogQk.items());
      if (previous) {
        const idSet = new Set(items.map((i) => i.id));
        qc.setQueryData<OwnerItem[]>(
          ownerCatalogQk.items(),
          previous.map((item) =>
            idSet.has(item.id) ? { ...item, categoryId: targetCategoryId } : item,
          ),
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        qc.setQueryData(ownerCatalogQk.items(), context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ownerCatalogQk.items() });
      qc.invalidateQueries({ queryKey: ownerHomeQk.all });
    },
  });
}
