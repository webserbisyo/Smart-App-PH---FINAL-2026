// Pure rules for reusable variant templates and linking them to items.
import type { ShopKind } from '../schemas/demo-shop.js';
import type {
  Item,
  ItemDraft,
  OwnerItem,
  VariantAxis,
  VariantTemplate,
  VariantTemplateDraft,
} from '../schemas/catalog.js';
import { VARIANT_LIMITS } from './variant-limits.js';
import { VARIANT_DEFAULTS, type VariantDefault } from '../words.js';
import { buildVersions, isSamePrice } from './variant-pricing.js';

export type DefaultTemplateSpec = VariantDefault;

export const FOOD_DEFAULT_TEMPLATES: readonly DefaultTemplateSpec[] = VARIANT_DEFAULTS.food;
export const RETAIL_DEFAULT_TEMPLATES: readonly DefaultTemplateSpec[] = VARIANT_DEFAULTS.retail;

/**
 * Returns the default variant templates for a new shop of the given kind.
 * makeId can be provided or defaults to a simple unique id generator.
 */
export function defaultVariantTemplates(
  kind: ShopKind,
  makeId: (key: string, index: number) => string = (key) => `t_${key}`,
): VariantTemplate[] {
  const specs = VARIANT_DEFAULTS[kind];
  return specs.map((spec, i) => {
    const templateId = makeId(spec.key, i);
    return {
      id: templateId,
      name: spec.name,
      options: spec.options.map((name, optIdx) => ({
        id: `${templateId}_opt_${optIdx + 1}`,
        name,
      })),
      sample: false,
    };
  });
}

export interface TemplateChanges {
  renamedTo: string | null;
  renamedOptions: { from: string; to: string }[];
  removed: string[];
  added: string[];
  reordered: boolean;
}

/**
 * Diffs two versions of a template by option id to identify renames, additions,
 * removals, reordering, and template name changes.
 */
export function templateChanges(
  before: Pick<VariantTemplate, 'name' | 'options'>,
  after: Pick<VariantTemplateDraft, 'name' | 'options'>,
): TemplateChanges {
  const renamedTo = before.name !== after.name ? after.name : null;

  const beforeById = new Map(before.options.map((o) => [o.id, o.name]));
  const afterById = new Map(
    after.options
      .filter((o): o is { id: string; name: string } => Boolean(o.id))
      .map((o) => [o.id, o.name]),
  );

  const renamedOptions: { from: string; to: string }[] = [];
  const removed: string[] = [];
  const added: string[] = [];

  for (const [id, oldName] of beforeById) {
    const newName = afterById.get(id);
    if (!newName) {
      removed.push(oldName);
    } else if (newName !== oldName) {
      renamedOptions.push({ from: oldName, to: newName });
    }
  }

  for (const opt of after.options) {
    if (!opt.id || !beforeById.has(opt.id)) {
      added.push(opt.name);
    }
  }

  // Check reordering: order of surviving common option ids
  const survivingBefore = before.options.map((o) => o.id).filter((id) => afterById.has(id));
  const survivingAfter = after.options
    .map((o) => o.id)
    .filter((id): id is string => Boolean(id && beforeById.has(id)));

  const reordered =
    survivingBefore.length === survivingAfter.length &&
    survivingBefore.some((id, idx) => id !== survivingAfter[idx]);

  return {
    renamedTo,
    renamedOptions,
    removed,
    added,
    reordered,
  };
}

/**
 * Checks if a choice on an item is in sync with a template:
 * - same name
 * - values are a subset of the template's options, in the exact template order
 */
export function isInSync(
  axis: Pick<VariantAxis, 'name' | 'values'>,
  template: { name: string; options: readonly { name: string }[] },
): boolean {
  if (axis.name !== template.name) return false;
  if (axis.values.length === 0) return false;

  let templateIdx = 0;
  for (const val of axis.values) {
    const foundIdx = template.options.findIndex(
      (opt, idx) => idx >= templateIdx && opt.name === val.name,
    );
    if (foundIdx === -1) {
      return false;
    }
    templateIdx = foundIdx + 1;
  }
  return true;
}

/** Creates a new linked VariantAxis from a template with all options ticked at +₱0. */
export function linkTemplate(
  template: Pick<VariantTemplate, 'id' | 'name' | 'options'>,
): VariantAxis {
  return {
    name: template.name,
    templateId: template.id,
    values: template.options.map((opt) => ({
      name: opt.name,
      photo: null,
      priceDelta: 0,
    })),
  };
}

/** Unlinks a choice by setting templateId to null, preserving its options and price changes. */
export function unlinkChoice(axis: VariantAxis): VariantAxis {
  return {
    ...axis,
    templateId: null,
  };
}

export type TemplateApplyOutcome = 'updated' | 'unlinked' | 'skipped' | 'unchanged';

export interface ApplyTemplateResult<T extends Item | OwnerItem | ItemDraft> {
  item: T;
  outcome: TemplateApplyOutcome;
  soldOut: boolean;
}

