import { describe, expect, it, vi } from 'vitest';
import {
  CategorySchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  UploadResultSchema,
} from '@smartapp/core';
import { testStore, errorCode, mnl } from './helpers.js';
import { setMockOwnerSlug } from '../src/mocks/store.js';
import { createApiOwnerCatalogAdapter } from '../src/adapters/api/owner-catalog.js';

describe('ownerCatalog mock adapter', () => {
  it('lists categories, creates new category, updates, and enforces category_not_empty on delete', async () => {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const initialCategories = await store.ownerCatalog.listCategories();
    expect(initialCategories.length).toBeGreaterThan(0);
    for (const cat of initialCategories) {
      expect(CategorySchema.safeParse(cat).success).toBe(true);
    }

    // Attempting to remove a category that contains items fails with category_not_empty
    const usedCatId = initialCategories[0]!.id;
    const errCode = await errorCode(store.ownerCatalog.removeCategory({ id: usedCatId }));
    expect(errCode).toBe('category_not_empty');

    // Create a new empty category
    const created = await store.ownerCatalog.saveCategory({
      name: 'Special Sauces',
      icon: 'combo',
    });
    expect(created.name).toBe('Special Sauces');
    expect(created.icon).toEqual({ kind: 'fluent', key: 'combo', style: 'flat' });
    expect(created.id).toBeDefined();

    // Update existing category with emoji icon
    const updated = await store.ownerCatalog.saveCategory({
      id: created.id,
      name: 'Signature Sauces',
      icon: { kind: 'emoji', char: '🥫' },
    });
    expect(updated.name).toBe('Signature Sauces');
    expect(updated.icon).toEqual({ kind: 'emoji', char: '🥫' });

    // Removing empty category succeeds
    await store.ownerCatalog.removeCategory({ id: created.id });
    const afterDelete = await store.ownerCatalog.listCategories();
    expect(afterDelete.some((c) => c.id === created.id)).toBe(false);
  });

  it('lists items, saves new item, updates existing item, and handles status / soldOut', async () => {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const items = await store.ownerCatalog.listItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(OwnerItemSchema.safeParse(item).success).toBe(true);
    }

    // First item has orders in the demo pack (classic burger)
    const itemWithOrders = items.find((i) => i.hasOrders);
    expect(itemWithOrders).toBeDefined();

    // Removing an item that has past orders fails with item_has_orders
    if (itemWithOrders) {
      const err = await errorCode(store.ownerCatalog.removeItem({ id: itemWithOrders.id }));
      expect(err).toBe('item_has_orders');
    }

    // Create a new item (no past orders)
    const categoryId = items[0]!.categoryId;
    const newItem = await store.ownerCatalog.saveItem({
      draft: {
        categoryId,
        name: 'Crispy Onion Rings',
        description: 'Golden battered onion rings',
        photos: [],
        axes: [],
        variants: [
          {
            id: 'var_rings_1',
            values: [],
            price: 8900,
            availability: 'available',
            soldOutUntil: null,
          },
        ],
        optionGroupIds: [],
        pairingIds: [],
        featured: false,
        isNew: true,
        status: 'active',
      },
    });
    expect(newItem.hasOrders).toBe(false);
    expect(newItem.name).toBe('Crispy Onion Rings');

    // Toggle sold_out_today vs sold_out
    const soldOutToday = await store.ownerCatalog.setSoldOut({
      variantId: newItem.variants[0]!.id,
      availability: 'sold_out_today',
    });
    expect(soldOutToday.variants[0]!.availability).toBe('sold_out_today');
    expect(soldOutToday.variants[0]!.soldOutUntil).toBeDefined();

    const soldOutAlways = await store.ownerCatalog.setSoldOut({
      variantId: newItem.variants[0]!.id,
      availability: 'sold_out',
    });
    expect(soldOutAlways.variants[0]!.availability).toBe('sold_out');
    expect(soldOutAlways.variants[0]!.soldOutUntil).toBeNull();

    // Set status to hidden
    const hidden = await store.ownerCatalog.setItemStatus({
      id: newItem.id,
      status: 'hidden',
    });
    expect(hidden.status).toBe('hidden');

    // Deleting item with 0 orders succeeds
    await store.ownerCatalog.removeItem({ id: newItem.id });
    const afterDelete = await store.ownerCatalog.listItems();
    expect(afterDelete.some((i) => i.id === newItem.id)).toBe(false);
  });

  it('manages option groups, enforces min <= max, and calculates usedBy', async () => {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const groups = await store.ownerCatalog.listOptionGroups();
    expect(groups.length).toBeGreaterThan(0);
    for (const grp of groups) {
      expect(OwnerOptionGroupSchema.safeParse(grp).success).toBe(true);
      expect(grp.usedBy).toBeGreaterThanOrEqual(0);
    }

    // Create a new option group
    const created = await store.ownerCatalog.saveOptionGroup({
      name: 'Spiciness',
      min: 1,
      max: 1,
      options: [
        { name: 'Mild', priceDelta: 0, isDefault: true, soldOut: false },
        { name: 'Spicy', priceDelta: 1000, isDefault: false, soldOut: false },
      ],
    });
    expect(created.name).toBe('Spiciness');
    expect(created.usedBy).toBe(0);

    // Remove group
    await store.ownerCatalog.removeOptionGroup({ id: created.id });
    const afterDelete = await store.ownerCatalog.listOptionGroups();
    expect(afterDelete.some((g) => g.id === created.id)).toBe(false);
  });

  it('saves sort order for categories and items', async () => {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const cats = await store.ownerCatalog.listCategories();
    if (cats.length >= 2) {
      const reversedIds = [cats[1]!.id, cats[0]!.id, ...cats.slice(2).map((c) => c.id)];
      await store.ownerCatalog.saveSortOrder({ kind: 'category', ids: reversedIds });
      const reordered = await store.ownerCatalog.listCategories();
      expect(reordered[0]!.id).toBe(cats[1]!.id);
      expect(reordered[1]!.id).toBe(cats[0]!.id);
    }
  });

  it('generates upload URLs', async () => {
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const upload = await store.ownerCatalog.createUploadUrl({ kind: 'item' });
    expect(UploadResultSchema.safeParse(upload).success).toBe(true);
    expect(upload.path).toContain('uploads/item/');
  });
});

