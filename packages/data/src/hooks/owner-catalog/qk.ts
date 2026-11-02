// Query keys for the owner catalog
export const ownerCatalogQk = {
  all: ['owner-catalog'] as const,
  categories: () => ['owner-catalog', 'categories'] as const,
  items: () => ['owner-catalog', 'items'] as const,
  item: (id: string) => ['owner-catalog', 'items', id] as const,
  optionGroups: () => ['owner-catalog', 'option-groups'] as const,
  optionGroup: (id: string) => ['owner-catalog', 'option-groups', id] as const,
  variantTemplates: () => ['owner-catalog', 'variant-templates'] as const,
  variantTemplate: (id: string) => ['owner-catalog', 'variant-templates', id] as const,
};
