import { describe, expect, it } from 'vitest';
import type { ItemDraft, VariantAxis, VariantTemplate } from '../src/index.js';
import {
  applyTemplateToItem,
  defaultVariantTemplates,
  isInSync,
  linkTemplate,
  templateChanges,
  unlinkChoice,
} from '../src/rules/variant-templates.js';
import { buildVersions } from '../src/rules/variant-pricing.js';

const makeTemplate = (id: string, name: string, options: string[]): VariantTemplate => ({
  id,
  name,
  options: options.map((opt, i) => ({ id: `${id}_opt_${i + 1}`, name: opt })),
  sample: false,
});

describe('variant-templates rules', () => {
  it('defaultVariantTemplates generates default templates for food and retail', () => {
    const food = defaultVariantTemplates('food');
    expect(food.length).toBe(5);
    expect(food.map((t) => t.name)).toEqual([
      'Size',
      'Size',
      'Cup size',
      'Patty',
      'Temperature',
    ]);

    const retail = defaultVariantTemplates('retail');
    expect(retail.length).toBe(4);
    expect(retail.map((t) => t.name)).toEqual(['Size', 'Size', 'Shoe size', 'Colour']);
  });

  it('isInSync checks if choice matches template name and ordered subset of options', () => {
    const template = makeTemplate('t_size', 'Size', ['S', 'M', 'L', 'XL']);
    const inSyncAxis: VariantAxis = {
      name: 'Size',
      templateId: 't_size',
      values: [
        { name: 'S', photo: null, priceDelta: 0 },
        { name: 'L', photo: null, priceDelta: 0 },
      ],
    };
    expect(isInSync(inSyncAxis, template)).toBe(true);

    const outOfOrderAxis: VariantAxis = {
      name: 'Size',
      templateId: 't_size',
      values: [
        { name: 'L', photo: null, priceDelta: 0 },
        { name: 'S', photo: null, priceDelta: 0 },
      ],
    };
    expect(isInSync(outOfOrderAxis, template)).toBe(false);

    const differentNameAxis: VariantAxis = {
      name: 'Cup size',
      templateId: 't_size',
      values: [{ name: 'S', photo: null, priceDelta: 0 }],
    };
    expect(isInSync(differentNameAxis, template)).toBe(false);
  });

  it('rename of option keeps id, special price, and sold-out state in update mode', () => {
    const before = makeTemplate('t_patty', 'Patty', ['Single', 'Double']);
    const after = {
      id: 't_patty',
      name: 'Patty',
      options: [
        { id: before.options[0]!.id, name: 'Solo' },
        { id: before.options[1]!.id, name: 'Double' },
      ],
    };

    const axis = linkTemplate(before);
    const variants = buildVersions([axis], [], 15000);
    // Give Single (now Solo) a special price and mark Double sold out
    variants[0]!.priceOverride = 16000;
    variants[0]!.price = 16000;
    const initialId = variants[0]!.id;
    variants[1]!.availability = 'sold_out';

    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Smash Burger',
      description: null,
      photos: [],
      basePrice: 15000,
      axes: [axis],
      variants,
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('updated');
    expect(res.item.axes[0]!.values.map((v) => v.name)).toEqual(['Solo', 'Double']);

    const soloVariant = res.item.variants.find((v) => v.values[0] === 'Solo');
    expect(soloVariant).toBeDefined();
    expect(soloVariant?.id).toBe(initialId);
    expect(soloVariant?.priceOverride).toBe(16000);
    expect(soloVariant?.price).toBe(16000);

    const doubleVariant = res.item.variants.find((v) => v.values[0] === 'Double');
    expect(doubleVariant?.availability).toBe('sold_out');
  });

  it('reorders options according to the new template order', () => {
    const before = makeTemplate('t_size', 'Size', ['Small', 'Medium', 'Large']);
    const after = {
      id: 't_size',
      name: 'Size',
      options: [
        before.options[2]!, // Large
        before.options[1]!, // Medium
        before.options[0]!, // Small
      ],
    };

    const axis = linkTemplate(before);
    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Fries',
      description: null,
      photos: [],
      basePrice: 5000,
      axes: [axis],
      variants: buildVersions([axis], [], 5000),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('updated');
    expect(res.item.axes[0]!.values.map((v) => v.name)).toEqual(['Large', 'Medium', 'Small']);
  });

  it('removes dropped options and their versions', () => {
    const before = makeTemplate('t_size', 'Size', ['Regular', 'Large', 'Extra Large']);
    const after = {
      id: 't_size',
      name: 'Size',
      options: [before.options[0]!, before.options[1]!], // Extra Large removed
    };

    const axis = linkTemplate(before);
    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Fries',
      description: null,
      photos: [],
      basePrice: 5000,
      axes: [axis],
      variants: buildVersions([axis], [], 5000),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('updated');
    expect(res.item.axes[0]!.values.map((v) => v.name)).toEqual(['Regular', 'Large']);
    expect(res.item.variants.some((v) => v.values.includes('Extra Large'))).toBe(false);
  });

  it('an add on a same-price choice is available at +₱0', () => {
    const before = makeTemplate('t_size', 'Size', ['Regular', 'Large']);
    const after = {
      id: 't_size',
      name: 'Size',
      options: [
        before.options[0]!,
        before.options[1]!,
        { id: undefined, name: 'Extra Large' },
      ],
    };

    const axis = linkTemplate(before);
    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Shirt',
      description: null,
      photos: [],
      basePrice: 49900,
      axes: [axis],
      variants: buildVersions([axis], [], 49900),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('updated');
    expect(res.soldOut).toBe(false);
    const xl = res.item.variants.find((v) => v.values[0] === 'Extra Large');
    expect(xl?.price).toBe(49900);
    expect(xl?.availability).toBe('available');
  });

  it('an add on a priced choice starts sold out at +₱0', () => {
    const before = makeTemplate('t_size', 'Size', ['Regular', 'Large']);
    const after = {
      id: 't_size',
      name: 'Size',
      options: [
        before.options[0]!,
        before.options[1]!,
        { id: undefined, name: 'Extra Large' },
      ],
    };

    const axis: VariantAxis = {
      name: 'Size',
      templateId: 't_size',
      values: [
        { name: 'Regular', photo: null, priceDelta: 0 },
        { name: 'Large', photo: null, priceDelta: 3000 },
      ],
    };

    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Fries',
      description: null,
      photos: [],
      basePrice: 6900,
      axes: [axis],
      variants: buildVersions([axis], [], 6900),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('updated');
    expect(res.soldOut).toBe(true);

    const xl = res.item.variants.find((v) => v.values[0] === 'Extra Large');
    expect(xl?.price).toBe(6900); // 6900 + 0
    expect(xl?.availability).toBe('sold_out');
  });

  it('an add past 30 combinations is skipped', () => {
    // 5 sizes × 5 colours = 25 combos. Adding 2 colours = 5 × 7 = 35 combos > 30.
    const before = makeTemplate('t_color', 'Colour', ['C1', 'C2', 'C3', 'C4', 'C5']);
    const after = {
      id: 't_color',
      name: 'Colour',
      options: [
        ...before.options,
        { id: undefined, name: 'C6' },
        { id: undefined, name: 'C7' },
      ],
    };

    const sizeAxis: VariantAxis = {
      name: 'Size',
      templateId: null,
      values: [
        { name: 'S1', photo: null, priceDelta: 0 },
        { name: 'S2', photo: null, priceDelta: 0 },
        { name: 'S3', photo: null, priceDelta: 0 },
        { name: 'S4', photo: null, priceDelta: 0 },
        { name: 'S5', photo: null, priceDelta: 0 },
      ],
    };
    const colorAxis = linkTemplate(before);

    const axes = [sizeAxis, colorAxis];
    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Big Stress Item',
      description: null,
      photos: [],
      basePrice: 1000,
      axes,
      variants: buildVersions(axes, [], 1000),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };
    expect(item.variants).toHaveLength(25);

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('skipped');
    expect(res.item.axes[1]!.values).toHaveLength(5);
  });

  it('keep mode unlinks items that are out of sync', () => {
    const before = makeTemplate('t_size', 'Size', ['Regular', 'Large']);
    // Rename Size to Portion
    const after = {
      id: 't_size',
      name: 'Portion',
      options: before.options,
    };

    const axis = linkTemplate(before);
    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Fries',
      description: null,
      photos: [],
      basePrice: 5000,
      axes: [axis],
      variants: buildVersions([axis], [], 5000),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'keep');
    expect(res.outcome).toBe('unlinked');
    expect(res.item.axes[0]!.templateId).toBeNull();
    expect(res.item.axes[0]!.name).toBe('Size');
  });

  it('removing an item only option unlinks the choice', () => {
    const before = makeTemplate('t_size', 'Size', ['Regular', 'Large']);
    // Item only uses Large
    const axis: VariantAxis = {
      name: 'Size',
      templateId: 't_size',
      values: [{ name: 'Large', photo: null, priceDelta: 0 }],
    };

    // Template removes Large
    const after = {
      id: 't_size',
      name: 'Size',
      options: [before.options[0]!], // only Regular left
    };

    const item: ItemDraft = {
      categoryId: 'cat_1',
      name: 'Fries',
      description: null,
      photos: [],
      basePrice: 5000,
      axes: [axis],
      variants: buildVersions([axis], [], 5000),
      optionGroupIds: [],
      pairingIds: [],
      featured: false,
      isNew: false,
      status: 'active',
    };

    const res = applyTemplateToItem(item, before, after, 'update');
    expect(res.outcome).toBe('unlinked');
    expect(res.item.axes[0]!.templateId).toBeNull();
  });
});