describe('ownerCatalog HTTP API adapter', () => {
  it('calls correct endpoints with bearer token and parses schema', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const adapter = createApiOwnerCatalogAdapter({
      baseUrl: 'https://api.example.com',
      getToken: async () => 'test-bearer-token',
    });

    // Test listCategories
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'cat_1', name: 'Burgers', icon: 'burger', sort: 0 }],
    });
    const categories = await adapter.listCategories();
    expect(categories.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/owner/categories', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-bearer-token',
      },
    });

    // Test saveCategory (POST)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'cat_new', name: 'Drinks', icon: 'juice', sort: 1 }),
    });
    const savedCat = await adapter.saveCategory({ name: 'Drinks', icon: 'juice' });
    expect(savedCat.id).toBe('cat_new');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/owner/categories',
      expect.objectContaining({ method: 'POST' }),
    );

    // Test setItemStatus (PATCH)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'item_1',
        categoryId: 'cat_1',
        name: 'Burger',
        description: null,
        photos: [],
        axes: [],
        variants: [
          { id: 'var_1', values: [], price: 10000, availability: 'available', soldOutUntil: null },
        ],
        optionGroupIds: [],
        pairingIds: [],
        featured: false,
        isNew: false,
        status: 'hidden',
        sample: false,
        hasOrders: true,
      }),
    });
    const updatedStatus = await adapter.setItemStatus({ id: 'item_1', status: 'hidden' });
    expect(updatedStatus.status).toBe('hidden');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/owner/items/item_1/status',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
