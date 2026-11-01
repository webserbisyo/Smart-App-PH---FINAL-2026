import { useQuery } from '@tanstack/react-query';
import { useAdapters } from '../../adapters/index';
import { ownerCatalogQk } from './qk';

export function useOwnerCategories() {
  const { ownerCatalog } = useAdapters();
  return useQuery({
    queryKey: ownerCatalogQk.categories(),
    queryFn: () => ownerCatalog.listCategories(),
  });
}

export function useOwnerItems() {
  const { ownerCatalog } = useAdapters();
  return useQuery({
    queryKey: ownerCatalogQk.items(),
    queryFn: () => ownerCatalog.listItems(),
  });
}

export function useOwnerItem(id: string | null | undefined) {
  const { data: items, isLoading, error, refetch } = useOwnerItems();
  const item = id && items ? items.find((i) => i.id === id) ?? null : null;
  return { data: item, isLoading, error, refetch };
}

export function useOwnerOptionGroups() {
  const { ownerCatalog } = useAdapters();
  return useQuery({
    queryKey: ownerCatalogQk.optionGroups(),
    queryFn: () => ownerCatalog.listOptionGroups(),
  });
}

export function useOwnerOptionGroup(id: string | null | undefined) {
  const { data: groups, isLoading, error, refetch } = useOwnerOptionGroups();
  const group = id && groups ? groups.find((g) => g.id === id) ?? null : null;
  return { data: group, isLoading, error, refetch };
}
