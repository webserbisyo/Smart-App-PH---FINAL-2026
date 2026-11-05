import * as React from 'react';
import {
  BanIcon,
  ChevronDownIcon,
  CopyIcon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UnlinkIcon,
  XIcon,
} from 'lucide-react';
import {
  applyTemplateToItem,
  catalogWords,
  computedPrice,
  copyChoices,
  errorWords,
  formatPeso,
  isSamePrice,
  linkTemplate,
  optionSoldOutState,
  renameOption,
  unlinkChoice,
  VARIANT_LIMITS,
  type ItemDraft,
  type OwnerItem,
  type OwnerVariantTemplate,
  type ShopKind,
  type Variant,
  type VariantAxis,
} from '@smartapp/core';
import { errorCodeOf, useOwnerVariantTemplates, useSaveVariantTemplate } from '@smartapp/data';
import { Badge } from '@smartapp/ui/components/badge';
import { Badge as StatusBadge } from '@smartapp/ui/components/reui/badge';
import { Button } from '@smartapp/ui/components/button';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { FieldError } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { Toggle } from '@smartapp/ui/components/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@smartapp/ui/components/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@smartapp/ui/components/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@smartapp/ui/components/dropdown-menu';
import { notify } from '@smartapp/ui/compositions/notify';
import { PesoInput } from '@/app/peso-input';
import { VariantTemplateSheet, type VariantSaved } from './variant-template-sheet.js';
import { comboCount, pesoText, pricedAxes, withVersions, type ChoicesValue } from './variants.js';
import { cn } from 'cn';

export type { ChoicesValue as VariantsValue } from './variants.js';

export interface VariantsSectionProps {
  kind: ShopKind;
  value: ChoicesValue;
  basePrice: number;
  onChange: (next: ChoicesValue) => void;
  // Items whose choices can be copied (this item left out).
  otherItems: readonly OwnerItem[];
  onCopied: (name: string) => void;
  // A save problem with the choices, shown under the heading.
  error?: string | undefined;
}

type SheetState =
  | { open: false }
  | {
      open: true;
      template: OwnerVariantTemplate | null;
      initial?: { name: string; options: string[] } | undefined;
      // The custom choice that "Save as variant" turns into a linked one.
      linkAxis?: number | undefined;
    };

// A stand-in item so the editor can run the same rule as the server on its unsaved form.
function asDraft(value: ChoicesValue, basePrice: number): ItemDraft {
  return {
    categoryId: 'draft',
    name: 'draft',
    description: null,
    photos: [],
    basePrice,
    axes: value.axes,
    variants: value.variants,
    optionGroupIds: [],
    pairingIds: [],
    featured: false,
    isNew: false,
    noticeDays: 0,
    dailyLimit: null,
    status: 'active',
  };
}

/**
 * The item editor's choices (decision T46): one card per choice with its own "Same price for all"
 * switch and "+₱" option prices, plus an optional Combinations table for special prices and sold out.
 */
