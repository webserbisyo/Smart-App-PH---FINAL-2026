import { describe, expect, it } from 'vitest';
import {
  CategoryDraftSchema,
  errorWords,
  ItemDraftSchema,
  OptionGroupDraftSchema,
  OwnerItemSchema,
  OwnerOptionGroupSchema,
  groupRuleLabel,
  itemPriceLabel,
  SortKindEnum,
  UploadKindEnum,
} from '../src/index.js';

describe('owner catalog schemas', () => {
  it('validates OwnerItemSchema and enforces variants/axes and no self-pairing', () => {
    const validItem = {
      id: 'item_1',
      categoryId: 'cat_1',
      name: 'Classic Burger',
      description: 'Juicy patty with fresh lettuce',
      photos: ['demo:kanto-smash/items/classic'],
      basePrice: 15000,
      axes: [
        {
          name: 'Size',
          values: [
            { name: 'Regular', photo: null, priceDelta: 0 },
            { name: 'Double', photo: null, priceDelta: 7000 },
          ],
        },
      ],
      variants: [
        {
          id: 'var_1',
          values: ['Regular'],
          price: 15000,
          availability: 'available' as const,
          soldOutUntil: null,
        },
        {
          id: 'var_2',
          values: ['Double'],
          price: 22000,
          availability: 'available' as const,
          soldOutUntil: null,
        },
      ],
      optionGroupIds: ['grp_1'],
      pairingIds: ['item_2'],
      featured: true,
      isNew: false,
      status: 'active' as const,
      sample: true,
      hasOrders: false,
    };

    expect(OwnerItemSchema.safeParse(validItem).success).toBe(true);

    // Self-pairing fails
    const selfPairing = { ...validItem, pairingIds: ['item_1'] };
    expect(OwnerItemSchema.safeParse(selfPairing).success).toBe(false);

    // Mismatched variant values vs axes length fails
    const mismatchedVariant = {
      ...validItem,
      variants: [
        {
          id: 'var_1',
          values: ['Regular', 'Extra'], // 2 values for 1 axis
          price: 15000,
          availability: 'available' as const,
          soldOutUntil: null,
        },
      ],
    };
    expect(OwnerItemSchema.safeParse(mismatchedVariant).success).toBe(false);
  });

  it('validates ItemDraftSchema with and without id', () => {
    const draftWithoutId = {
      categoryId: 'cat_1',
      name: 'New Shake',
      description: null,
      photos: [],
      basePrice: 9900,
      axes: [],
      variants: [
        {
          id: 'var_new',
          values: [],
          price: 9900,
          availability: 'available' as const,
          soldOutUntil: null,
        },
      ],
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: true,
      status: 'active' as const,
    };

    expect(ItemDraftSchema.safeParse(draftWithoutId).success).toBe(true);

    const draftWithId = { ...draftWithoutId, id: 'item_shake' };
    expect(ItemDraftSchema.safeParse(draftWithId).success).toBe(true);

    // More than 5 photos fails
    const tooManyPhotos = {
      ...draftWithoutId,
      photos: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
    };
    expect(ItemDraftSchema.safeParse(tooManyPhotos).success).toBe(false);
  });

  it('validates OwnerOptionGroupSchema and enforces min <= max', () => {
    const validGroup = {
      id: 'grp_cheese',
      name: 'Cheese Level',
      min: 0,
      max: 2,
      options: [
        { id: 'opt_1', name: 'Single Cheddar', priceDelta: 2000, isDefault: false, soldOut: false },
        { id: 'opt_2', name: 'Double Cheddar', priceDelta: 3500, isDefault: false, soldOut: false },
      ],
      usedBy: 3,
    };

    expect(OwnerOptionGroupSchema.safeParse(validGroup).success).toBe(true);

    // min > max fails
    expect(OwnerOptionGroupSchema.safeParse({ ...validGroup, min: 3, max: 2 }).success).toBe(false);

    // min > options length fails
    expect(OwnerOptionGroupSchema.safeParse({ ...validGroup, min: 3, max: 4 }).success).toBe(false);
  });

  it('validates OptionGroupDraftSchema and CategoryDraftSchema', () => {
    const validCatDraft = {
      name: 'Beverages',
      icon: 'juice' as const,
    };
    expect(CategoryDraftSchema.safeParse(validCatDraft).success).toBe(true);

    const longNameCat = { ...validCatDraft, name: 'A'.repeat(41) };
    expect(CategoryDraftSchema.safeParse(longNameCat).success).toBe(false);

    const validGroupDraft = {
      name: 'Sugar Level',
      min: 1,
      max: 1,
      options: [
        { name: '0%', priceDelta: 0, isDefault: false, soldOut: false },
        { name: '50%', priceDelta: 0, isDefault: true, soldOut: false },
        { name: '100%', priceDelta: 0, isDefault: false, soldOut: false },
      ],
    };
    expect(OptionGroupDraftSchema.safeParse(validGroupDraft).success).toBe(true);
  });

  it('SortKindEnum and UploadKindEnum validate expected values', () => {
    expect(SortKindEnum.safeParse('category').success).toBe(true);
    expect(SortKindEnum.safeParse('item').success).toBe(true);
    expect(SortKindEnum.safeParse('option').success).toBe(true);
    expect(SortKindEnum.safeParse('invalid').success).toBe(false);

    expect(UploadKindEnum.safeParse('logo').success).toBe(true);
    expect(UploadKindEnum.safeParse('banner').success).toBe(true);
    expect(UploadKindEnum.safeParse('item').success).toBe(true);
    expect(UploadKindEnum.safeParse('category').success).toBe(true);
    expect(UploadKindEnum.safeParse('qr').success).toBe(true);
    expect(UploadKindEnum.safeParse('avatar').success).toBe(false);
  });

  it('errorWords resolves category_not_empty and item_has_orders', () => {
    expect(errorWords('category_not_empty')).toBe('Move its items to another category first.');
    expect(errorWords('item_has_orders')).toBe(
      'This item has past orders. Hide it instead of removing.',
    );
  });

  it('pure helpers: itemPriceLabel and groupRuleLabel format as expected', () => {
    // Single or identical prices
    expect(
      itemPriceLabel({
        variants: [
          { id: 'v1', values: [], price: 14900, availability: 'available', soldOutUntil: null },
        ],
      }),
    ).toBe('₱149');

    // Multiple prices produce "from ₱..."
    expect(
      itemPriceLabel({
        variants: [
          { id: 'v1', values: ['S'], price: 14900, availability: 'available', soldOutUntil: null },
          { id: 'v2', values: ['L'], price: 18900, availability: 'available', soldOutUntil: null },
        ],
      }),
    ).toBe('from ₱149');

    // Add-on rules
    expect(groupRuleLabel(1, 1)).toBe('Pick 1, required');
    expect(groupRuleLabel(0, 1)).toBe('Pick 1, optional');
    expect(groupRuleLabel(0, 3)).toBe('Pick up to 3');
    expect(groupRuleLabel(2, 2)).toBe('Pick exactly 2');
    expect(groupRuleLabel(1, 3)).toBe('Pick 1 to 3');
    expect(groupRuleLabel(0, 4, 4)).toBe('Pick any');
    expect(groupRuleLabel(0, 3, 6)).toBe('Pick up to 3');
  });

  it('validates CategoryIconSchema across 3 kinds and transforms legacy IconKey strings', () => {
    // 1. Fluent kind
    const fluentIcon = { kind: 'fluent' as const, key: 'burger' as const, style: 'color' as const };
    const parsedFluent = CategoryDraftSchema.parse({ name: 'Burgers', icon: fluentIcon });
    expect(parsedFluent.icon).toEqual({ kind: 'fluent', key: 'burger', style: 'color' });

    // 2. Emoji kind
    const emojiIcon = { kind: 'emoji' as const, char: '🍔' };
    const parsedEmoji = CategoryDraftSchema.parse({ name: 'Burgers', icon: emojiIcon });
    expect(parsedEmoji.icon).toEqual({ kind: 'emoji', char: '🍔' });

    // 3. Image kind
    const imageIcon = { kind: 'image' as const, ref: 'demo:kanto-smash/items/classic' };
    const parsedImage = CategoryDraftSchema.parse({ name: 'Burgers', icon: imageIcon });
    expect(parsedImage.icon).toEqual({ kind: 'image', ref: 'demo:kanto-smash/items/classic' });

    // 4. Legacy string backwards compatibility (transforms string to { kind: 'fluent', key, style: 'flat' })
    const parsedLegacy = CategoryDraftSchema.parse({ name: 'Burgers', icon: 'burger' });
    expect(parsedLegacy.icon).toEqual({ kind: 'fluent', key: 'burger', style: 'flat' });

    // 5. Invalid values fail
    expect(
      CategoryDraftSchema.safeParse({ name: 'Burgers', icon: 'non_existent_key' }).success,
    ).toBe(false);
    expect(
      CategoryDraftSchema.safeParse({
        name: 'Burgers',
        icon: { kind: 'fluent', key: 'burger', style: 'invalid_style' },
      }).success,
    ).toBe(false);
  });
});
