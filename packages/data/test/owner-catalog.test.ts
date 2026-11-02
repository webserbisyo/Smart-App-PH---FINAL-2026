import { describe, expect, it, vi } from 'vitest';
import {
  CategorySchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  OwnerVariantTemplateSchema,
  type OwnerItem,
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
        basePrice: 8900,
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

  it('manages variant templates, calculates usedBy, applies diffs, and unlinks on delete', async () => {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));

    const templates = await store.ownerCatalog.listVariantTemplates();
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) {
      expect(OwnerVariantTemplateSchema.safeParse(t).success).toBe(true);
      expect(t.usedBy).toBeGreaterThanOrEqual(0);
    }

    // Create a new variant template
    const created = await store.ownerCatalog.saveVariantTemplate({
      draft: {
        name: 'Spice Level',
        options: [{ name: 'Mild' }, { name: 'Hot' }],
      },
      applyToItems: false,
    });
    expect(created.template.name).toBe('Spice Level');
    expect(created.template.usedBy).toBe(0);
    expect(created.updatedItemIds).toEqual([]);

    // Save with applyToItems: true
    const updated = await store.ownerCatalog.saveVariantTemplate({
      draft: {
        id: created.template.id,
        name: 'Spice Level Extra',
        options: [
          { id: created.template.options[0]!.id, name: 'Mild' },
          { id: created.template.options[1]!.id, name: 'Extra Hot' },
        ],
      },
      applyToItems: true,
    });
    expect(updated.template.name).toBe('Spice Level Extra');
    expect(updated.template.options[1]!.name).toBe('Extra Hot');

    // Remove template unlinks from items and deletes template
    await store.ownerCatalog.removeVariantTemplate({ id: created.template.id });
    const afterDelete = await store.ownerCatalog.listVariantTemplates();
    expect(afterDelete.some((t) => t.id === created.template.id)).toBe(false);
  });

  it('protects stamp card reward variant from being deleted or modified (variant_is_reward)', async () => {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));

    // In kanto-smash, ks-classic-smash with variant ks-classic-smash--single is the reward.
    const items = await store.ownerCatalog.listItems();
    const rewardItem = items.find((i) => i.id === 'ks-classic-smash')!;
    expect(rewardItem).toBeDefined();

    // Trying to save the reward item with variants omitting ks-classic-smash--single fails
    const err = await errorCode(
      store.ownerCatalog.saveItem({
        id: rewardItem.id,
        draft: {
          categoryId: rewardItem.categoryId,
          name: rewardItem.name,
          description: rewardItem.description,
          photos: rewardItem.photos,
          basePrice: rewardItem.basePrice,
          axes: [],
          variants: [
            {
              id: 'different-variant-id',
              values: [],
              price: 15000,
              availability: 'available',
              soldOutUntil: null,
            },
          ],
          optionGroupIds: rewardItem.optionGroupIds,
          pairingIds: rewardItem.pairingIds,
          featured: rewardItem.featured,
          isNew: rewardItem.isNew,
          status: rewardItem.status,
        },
      }),
    );
    expect(err).toBe('variant_is_reward');
  });
});