export function VariantsSection({
  kind,
  value,
  basePrice,
  onChange,
  otherItems,
  onCopied,
  error,
}: VariantsSectionProps) {
  const { axes, variants, samePrice } = value;
  const { data: templates = [] } = useOwnerVariantTemplates();
  const saveTemplate = useSaveVariantTemplate();
  const [sheet, setSheet] = React.useState<SheetState>({ open: false });
  const [combosOpen, setCombosOpen] = React.useState(false);
  const [cardErrors, setCardErrors] = React.useState<Record<number, string>>({});

  const commit = (next: Pick<ChoicesValue, 'axes' | 'samePrice'> & { variants?: Variant[] }) =>
    onChange(
      withVersions(
        { axes: next.axes, samePrice: next.samePrice, variants: next.variants ?? variants },
        basePrice,
      ),
    );

  const setCardError = (index: number, message: string | null) =>
    setCardErrors((prev) => {
      const next = { ...prev };
      if (message) next[index] = message;
      else delete next[index];
      return next;
    });

  // Changes one choice; refuses anything past 30 combinations with the limit message.
  const updateAxis = (index: number, nextAxis: VariantAxis): boolean => {
    const nextAxes = axes.map((a, i) => (i === index ? nextAxis : a));
    const count = comboCount(nextAxes.filter((a) => a.values.length > 0));
    if (count > VARIANT_LIMITS.combos) {
      setCardError(index, catalogWords.comboLimit(count));
      return false;
    }
    setCardError(index, null);
    commit({ axes: nextAxes, samePrice });
    return true;
  };

  const addAxis = (axis: VariantAxis) => {
    if (axes.length >= VARIANT_LIMITS.axes) return;
    commit({ axes: [...axes, axis], samePrice: [...samePrice, true] });
  };

  const removeAxis = (index: number) => {
    setCardErrors({});
    commit({
      axes: axes.filter((_, i) => i !== index),
      samePrice: samePrice.filter((_, i) => i !== index),
    });
  };

  const setSoldOut = (match: (v: Variant) => boolean, soldOut: boolean) =>
    onChange({
      ...value,
      variants: variants.map((v) =>
        match(v)
          ? { ...v, availability: soldOut ? 'sold_out' : 'available', soldOutUntil: null }
          : v,
      ),
    });

  const copyFrom = (item: OwnerItem) => {
    const copied = copyChoices(item.axes, item.variants);
    onChange(
      withVersions(
        { axes: copied.axes, variants: copied.variants, samePrice: copied.axes.map(isSamePrice) },
        basePrice,
      ),
    );
    onCopied(item.name);
  };

  const saveAsVariant = async (index: number) => {
    const axis = axes[index];
    if (!axis) return;
    if (!axis.name.trim() || axis.values.length === 0) {
      setCardError(
        index,
        axis.name.trim() ? catalogWords.choiceNeedsOption : catalogWords.choiceNeedsName,
      );
      return;
    }
    try {
      const { template } = await saveTemplate.mutateAsync({
        draft: { name: axis.name.trim(), options: axis.values.map((v) => ({ name: v.name })) },
        applyToItems: false,
      });
      updateAxis(index, { ...axis, name: template.name, templateId: template.id });
      notify({ title: catalogWords.savedToVariants(template.name), tone: 'success' });
    } catch (err: unknown) {
      setCardError(index, errorWords(errorCodeOf(err)));
    }
  };

  // After the variant sheet saves, make the same change to this unsaved form.
  const handleSheetSaved = ({ result, before, applyToItems }: VariantSaved) => {
    if (sheet.open && sheet.linkAxis !== undefined) {
      const axis = axes[sheet.linkAxis];
      if (axis) {
        updateAxis(sheet.linkAxis, {
          ...axis,
          name: result.template.name,
          templateId: result.template.id,
        });
      }
      return;
    }
    if (!before) {
      const linked = linkTemplate(result.template);
      if (comboCount([...axes, linked]) <= VARIANT_LIMITS.combos) addAxis(linked);
      return;
    }
    const applied = applyTemplateToItem(
      asDraft(value, basePrice),
      before,
      result.template,
      applyToItems ? 'update' : 'keep',
    );
    commit({ axes: applied.item.axes, samePrice, variants: applied.item.variants });
  };

  const count = comboCount(axes.filter((a) => a.values.length > 0));
  const specialCount = variants.filter((v) => v.priceOverride !== null).length;
  const soldOutCount = variants.filter((v) => v.availability !== 'available').length;
  const priced = pricedAxes(value);
  const available = templates.filter((t) => !axes.some((a) => a.templateId === t.id));
  const copySources = otherItems.filter((item) => item.axes.length > 0);

  return (
    <section
      id="item-variants"
      tabIndex={-1}
      className={cn(
        'scroll-mt-24 space-y-4 rounded-2xl border bg-card p-4 shadow-xs outline-none md:p-5',
        error ? 'border-destructive/50' : 'border-border/60',
      )}
    >
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          {catalogWords.sectionVariantsTitle(kind)}
        </h2>
        <p className="text-sm text-muted-foreground">{catalogWords.sectionVariantsHelp(kind)}</p>
        {error ? <FieldError className="font-medium">{error}</FieldError> : null}
      </div>

      {axes.map((axis, index) => (
        <ChoiceCard
          key={`${index}-${axis.templateId ?? 'custom'}`}
          axis={axis}
          index={index}
          template={templates.find((t) => t.id === axis.templateId)}
          samePrice={samePrice[index] !== false}
          variants={variants}
          error={cardErrors[index]}
          onAxis={(next) => updateAxis(index, next)}
          onRename={(from, to) => {
            const renamed = renameOption(axes, variants, index, from, to);
            commit({ axes: renamed.axes, samePrice, variants: renamed.variants });
          }}
          onSamePrice={(on) =>
            commit({ axes, samePrice: samePrice.map((s, i) => (i === index ? on : s)) })
          }
          onSoldOut={(name, soldOut) => setSoldOut((v) => v.values[index] === name, soldOut)}
          onShowCombos={() => {
            setCombosOpen(true);
            requestAnimationFrame(() =>
              document
                .getElementById('item-combinations')
                ?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
            );
          }}
          onError={(message) => setCardError(index, message)}
          onEditVariant={(template) => setSheet({ open: true, template })}
          onUnlink={() => updateAxis(index, unlinkChoice(axis))}
          onSaveAsVariant={() => void saveAsVariant(index)}
          onRemove={() => removeAxis(index)}
        />
      ))}

      {axes.length < VARIANT_LIMITS.axes ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" className="h-11 gap-1.5 md:h-9" />}
          >
            <PlusIcon className="size-4" />
            {catalogWords.addChoice}
            <ChevronDownIcon className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            {available.length > 0 ? (
              <DropdownMenuGroup>
                <DropdownMenuLabel>{catalogWords.yourVariants}</DropdownMenuLabel>
                {available.map((t) => {
                  const next = count * t.options.length;
                  const tooMany = next > VARIANT_LIMITS.combos;
                  return (
                    <DropdownMenuItem
                      key={t.id}
                      disabled={tooMany}
                      className="min-h-11 md:min-h-8"
                      onClick={() => addAxis(linkTemplate(t))}
                    >
                      <LinkIcon className="size-4 text-muted-foreground" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">{t.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {tooMany
                            ? catalogWords.choiceDisabledCombos(next)
                            : t.options.map((o) => o.name).join(', ')}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>
            ) : null}
            {available.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              className="min-h-11 md:min-h-8"
              onClick={() => addAxis({ name: '', templateId: null, values: [] })}
            >
              <PlusIcon className="size-4 text-muted-foreground" />
              {catalogWords.startEmpty}
            </DropdownMenuItem>
            {copySources.length > 0 && axes.length === 0 ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="min-h-11 md:min-h-8">
                  <CopyIcon className="size-4 text-muted-foreground" />
                  {catalogWords.copyFromItem}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-72 w-60 overflow-y-auto">
                  {copySources.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => copyFrom(item)}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {item.axes.map((a) => a.name).join(' · ')}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            <DropdownMenuItem
              className="min-h-11 md:min-h-8"
              onClick={() => setSheet({ open: true, template: null })}
            >
              <SparklesIcon className="size-4 text-muted-foreground" />
              {catalogWords.newVariant}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      {axes.length >= 2 && variants.length > 0 ? (
        <Collapsible
          id="item-combinations"
          open={combosOpen}
          onOpenChange={setCombosOpen}
          className="scroll-mt-24 rounded-xl border border-border/60"
        >
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                className="h-auto min-h-11 w-full justify-between gap-2 rounded-xl px-3 py-2 text-left"
              />
            }
          >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {catalogWords.combinationsTitle(variants.length)}
              </span>
              {specialCount > 0 || soldOutCount > 0 ? (
                <Badge variant="outline" className="tabular">
                  {[
                    specialCount > 0 ? catalogWords.specialPrices(specialCount) : null,
                    soldOutCount > 0 ? catalogWords.soldOutCount(soldOutCount) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Badge>
              ) : null}
            </span>
            <ChevronDownIcon
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
                combosOpen && 'rotate-180',
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 border-t border-border/60 p-3">
            <p className="text-sm text-muted-foreground">{catalogWords.combinationsHelp}</p>
            <ul className="space-y-2">
              {variants.map((variant) => {
                const label = variant.values.join(' · ');
                const auto = computedPrice(basePrice, priced, {
                  values: variant.values,
                  priceOverride: null,
                });
                const soldOut = variant.availability !== 'available';
                return (
                  <li
                    key={variant.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card p-2"
                  >
                    <span className="min-w-0 basis-full truncate text-sm font-medium text-foreground sm:flex-1 sm:basis-auto">
                      {label}
                    </span>
                    <span className="text-sm whitespace-nowrap text-muted-foreground tabular">
                      {formatPeso(auto)}
                    </span>
                    <PesoInput
                      className="w-32 flex-1 sm:flex-none"
                      aria-label={catalogWords.specialPriceAria(label)}
                      placeholder={pesoText(auto)}
                      value={variant.priceOverride ?? 0}
                      onChange={(price) =>
                        commit({
                          axes,
                          samePrice,
                          variants: variants.map((v) =>
                            v.id === variant.id
                              ? { ...v, priceOverride: price > 0 ? price : null }
                              : v,
                          ),
                        })
                      }
                    />
                    <SoldOutToggle
                      label={label}
                      pressed={soldOut}
                      onPressedChange={(pressed) => setSoldOut((v) => v.id === variant.id, pressed)}
                    />
                  </li>
                );
              })}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <VariantTemplateSheet
        open={sheet.open}
        onOpenChange={(open) => {
          if (!open) setSheet({ open: false });
        }}
        template={sheet.open ? sheet.template : null}
        initial={sheet.open ? sheet.initial : undefined}
        onSaved={handleSheetSaved}
        quiet
        onDeleted={(deleted) =>
          commit({
            axes: axes.map((a) => (a.templateId === deleted.id ? unlinkChoice(a) : a)),
            samePrice,
          })
        }
      />
    </section>
  );
}

function SoldOutToggle({
  label,
  pressed,
  onPressedChange,
}: {
  label: string;
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
}) {
  return (
    <Toggle
      variant="outline"
      aria-label={`${catalogWords.comboSoldOut}: ${label}`}
      pressed={pressed}
      onPressedChange={onPressedChange}
      className="h-11 shrink-0 px-2.5 text-xs aria-pressed:border-warning/50 aria-pressed:bg-warning-soft aria-pressed:text-warning-text md:h-9"
    >
      <BanIcon />
      {catalogWords.comboSoldOut}
    </Toggle>
  );
}

function ChoiceCard({
  axis,
  index,
  template,
  samePrice,
  variants,
  error,
  onAxis,
  onRename,
  onSamePrice,
  onSoldOut,
  onShowCombos,
  onError,
  onEditVariant,
  onUnlink,
  onSaveAsVariant,
  onRemove,
}: {
  axis: VariantAxis;
  index: number;
  template: OwnerVariantTemplate | undefined;
  samePrice: boolean;
  variants: readonly Variant[];
  error: string | undefined;
  onAxis: (next: VariantAxis) => boolean;
  onRename: (from: string, to: string) => void;
  onSamePrice: (on: boolean) => void;
  onSoldOut: (option: string, soldOut: boolean) => void;
  onShowCombos: () => void;
  onError: (message: string | null) => void;
  onEditVariant: (template: OwnerVariantTemplate) => void;
  onUnlink: () => void;
  onSaveAsVariant: () => void;
  onRemove: () => void;
}) {
  const nameId = React.useId();
  const switchId = React.useId();
  const linked = axis.templateId !== null && template !== undefined;
  const displayName = axis.name.trim() || catalogWords.choiceUnnamed;

  // A linked choice lists every option of its variant; a tick says the item sells it.
  const rows = linked
    ? template.options.map((o) => ({
        name: o.name,
        value: axis.values.find((v) => v.name === o.name),
      }))
    : axis.values.map((v) => ({ name: v.name, value: v }));
  const tickedCount = axis.values.length;

  const tick = (name: string, on: boolean) => {
    if (!template) return;
    if (on) {
      const order = template.options.map((o) => o.name);
      const values = [...axis.values, { name, photo: null, priceDelta: 0 }].sort(
        (a, b) => order.indexOf(a.name) - order.indexOf(b.name),
      );
      onAxis({ ...axis, values });
    } else if (tickedCount > 1) {
      onAxis({ ...axis, values: axis.values.filter((v) => v.name !== name) });
    }
  };

  const setDelta = (name: string, priceDelta: number) =>
    onAxis({
      ...axis,
      values: axis.values.map((v) => (v.name === name ? { ...v, priceDelta } : v)),
    });

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          {linked ? (
            <div className="flex min-h-11 flex-wrap items-center gap-2 md:min-h-9">
              <span className="truncate text-base font-semibold text-foreground">{axis.name}</span>
              <Tooltip>
                <TooltipTrigger render={<span tabIndex={0} className="inline-flex rounded-md" />}>
                  <StatusBadge variant="primary-light" className="gap-1">
                    <LinkIcon className="size-3" />
                    {catalogWords.choiceLinked}
                  </StatusBadge>
                </TooltipTrigger>
                <TooltipContent>{catalogWords.choiceLinkedTip(template.name)}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <>
              <Label htmlFor={nameId}>{catalogWords.choiceNameLabel}</Label>
              <Input
                id={nameId}
                value={axis.name}
                maxLength={VARIANT_LIMITS.nameLength}
                placeholder={catalogWords.choiceNamePlaceholder}
                className="h-11 bg-card text-base md:h-9 md:text-sm"
                onChange={(e) => onAxis({ ...axis, name: e.target.value })}
              />
            </>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'size-11 shrink-0 text-muted-foreground md:size-9',
                  !linked && 'mt-6',
                )}
                aria-label={catalogWords.choiceActionsAria(displayName)}
              />
            }
          >
            <MoreHorizontalIcon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {linked ? (
              <>
                <DropdownMenuItem
                  className="min-h-11 md:min-h-8"
                  onClick={() => onEditVariant(template)}
                >
                  <PencilIcon className="size-4" />
                  {catalogWords.editVariant}
                </DropdownMenuItem>
                <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={onUnlink}>
                  <UnlinkIcon className="size-4" />
                  {catalogWords.unlinkChoice}
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={onSaveAsVariant}>
                <SparklesIcon className="size-4" />
                {catalogWords.saveAsVariant}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="min-h-11 md:min-h-8"
              onClick={onRemove}
            >
              <Trash2Icon className="size-4" />
              {catalogWords.removeChoice}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2">
        <Label htmlFor={switchId} className="text-sm font-medium">
          {catalogWords.samePriceForAll}
        </Label>
        <Switch id={switchId} checked={samePrice} onCheckedChange={onSamePrice} />
      </div>

      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map(({ name, value }) => {
            const ticked = value !== undefined;
            const state = ticked
              ? optionSoldOutState({ variants: [...variants] }, index, name)
              : 'none';
            const lastTicked = ticked && tickedCount <= 1;
            return (
              <li
                key={name}
                className={cn(
                  'flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2',
                  ticked ? 'border-border/60' : 'border-dashed border-border/60',
                )}
              >
                <div className="flex min-w-0 basis-full items-center gap-2 sm:flex-1 sm:basis-auto">
                  {linked ? (
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span className="inline-flex size-11 items-center justify-center md:size-9" />
                        }
                      >
                        <Checkbox
                          checked={ticked}
                          disabled={lastTicked}
                          aria-label={catalogWords.useOptionAria(name)}
                          onCheckedChange={(on) => tick(name, on)}
                        />
                      </TooltipTrigger>
                      {lastTicked ? (
                        <TooltipContent>{catalogWords.variantKeepOne}</TooltipContent>
                      ) : null}
                    </Tooltip>
                  ) : null}
                  {linked ? (
                    <span
                      className={cn(
                        'min-w-0 truncate text-sm font-medium',
                        ticked ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {name}
                    </span>
                  ) : (
                    <OptionName
                      name={name}
                      others={axis.values.map((v) => v.name).filter((n) => n !== name)}
                      onRename={(to) => onRename(name, to)}
                      onError={onError}
                    />
                  )}
                </div>
                {ticked ? (
                  <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
                    {state === 'some' ? (
                      <span className="flex items-center gap-1 text-xs text-warning-text">
                        <BanIcon className="size-3.5" />
                        {catalogWords.someSoldOut}
                        <Button
                          type="button"
                          variant="link"
                          className="h-11 px-1 text-xs md:h-9"
                          onClick={onShowCombos}
                        >
                          {catalogWords.openCombinations}
                        </Button>
                      </span>
                    ) : null}
                    {samePrice ? null : (
                      <PesoInput
                        className="w-28"
                        aria-label={catalogWords.priceDeltaAria(name)}
                        placeholder="+0"
                        value={value.priceDelta}
                        onChange={(delta) => setDelta(name, delta)}
                      />
                    )}
                    <SoldOutToggle
                      label={name}
                      pressed={state === 'all'}
                      onPressedChange={(pressed) => onSoldOut(name, pressed)}
                    />
                    {linked ? null : (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={catalogWords.removeOptionAria(name)}
                              className="size-11 shrink-0 text-muted-foreground hover:text-destructive md:size-9"
                              onClick={() =>
                                onAxis({
                                  ...axis,
                                  values: axis.values.filter((v) => v.name !== name),
                                })
                              }
                            />
                          }
                        >
                          <XIcon className="size-4" />
                        </TooltipTrigger>
                        <TooltipContent>{catalogWords.removeOptionAria(name)}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {linked ? null : (
        <AddOption
          values={axis.values.map((v) => v.name)}
          onAdd={(name) =>
            onAxis({ ...axis, values: [...axis.values, { name, photo: null, priceDelta: 0 }] })
          }
          onError={onError}
        />
      )}

      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}

function optionProblem(text: string, others: readonly string[]): string | null {
  if (text.length > VARIANT_LIMITS.valueLength) return catalogWords.optionTooLong;
  if (others.some((o) => o.toLowerCase() === text.toLowerCase())) return catalogWords.optionExists;
  return null;
}

// A custom option's name, renamed in place; the rename keeps its versions' ids, prices and stock.
function OptionName({
  name,
  others,
  onRename,
  onError,
}: {
  name: string;
  others: readonly string[];
  onRename: (to: string) => void;
  onError: (message: string | null) => void;
}) {
  const [text, setText] = React.useState(name);
  const finish = () => {
    const to = text.trim();
    const problem = to ? optionProblem(to, others) : null;
    if (!to || problem) {
      onError(problem);
      setText(name);
      return;
    }
    if (to !== name) onRename(to);
  };
  return (
    <Input
      value={text}
      maxLength={VARIANT_LIMITS.valueLength}
      aria-label={catalogWords.choiceOptionsLabel}
      className="h-11 min-w-0 flex-1 text-base md:h-9 md:text-sm"
      onChange={(e) => setText(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finish();
        }
        if (e.key === 'Escape') setText(name);
      }}
    />
  );
}

function AddOption({
  values,
  onAdd,
  onError,
}: {
  values: readonly string[];
  onAdd: (name: string) => boolean;
  onError: (message: string | null) => void;
}) {
  const id = React.useId();
  const [draft, setDraft] = React.useState('');
  if (values.length >= VARIANT_LIMITS.values) return null;

  const tryAdd = () => {
    const name = draft.trim();
    if (!name) return;
    const problem = optionProblem(name, values);
    if (problem) {
      onError(problem);
      return;
    }
    if (onAdd(name)) setDraft('');
  };

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={draft}
        maxLength={VARIANT_LIMITS.valueLength}
        aria-label={catalogWords.addOptionPlaceholder}
        placeholder={catalogWords.addOptionPlaceholder}
        className="h-11 min-w-0 flex-1 bg-card text-base md:h-9 md:text-sm"
        onChange={(e) => {
          setDraft(e.target.value);
          onError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            tryAdd();
          }
        }}
      />
      <Button
        type="button"
        variant="outline"
        className="h-11 shrink-0 md:h-9"
        disabled={!draft.trim()}
        onClick={tryAdd}
      >
        {catalogWords.addOptionButton}
      </Button>
    </div>
  );
}