/**
 * Applies template changes to an item that links it.
 * - 'update' mode: applies name changes, option renames, reordering, additions (under 30 combos),
 *   and removals. If the only option was removed, unlinks. If additions exceed 30 combos, skips additions.
 * - 'keep' mode: if item would fall out of sync, unlinks it; otherwise keeps unchanged.
 */
export function applyTemplateToItem<T extends Item | OwnerItem | ItemDraft>(
  item: T,
  before: Pick<VariantTemplate, 'id' | 'name' | 'options'>,
  after: Pick<VariantTemplateDraft, 'id' | 'name' | 'options'>,
  mode: 'update' | 'keep',
): ApplyTemplateResult<T> {
  const axisIndex = item.axes.findIndex((a) => a.templateId === before.id);
  if (axisIndex === -1) {
    return { item, outcome: 'unchanged', soldOut: false };
  }

  const axis = item.axes[axisIndex]!;
  const diff = templateChanges(before, after);

  // If nothing changed, unchanged
  if (
    !diff.renamedTo &&
    diff.renamedOptions.length === 0 &&
    diff.removed.length === 0 &&
    diff.added.length === 0 &&
    !diff.reordered
  ) {
    return { item, outcome: 'unchanged', soldOut: false };
  }

  if (mode === 'keep') {
    // Added options never touch items. Anything else that leaves the choice out of step unlinks it.
    if (!isInSync(axis, after)) {
      const updatedAxes = item.axes.map((a, i) => (i === axisIndex ? unlinkChoice(a) : a));
      return { item: { ...item, axes: updatedAxes }, outcome: 'unlinked', soldOut: false };
    }
    return { item, outcome: 'unchanged', soldOut: false };
  }

  // mode === 'update'
  const newAxisName = diff.renamedTo ?? axis.name;

  // 1. Rename options on the axis and on the variants
  const renameMap = new Map(diff.renamedOptions.map((r) => [r.from, r.to]));
  const removedSet = new Set(diff.removed);

  // Filter out removed options from this item's axis
  const survivingOptions = axis.values.filter((v) => !removedSet.has(v.name));

  // If every option was removed, unlink choice
  if (survivingOptions.length === 0) {
    const updatedAxes = item.axes.map((a, i) => (i === axisIndex ? unlinkChoice(a) : a));
    return {
      item: { ...item, axes: updatedAxes },
      outcome: 'unlinked',
      soldOut: false,
    };
  }

  // Apply renames to surviving options
  const renamedValues = survivingOptions.map((v) => ({
    ...v,
    name: renameMap.get(v.name) ?? v.name,
  }));

  // Map of template option order
  const templateOptionOrder = new Map(after.options.map((o, idx) => [o.name, idx]));

  // Check if added options should be added
  let nextValues = [...renamedValues];
  let skipped = false;
  let addedSoldOut = false;

  if (diff.added.length > 0) {
    const candidateValues = [
      ...nextValues,
      ...diff.added.map((name) => ({ name, photo: null, priceDelta: 0 })),
    ];
    // Calculate combos with candidate
    const candidateAxes = item.axes.map((a, i) =>
      i === axisIndex ? { ...a, values: candidateValues } : a,
    );
    const totalCombos = candidateAxes.reduce((total, a) => total * a.values.length, 1);

    if (totalCombos <= VARIANT_LIMITS.combos) {
      nextValues = candidateValues;
      // If choice has price changes, newly added options start sold out
      const samePrice = isSamePrice(axis);
      if (!samePrice) {
        addedSoldOut = true;
      }
    } else {
      skipped = true;
    }
  }

  // Sort values according to template order
  nextValues.sort((a, b) => {
    const orderA = templateOptionOrder.get(a.name) ?? 999;
    const orderB = templateOptionOrder.get(b.name) ?? 999;
    return orderA - orderB;
  });

  const nextAxis: VariantAxis = {
    ...axis,
    name: newAxisName,
    values: nextValues,
  };

  const nextAxes = item.axes.map((a, i) => (i === axisIndex ? nextAxis : a));

  // Update variants:
  // First rename values on existing variants
  const renamedVariants = item.variants
    .filter((v) => {
      const val = v.values[axisIndex];
      return val && !removedSet.has(val);
    })
    .map((v) => {
      const oldVal = v.values[axisIndex];
      const newVal = oldVal ? (renameMap.get(oldVal) ?? oldVal) : oldVal;
      const nextVValues = [...v.values];
      if (newVal) nextVValues[axisIndex] = newVal;
      return { ...v, values: nextVValues };
    });

  // Now rebuild all combinations with buildVersions
  const rebuiltVariants = buildVersions(nextAxes, renamedVariants, item.basePrice);

  // If newly added options were added and choice has price changes, mark them sold out
  const finalVariants = addedSoldOut
    ? rebuiltVariants.map((v) => {
        const val = v.values[axisIndex];
        if (val && diff.added.includes(val)) {
          return { ...v, availability: 'sold_out' as const };
        }
        return v;
      })
    : rebuiltVariants;

  return {
    item: {
      ...item,
      axes: nextAxes,
      variants: finalVariants,
    },
    outcome: skipped ? 'skipped' : 'updated',
    soldOut: addedSoldOut,
  };
}