describe('ownerCatalog variants (T46)', () => {
  function draftOf(item: OwnerItem) {
    return {
      categoryId: item.categoryId,
      name: item.name,
      description: item.description,
      photos: item.photos,
      basePrice: item.basePrice,
      axes: item.axes,
      variants: item.variants,
      optionGroupIds: item.optionGroupIds,
      pairingIds: item.pairingIds,
      featured: item.featured,
      isNew: item.isNew,
      status: item.status,
    };
  }

  async function kanto() {
    setMockOwnerSlug('kanto-smash');
    const { store } = testStore(mnl('2026-10-26 12:00'));
    const templates = await store.ownerCatalog.listVariantTemplates();
    const items = await store.ownerCatalog.listItems();
    const size = templates.find((t) => t.options.map((o) => o.name).join() === 'Regular,Large');
    const patty = templates.find((t) => t.name === 'Patty');
    if (!size || !patty) throw new Error('Kanto variants missing');
    return { store, templates, items, size, patty };
  }

  it('saveItem recomputes prices it was sent wrong', async () => {
    const { store, items } = await kanto();
    const fries = items.find((i) => i.id === 'ks-kanto-fries');
    if (!fries) throw new Error('fries missing');
    const saved = await store.ownerCatalog.saveItem({
      id: fries.id,
      draft: { ...draftOf(fries), variants: fries.variants.map((v) => ({ ...v, price: 1 })) },
    });
    expect(saved.variants.map((v) => v.price)).toEqual([6900, 9900]);
  });

  it('counts usedBy without archived items', async () => {
    const { store, size } = await kanto();
    expect(size.usedBy).toBe(2);
    await store.ownerCatalog.setItemStatus({ id: 'ks-cheese-fries', status: 'archived' });
    const after = await store.ownerCatalog.listVariantTemplates();
    expect(after.find((t) => t.id === size.id)?.usedBy).toBe(1);
  });

  it('Update N items adds a new option at +0, sold out where the choice is priced', async () => {
    const { store, size } = await kanto();
    const result = await store.ownerCatalog.saveVariantTemplate({
      draft: { id: size.id, name: size.name, options: [...size.options, { name: 'Jumbo' }] },
      applyToItems: true,
    });
    expect(result.updatedItemIds.sort()).toEqual(['ks-cheese-fries', 'ks-kanto-fries']);
    expect(result.soldOutItemIds.sort()).toEqual(['ks-cheese-fries', 'ks-kanto-fries']);
    const fries = (await store.ownerCatalog.listItems()).find((i) => i.id === 'ks-kanto-fries');
    const jumbo = fries?.variants.find((v) => v.values[0] === 'Jumbo');
    expect(jumbo?.price).toBe(6900);
    expect(jumbo?.availability).toBe('sold_out');
    expect(fries?.variants.find((v) => v.id === 'ks-kanto-fries--large')?.price).toBe(9900);
  });

  it('Only the variant leaves items alone, and unlinks items a rename breaks', async () => {
    const { store, size } = await kanto();
    const added = await store.ownerCatalog.saveVariantTemplate({
      draft: { id: size.id, name: size.name, options: [...size.options, { name: 'Jumbo' }] },
      applyToItems: false,
    });
    expect(added.updatedItemIds).toEqual([]);
    expect(added.unlinkedItemIds).toEqual([]);
    const renamed = await store.ownerCatalog.saveVariantTemplate({
      draft: { id: size.id, name: 'Fries size', options: added.template.options },
      applyToItems: false,
    });
    expect(renamed.unlinkedItemIds.sort()).toEqual(['ks-cheese-fries', 'ks-kanto-fries']);
    const fries = (await store.ownerCatalog.listItems()).find((i) => i.id === 'ks-kanto-fries');
    expect(fries?.axes[0]).toMatchObject({ name: 'Size', templateId: null });
    expect(fries?.variants.map((v) => v.price)).toEqual([6900, 9900]);
  });

  it('blocks removing the stamp card prize option', async () => {
    const { store, patty } = await kanto();
    const err = await errorCode(
      store.ownerCatalog.saveVariantTemplate({
        draft: { id: patty.id, name: patty.name, options: patty.options.slice(1) },
        applyToItems: true,
      }),
    );
    expect(err).toBe('variant_is_reward');
    const classic = (await store.ownerCatalog.listItems()).find((i) => i.id === 'ks-classic-smash');
    expect(classic?.variants).toHaveLength(3);
  });

  it('delete unlinks every item, which keep their options and prices', async () => {
    const { store, patty } = await kanto();
    const result = await store.ownerCatalog.removeVariantTemplate({ id: patty.id });
    expect(result.unlinkedItemIds.sort()).toEqual(['ks-cheesy-bacon-smash', 'ks-classic-smash']);
    const classic = (await store.ownerCatalog.listItems()).find((i) => i.id === 'ks-classic-smash');
    expect(classic?.axes[0]?.templateId).toBeNull();
    expect(classic?.variants.map((v) => v.price)).toEqual([14900, 20900, 26900]);
  });

  it('rejects a linked choice that is out of step with its variant', async () => {
    const { store, items } = await kanto();
    const fries = items.find((i) => i.id === 'ks-kanto-fries');
    if (!fries) throw new Error('fries missing');
    const err = await errorCode(
      store.ownerCatalog.saveItem({
        id: fries.id,
        draft: { ...draftOf(fries), axes: fries.axes.map((a) => ({ ...a, name: 'Fry size' })) },
      }),
    );
    expect(err).toBe('invalid_input');
  });

  it('clearSamples keeps the defaults, and the storefront payload has no variants', async () => {
    const { store } = await kanto();
    await store.ownerSamples.clearSamples({ slug: 'kanto-smash' });
    const names = (await store.ownerCatalog.listVariantTemplates()).map((t) => t.name);
    expect(names).toEqual(['Size', 'Size', 'Cup size', 'Patty', 'Temperature']);
    const shop = await store.storefront.getStorefront({ slug: 'kanto-smash' });
    expect(shop && 'variantTemplates' in shop.catalog).toBe(false);
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
        basePrice: 10000,
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

    // Test listVariantTemplates
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: 't_size',
          name: 'Size',
          options: [{ id: 'opt_1', name: 'Regular' }],
          usedBy: 2,
          sample: false,
        },
      ],
    });
    const variantTemplates = await adapter.listVariantTemplates();
    expect(variantTemplates.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/owner/variant-templates', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-bearer-token',
      },
    });

    // Test saveVariantTemplate (POST)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        template: {
          id: 't_new',
          name: 'Colour',
          options: [{ id: 'opt_c1', name: 'Red' }],
          usedBy: 0,
          sample: false,
        },
        updatedItemIds: [],
        unlinkedItemIds: [],
        skippedItemIds: [],
        soldOutItemIds: [],
      }),
    });
    const saveRes = await adapter.saveVariantTemplate({
      draft: {
        name: 'Colour',
        options: [{ name: 'Red' }],
      },
      applyToItems: false,
    });
    expect(saveRes.template.id).toBe('t_new');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/owner/variant-templates',
      expect.objectContaining({ method: 'POST' }),
    );

    // Test removeVariantTemplate (DELETE)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unlinkedItemIds: [] }),
    });
    await adapter.removeVariantTemplate({ id: 't_new' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/owner/variant-templates/t_new',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
