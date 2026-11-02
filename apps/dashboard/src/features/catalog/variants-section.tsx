import * as React from 'react';
import {
  BanIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  Link2OffIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  catalogWords,
  formatPeso,
  isSamePrice,
  linkTemplate,
  priceRange,
  unlinkChoice,
  VARIANT_LIMITS,
  type OwnerItem,
  type OwnerVariantTemplate,
  type ShopKind,
  type Variant,
  type VariantAxis,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { FieldError } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
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
import { useOwnerVariantTemplates } from '@smartapp/data';
import { PesoInput } from './components/peso-input.js';
import { VariantTemplateSheet } from './variant-template-sheet.js';
import { buildVersions, comboCount, copyChoices } from './variants.js';
import { cn } from 'cn';

export interface VariantsValue {
  axes: VariantAxis[];
  variants: Variant[];
}

export interface VariantsSectionProps {
  kind: ShopKind;
  value: VariantsValue;
  onChange: (next: VariantsValue) => void;
  basePrice: number;
  onBasePriceChange?: ((nextPrice: number) => void) | undefined;
  otherItems: readonly OwnerItem[];
  onCopied: (name: string) => void;
  error?: string | undefined;
}

export function VariantsSection({
  kind,
  value,
  onChange,
  basePrice,
  onBasePriceChange,
  otherItems,
  onCopied,
  error,
}: VariantsSectionProps) {
  const { axes, variants } = value;
  const { data: templates = [] } = useOwnerVariantTemplates();

  // Template sheet state
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [sheetTemplate, setSheetTemplate] = React.useState<OwnerVariantTemplate | null | undefined>(
    null,
  );
  const [targetAxisIdx, setTargetAxisIdx] = React.useState<number | null>(null);

  const copySources = otherItems.filter((item) => item.axes.length > 0);
  const totalCombos = comboCount(axes);
  const isAtComboLimit = totalCombos >= VARIANT_LIMITS.combos;

  function updateAxes(nextAxes: VariantAxis[]) {
    const nextVariants = buildVersions(nextAxes, variants, basePrice);
    onChange({ axes: nextAxes, variants: nextVariants });
  }

  function handleAddLinkedChoice(template: OwnerVariantTemplate) {
    if (axes.length >= VARIANT_LIMITS.axes) return;
    const newAxis = linkTemplate(template);
    const candidateAxes = [...axes, newAxis];
    if (comboCount(candidateAxes) > VARIANT_LIMITS.combos) {
      return;
    }
    updateAxes(candidateAxes);
  }

  function handleAddCustomChoice() {
    if (axes.length >= VARIANT_LIMITS.axes) return;
    const newAxis: VariantAxis = {
      name: '',
      templateId: null,
      values: [
        { name: 'Option 1', photo: null, priceDelta: 0 },
        { name: 'Option 2', photo: null, priceDelta: 0 },
      ],
    };
    const candidateAxes = [...axes, newAxis];
    if (comboCount(candidateAxes) > VARIANT_LIMITS.combos) {
      return;
    }
    updateAxes(candidateAxes);
  }

  function handleCopyFrom(item: OwnerItem) {
    const copied = copyChoices(item.axes, item.variants, basePrice);
    onChange(copied);
    onCopied(item.name);
  }

  function handleOpenNewTemplate() {
    setSheetTemplate(null);
    setTargetAxisIdx(null);
    setSheetOpen(true);
  }

  function handleEditLinkedTemplate(axisIdx: number) {
    const axis = axes[axisIdx];
    if (!axis?.templateId) return;
    const found = templates.find((t) => t.id === axis.templateId);
    if (!found) return;
    setSheetTemplate(found);
    setTargetAxisIdx(axisIdx);
    setSheetOpen(true);
  }

  function handleSaveAsTemplate(axisIdx: number) {
    const axis = axes[axisIdx];
    if (!axis) return;
    const mockTemplate: OwnerVariantTemplate = {
      id: '',
      name: axis.name,
      options: axis.values.map((v, i) => ({ id: `opt_${i + 1}`, name: v.name })),
      sample: false,
      usedBy: 0,
    };
    setSheetTemplate(mockTemplate);
    setTargetAxisIdx(axisIdx);
    setSheetOpen(true);
  }

  function handleUnlinkChoice(axisIdx: number) {
    const nextAxes = axes.map((a, i) => (i === axisIdx ? unlinkChoice(a) : a));
    updateAxes(nextAxes);
  }

  function handleRemoveChoice(axisIdx: number) {
    const nextAxes = axes.filter((_, i) => i !== axisIdx);
    updateAxes(nextAxes);
  }

  function handleToggleSamePrice(axisIdx: number, same: boolean) {
    const nextAxes = axes.map((axis, i) => {
      if (i !== axisIdx) return axis;
      if (same) {
        return {
          ...axis,
          values: axis.values.map((v) => ({ ...v, priceDelta: 0 })),
        };
      }
      return axis;
    });
    updateAxes(nextAxes);
  }

  // Toggling an option on a linked axis (tick/untick)
  function handleToggleLinkedOption(axisIdx: number, optName: string, checked: boolean) {
    const axis = axes[axisIdx];
    if (!axis) return;
    if (checked) {
      // Add option with template order
      const template = templates.find((t) => t.id === axis.templateId);
      const templateOrder = template?.options.map((o) => o.name) ?? [];
      const newValues = [...axis.values, { name: optName, photo: null, priceDelta: 0 }];
      newValues.sort((a, b) => {
        const idxA = templateOrder.indexOf(a.name);
        const idxB = templateOrder.indexOf(b.name);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });
      const candidateAxes = axes.map((a, i) => (i === axisIdx ? { ...a, values: newValues } : a));
      if (comboCount(candidateAxes) > VARIANT_LIMITS.combos) return;
      updateAxes(candidateAxes);
    } else {
      // Cannot uncheck if only 1 value left
      if (axis.values.length <= 1) return;
      const nextValues = axis.values.filter((v) => v.name !== optName);
      const nextAxes = axes.map((a, i) => (i === axisIdx ? { ...a, values: nextValues } : a));
      updateAxes(nextAxes);
    }
  }

  function handleCustomOptionNameChange(axisIdx: number, valIdx: number, name: string) {
    const nextAxes = axes.map((axis, i) => {
      if (i !== axisIdx) return axis;
      return {
        ...axis,
        values: axis.values.map((v, vi) => (vi === valIdx ? { ...v, name } : v)),
      };
    });
    // Also rename in variants values
    const oldName = axes[axisIdx]!.values[valIdx]!.name;
    const nextVariants = variants.map((v) => {
      if (v.values[axisIdx] === oldName) {
        const nextVals = [...v.values];
        nextVals[axisIdx] = name;
        return { ...v, values: nextVals };
      }
      return v;
    });
    onChange({ axes: nextAxes, variants: buildVersions(nextAxes, nextVariants, basePrice) });
  }

  function handleOptionPriceDeltaChange(axisIdx: number, optName: string, delta: number) {
    const nextAxes = axes.map((axis, i) => {
      if (i !== axisIdx) return axis;
      return {
        ...axis,
        values: axis.values.map((v) => (v.name === optName ? { ...v, priceDelta: delta } : v)),
      };
    });
    updateAxes(nextAxes);
  }

  function handleRemoveCustomOption(axisIdx: number, valIdx: number) {
    const axis = axes[axisIdx];
    if (!axis || axis.values.length <= 1) return;
    const nextAxes = axes.map((a, i) => {
      if (i !== axisIdx) return a;
      return { ...a, values: a.values.filter((_, vi) => vi !== valIdx) };
    });
    updateAxes(nextAxes);
  }

  function handleAddCustomOption(axisIdx: number, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const axis = axes[axisIdx];
    if (!axis || axis.values.length >= VARIANT_LIMITS.options) return;
    if (axis.values.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())) return;

    const candidateAxes = axes.map((a, i) => {
      if (i !== axisIdx) return a;
      return {
        ...a,
        values: [...a.values, { name: trimmed, photo: null, priceDelta: 0 }],
      };
    });
    if (comboCount(candidateAxes) > VARIANT_LIMITS.combos) return;
    updateAxes(candidateAxes);
  }

  // Sold out state for an option across combinations
  function getOptionSoldOutStatus(axisIdx: number, optName: string): 'none' | 'some' | 'all' {
    const matchingCombos = variants.filter((v) => v.values[axisIdx] === optName);
    if (matchingCombos.length === 0) return 'none';
    const soldOutCount = matchingCombos.filter((v) => v.availability !== 'available').length;
    if (soldOutCount === 0) return 'none';
    if (soldOutCount === matchingCombos.length) return 'all';
    return 'some';
  }

  function handleToggleOptionSoldOut(axisIdx: number, optName: string) {
    const currentStatus = getOptionSoldOutStatus(axisIdx, optName);
    const targetAvail = currentStatus === 'all' ? 'available' : 'sold_out';
    const nextVariants = variants.map((v) => {
      if (v.values[axisIdx] === optName) {
        return {
          ...v,
          availability: targetAvail,
          soldOutUntil: targetAvail === 'available' ? null : v.soldOutUntil,
        };
      }
      return v;
    });
    onChange({ axes, variants: nextVariants });
  }

  function handleCombinationSpecialPrice(varId: string, specialPrice: number) {
    const nextVariants = variants.map((v) => {
      if (v.id === varId) {
        const override = specialPrice > 0 ? specialPrice : null;
        return {
          ...v,
          priceOverride: override,
        };
      }
      return v;
    });
    onChange({ axes, variants: buildVersions(axes, nextVariants, basePrice) });
  }

  function handleCombinationSoldOut(varId: string, soldOut: boolean) {
    const nextVariants = variants.map((v) => {
      if (v.id === varId) {
        return {
          ...v,
          availability: soldOut ? ('sold_out' as const) : ('available' as const),
          soldOutUntil: soldOut ? v.soldOutUntil : null,
        };
      }
      return v;
    });
    onChange({ axes, variants: nextVariants });
  }

  const computedRange = priceRange({ basePrice, axes, variants });

  return (
    <section className="space-y-6 rounded-2xl border border-border/80 bg-card p-4 shadow-xs md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {catalogWords.variantsSectionTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{catalogWords.variantsSectionSubtitle}</p>
        </div>

        {/* Base price & computed price range */}
        <div className="flex flex-col items-end gap-1">
          {onBasePriceChange && (
            <div className="flex items-center gap-2">
              <Label
                htmlFor="base-price"
                className="text-xs font-semibold text-muted-foreground uppercase"
              >
                {catalogWords.basePriceLabel}:
              </Label>
              <PesoInput
                id="base-price"
                value={basePrice}
                onChange={onBasePriceChange}
                className="h-9 w-28 text-right font-semibold"
              />
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground">
            {catalogWords.computedPriceRange(computedRange)}
          </span>
        </div>
      </div>

      {error && <FieldError>{error}</FieldError>}

      {/* Choice cards */}
      <div className="space-y-4">
        {axes.map((axis, axisIdx) => {
          const isLinked = Boolean(axis.templateId);
          const linkedTemplate = isLinked ? templates.find((t) => t.id === axis.templateId) : null;
          const samePrice = isSamePrice(axis);

          return (
            <div
              key={axis.templateId ?? `axis-${axisIdx}`}
              className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 transition-colors focus-within:border-primary/40"
            >
              {/* Choice header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-1 items-center gap-2.5">
                  <Badge variant={isLinked ? 'secondary' : 'outline'} className="text-xs">
                    {isLinked ? catalogWords.choiceLinkedBadge : catalogWords.choiceCustomBadge}
                  </Badge>

                  {isLinked ? (
                    <span className="text-base font-bold text-foreground">{axis.name}</span>
                  ) : (
                    <Input
                      value={axis.name}
                      onChange={(e) => {
                        const nextAxes = axes.map((a, i) =>
                          i === axisIdx ? { ...a, name: e.target.value } : a,
                        );
                        updateAxes(nextAxes);
                      }}
                      placeholder="Choice name (e.g. Size)"
                      className="h-9 max-w-64 font-semibold"
                      maxLength={30}
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Choice actions`}
                        />
                      }
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isLinked ? (
                        <>
                          <DropdownMenuItem onClick={() => handleEditLinkedTemplate(axisIdx)}>
                            <ExternalLinkIcon className="size-4" />
                            {catalogWords.editVariantTemplate}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUnlinkChoice(axisIdx)}>
                            <Link2OffIcon className="size-4" />
                            {catalogWords.unlinkVariant}
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <DropdownMenuItem onClick={() => handleSaveAsTemplate(axisIdx)}>
                          <SparklesIcon className="size-4" />
                          {catalogWords.saveAsNewVariant}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => handleRemoveChoice(axisIdx)}
                      >
                        <Trash2Icon className="size-4" />
                        {catalogWords.removeChoice}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Choice-level same price switch */}
              <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-3">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{catalogWords.samePriceForAll}</Label>
                  {!samePrice && (
                    <p className="text-xs text-muted-foreground">
                      {catalogWords.differentPricesHelp}
                    </p>
                  )}
                </div>
                <Switch
                  checked={samePrice}
                  onCheckedChange={(val) => handleToggleSamePrice(axisIdx, val)}
                />
              </div>

              {/* Options list */}
              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {catalogWords.choiceOptionsLabel}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {axis.values.length}/{VARIANT_LIMITS.options}
                  </span>
                </div>

                {isLinked && linkedTemplate ? (
                  // Linked options from template
                  <div className="space-y-1.5">
                    {linkedTemplate.options.map((opt) => {
                      const isTicked = axis.values.some((v) => v.name === opt.name);
                      const currentVal = axis.values.find((v) => v.name === opt.name);
                      const soldOutStatus = getOptionSoldOutStatus(axisIdx, opt.name);

                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg border p-2 transition-colors',
                            isTicked
                              ? 'border-border/60 bg-card'
                              : 'border-transparent bg-muted/10 opacity-60',
                          )}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-sm font-medium">
                            <Checkbox
                              checked={isTicked}
                              onCheckedChange={(checked) =>
                                handleToggleLinkedOption(axisIdx, opt.name, Boolean(checked))
                              }
                            />
                            <span className={cn(!isTicked && 'text-muted-foreground')}>
                              {opt.name}
                            </span>
                          </label>

                          {isTicked && (
                            <div className="flex items-center gap-3">
                              {!samePrice && (
                                <div className="flex items-center gap-1">
                                  <PesoInput
                                    value={currentVal?.priceDelta ?? 0}
                                    onChange={(delta) =>
                                      handleOptionPriceDeltaChange(axisIdx, opt.name, delta)
                                    }
                                    placeholder={catalogWords.priceDeltaPlaceholder}
                                    className="h-8 w-24 text-right text-xs"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-1.5">
                                {soldOutStatus === 'some' && (
                                  <span className="text-xs font-medium text-warning-text">
                                    {catalogWords.someSoldOut}
                                  </span>
                                )}
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                                  <Switch
                                    checked={soldOutStatus === 'all'}
                                    onCheckedChange={() =>
                                      handleToggleOptionSoldOut(axisIdx, opt.name)
                                    }
                                  />
                                  <span>{catalogWords.soldOut}</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Custom options
                  <div className="space-y-2">
                    {axis.values.map((v, valIdx) => {
                      const soldOutStatus = getOptionSoldOutStatus(axisIdx, v.name);

                      return (
                        <div
                          key={`custom-${axisIdx}-${valIdx}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-2"
                        >
                          <Input
                            value={v.name}
                            onChange={(e) =>
                              handleCustomOptionNameChange(axisIdx, valIdx, e.target.value)
                            }
                            placeholder="Option name"
                            className="h-8 flex-1 text-sm"
                            maxLength={30}
                          />

                          <div className="flex items-center gap-3">
                            {!samePrice && (
                              <PesoInput
                                value={v.priceDelta}
                                onChange={(delta) =>
                                  handleOptionPriceDeltaChange(axisIdx, v.name, delta)
                                }
                                placeholder={catalogWords.priceDeltaPlaceholder}
                                className="h-8 w-24 text-right text-xs"
                              />
                            )}

                            <div className="flex items-center gap-1.5">
                              {soldOutStatus === 'some' && (
                                <span className="text-xs font-medium text-warning-text">
                                  {catalogWords.someSoldOut}
                                </span>
                              )}
                              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                                <Switch
                                  checked={soldOutStatus === 'all'}
                                  onCheckedChange={() => handleToggleOptionSoldOut(axisIdx, v.name)}
                                />
                                <span>{catalogWords.soldOut}</span>
                              </label>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveCustomOption(axisIdx, valIdx)}
                              disabled={axis.values.length <= 1}
                              className="size-7 text-muted-foreground hover:text-destructive"
                            >
                              <XIcon className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {axis.values.length < VARIANT_LIMITS.options && !isAtComboLimit && (
                      <CustomOptionAdder
                        onAdd={(optName) => handleAddCustomOption(axisIdx, optName)}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add a choice menu */}
      {axes.length < VARIANT_LIMITS.axes && !isAtComboLimit && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button type="button" variant="outline" className="h-10 gap-2 font-semibold">
                <PlusIcon className="size-4" />
                {catalogWords.addChoice}
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-56">
            {templates.length > 0 && (
              <>
                <DropdownMenuLabel>{catalogWords.yourVariants}</DropdownMenuLabel>
                {templates.map((tmpl) => {
                  const alreadyUsed = axes.some((a) => a.templateId === tmpl.id);
                  return (
                    <DropdownMenuItem
                      key={tmpl.id}
                      disabled={alreadyUsed}
                      onClick={() => handleAddLinkedChoice(tmpl)}
                    >
                      <SparklesIcon className="size-4 text-primary" />
                      <span className="truncate">{tmpl.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        ({tmpl.options.length})
                      </span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={handleAddCustomChoice}>
              <PlusIcon className="size-4" />
              {catalogWords.startEmptyChoice}
            </DropdownMenuItem>

            {copySources.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CopyIcon className="size-4" />
                  {catalogWords.copyFromItem}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-48">
                  {copySources.map((item) => (
                    <DropdownMenuItem key={item.id} onClick={() => handleCopyFrom(item)}>
                      <span className="truncate">{item.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleOpenNewTemplate}>
              <SparklesIcon className="size-4" />
              {catalogWords.newVariant}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Combinations section */}
      {axes.length > 0 && variants.length > 0 && (
        <Collapsible className="rounded-xl border border-border/70 bg-muted/10 p-3">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center justify-between py-1 text-sm font-semibold text-foreground"
              />
            }
          >
            <span>{catalogWords.combinationsTitle(variants.length)}</span>
            <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-200" />
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 pt-3">
            <p className="text-xs text-muted-foreground">{catalogWords.combinationsHelp}</p>

            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {variants.map((v) => {
                const label = v.values.join(' · ') || 'Default';
                const isSoldOut = v.availability !== 'available';

                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card p-2 text-sm"
                  >
                    <span className="font-medium text-foreground">{label}</span>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular">
                        {formatPeso(v.price)}
                      </span>

                      <PesoInput
                        value={v.priceOverride ?? 0}
                        onChange={(price) => handleCombinationSpecialPrice(v.id, price)}
                        placeholder={catalogWords.specialPricePlaceholder}
                        className="h-8 w-28 text-right text-xs"
                      />

                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                        <Switch
                          checked={isSoldOut}
                          onCheckedChange={(checked) => handleCombinationSoldOut(v.id, checked)}
                        />
                        <span>{catalogWords.soldOut}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Sheet for editing / creating variant templates */}
      <VariantTemplateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        template={sheetTemplate}
        onSaved={(savedTemplate) => {
          if (targetAxisIdx !== null) {
            // Update linked axis
            const nextAxes = axes.map((a, i) =>
              i === targetAxisIdx
                ? {
                    ...a,
                    name: savedTemplate.name,
                    templateId: savedTemplate.id,
                  }
                : a,
            );
            updateAxes(nextAxes);
          } else {
            // Newly created template from "New variant" -> add as linked choice!
            handleAddLinkedChoice(savedTemplate);
          }
        }}
      />
    </section>
  );
}

function CustomOptionAdder({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = React.useState('');

  function handleSubmit() {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
        placeholder={catalogWords.addOptionPlaceholder}
        className="h-8 flex-1 text-xs"
        maxLength={30}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 text-xs"
        onClick={handleSubmit}
        disabled={!name.trim()}
      >
        <PlusIcon className="size-3" />
        {catalogWords.addOption}
      </Button>
    </div>
  );
}
