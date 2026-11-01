import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Availability,
  Category,
  CategoryDraft,
  ItemDraft,
  ItemStatus,
  OptionGroupDraft,
  OwnerItem,
  SortOrderInput,
  UploadKind,
} from '@smartapp/core';
import { useAdapters } from '../../adapters/index';
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

export function useCreateUploadUrl() {
  const { ownerCatalog } = useAdapters();

  return useMutation({
    mutationFn: (input: { kind: UploadKind }) => ownerCatalog.createUploadUrl(input),
  });
}
