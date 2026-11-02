import * as React from 'react';
import {
  BanIcon,
  ChevronDownIcon,
  CopyIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import {
  catalogWords,
  variantPresets,
  type OwnerItem,
  type VariantPreset,
  type ShopKind,
  type Variant,
  type VariantAxis,
} from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { Toggle } from '@smartapp/ui/components/toggle';
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
import { PesoInput } from './components/peso-input.js';
import {
  VARIANT_LIMITS,
  buildVariants,
  comboCount,
  copyChoices,
  renameOption,
} from './variants.js';
import { cn } from 'cn';

export interface VariantsValue {
  axes: VariantAxis[];
  variants: Variant[];
}

export interface VariantsSectionProps {
  kind: ShopKind;
  value: VariantsValue;
  onChange: (next: VariantsValue) => void;
  samePrice: boolean;
  onSamePriceChange: (same: boolean) => void;
  // Price for new combinations and for every combination while "same price" is on.
  basePrice: number;
  // Items whose choices can be copied (this item left out).
  otherItems: readonly OwnerItem[];
  onCopied: (name: string) => void;
  // A save problem with the choices, shown under the heading.
  error?: string | undefined;
}

type Preset = VariantPreset;

export function VariantsSection({
  kind,
  value,
  onChange,
  samePrice,
  onSamePriceChange,
  basePrice,
  otherItems,
  onCopied,
  error,
}: VariantsSectionProps) {
  const { axes, variants } = value;
  const copySources = otherItems.filter((item) => item.axes.length > 0);

  const setAxes = (nextAxes: VariantAxis[]) => {
    onChange({ axes: nextAxes, variants: buildVariants(nextAxes, variants, basePrice) });
  };

  const addAxis = (preset: Preset | null) => {
    if (axes.length >= VARIANT_LIMITS.axes) return;
    const next: VariantAxis = preset
      ? { name: preset.name, values: preset.values.map((name) => ({ name, photo: null })) }
      : { name: '', values: [] };
    setAxes([...axes, next]);
  };

  const copyFrom = (item: OwnerItem) => {
    onChange(copyChoices(item.axes, item.variants));
    onSamePriceChange(item.variants.every((v) => v.price === item.variants[0]?.price));
    onCopied(item.name);
  };

  const count = comboCount(axes);
  const groups = axes.length === 2 ? (axes[0]?.values ?? []) : [];

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
        {error ? (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {axes.map((axis, axisIndex) => (
        <AxisEditor
          key={axisIndex}
          axis={axis}
          otherAxes={axes.filter((_, i) => i !== axisIndex)}
          onRename={(name) =>
            onChange({
              axes: axes.map((a, i) => (i === axisIndex ? { ...a, name } : a)),
              variants,
            })
          }
          onAddOption={(name) =>
            setAxes(
              axes.map((a, i) =>
                i === axisIndex ? { ...a, values: [...a.values, { name, photo: null }] } : a,
              ),
            )
          }
          onRemoveOption={(name) =>
            setAxes(
              axes.map((a, i) =>
                i === axisIndex ? { ...a, values: a.values.filter((v) => v.name !== name) } : a,
              ),
            )
          }
          onRenameOption={(from, to) => onChange(renameOption(axes, variants, axisIndex, from, to))}
          onRemove={() => setAxes(axes.filter((_, i) => i !== axisIndex))}
        />
      ))}

      {axes.length < VARIANT_LIMITS.axes ? (
        <AddChoiceMenu
          kind={kind}
          label={axes.length === 0 ? catalogWords.addFirstChoice : catalogWords.addSecondChoice}
          copySources={axes.length === 0 ? copySources : []}
          maxValues={Math.floor(VARIANT_LIMITS.combos / Math.max(1, count))}
          onPreset={addAxis}
          onCopy={copyFrom}
        />
      ) : null}

      {axes.length > 0 && count > 0 ? (
        <div id="variant-prices" className="scroll-mt-24 space-y-3 border-t border-border/60 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="same-price" className="text-sm font-semibold">
                {catalogWords.samePriceLabel}
              </Label>
              <p className="text-sm text-muted-foreground">
                {catalogWords.samePriceHelp} {catalogWords.comboCount(count)}.
              </p>
            </div>
            <Switch id="same-price" checked={samePrice} onCheckedChange={onSamePriceChange} />
          </div>

          {samePrice ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{catalogWords.soldOutTapHelp}</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((variant, index) => (
                  <Toggle
                    key={variant.id}
                    variant="outline"
                    pressed={variant.availability === 'sold_out'}
                    onPressedChange={(pressed) =>
                      onChange({
                        axes,
                        variants: updateAt(variants, index, {
                          availability: pressed ? 'sold_out' : 'available',
                          soldOutUntil: null,
                        }),
                      })
                    }
                    className="h-11 px-3 aria-pressed:border-warning/50 aria-pressed:bg-warning-soft aria-pressed:text-warning-text md:h-9"
                  >
                    {variant.availability === 'sold_out' ? <BanIcon /> : null}
                    {variant.values.join(' · ')}
                  </Toggle>
                ))}
              </div>
            </div>
          ) : groups.length > 0 ? (
            <div className="space-y-3">
              {groups.map((group) => {
                const indexes = variants
                  .map((variant, index) => ({ variant, index }))
                  .filter(({ variant }) => variant.values[0] === group.name);
                const first = indexes[0]?.variant.price ?? basePrice;
                return (
                  <div
                    key={group.name}
                    className="rounded-xl border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{group.name}</span>
                      <PesoInput
                        className="w-36"
                        aria-label={catalogWords.setAllPrice(group.name)}
                        value={indexes.every(({ variant }) => variant.price === first) ? first : 0}
                        onChange={(price) =>
                          onChange({
                            axes,
                            variants: variants.map((variant) =>
                              variant.values[0] === group.name ? { ...variant, price } : variant,
                            ),
                          })
                        }
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                      {indexes.map(({ variant, index }) => (
                        <ComboRow
                          key={variant.id}
                          label={variant.values[1] ?? ''}
                          variant={variant}
                          onChange={(patch) =>
                            onChange({ axes, variants: updateAt(variants, index, patch) })
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {variants.map((variant, index) => (
                <ComboRow
                  key={variant.id}
                  label={variant.values.join(' · ')}
                  variant={variant}
                  onChange={(patch) =>
                    onChange({ axes, variants: updateAt(variants, index, patch) })
                  }
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function updateAt(variants: readonly Variant[], index: number, patch: Partial<Variant>): Variant[] {
  return variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant));
}

function ComboRow({
  label,
  variant,
  onChange,
}: {
  label: string;
  variant: Variant;
  onChange: (patch: Partial<Variant>) => void;
}) {
  const soldOut = variant.availability === 'sold_out';
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
      <PesoInput
        className="w-28"
        aria-label={label}
        value={variant.price}
        onChange={(price) => onChange({ price })}
      />
      <Toggle
        variant="outline"
        aria-label={catalogWords.comboSoldOut}
        pressed={soldOut}
        onPressedChange={(pressed) =>
          onChange({ availability: pressed ? 'sold_out' : 'available', soldOutUntil: null })
        }
        className="h-11 px-2 text-xs aria-pressed:border-warning/50 aria-pressed:bg-warning-soft aria-pressed:text-warning-text md:h-9"
      >
        <BanIcon />
        {catalogWords.comboSoldOut}
      </Toggle>
    </div>
  );
}

function AddChoiceMenu({
  label,
  copySources,
  maxValues,
  onPreset,
  onCopy,
  kind,
}: {
  kind: ShopKind;
  label: string;
  copySources: readonly OwnerItem[];
  maxValues: number;
  onPreset: (preset: Preset | null) => void;
  onCopy: (item: OwnerItem) => void;
}) {
  const presets = variantPresets(kind);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" className="h-11 gap-1.5 md:h-9" />}
      >
        <PlusIcon className="size-4" />
        {label}
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{catalogWords.quickStart}</DropdownMenuLabel>
          {presets.main.map((preset) => (
            <PresetItem
              key={preset.label}
              preset={preset}
              maxValues={maxValues}
              onPreset={onPreset}
            />
          ))}
          {presets.more.length > 0 ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <SparklesIcon className="size-4 text-muted-foreground" />
                {catalogWords.morePresets}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 w-60 overflow-y-auto">
                {presets.more.map((preset) => (
                  <PresetItem
                    key={preset.label}
                    preset={preset}
                    maxValues={maxValues}
                    onPreset={onPreset}
                  />
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onPreset(null)}>
          <PlusIcon className="size-4 text-muted-foreground" />
          {catalogWords.startEmpty}
        </DropdownMenuItem>
        {copySources.length > 0 ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CopyIcon className="size-4 text-muted-foreground" />
              {catalogWords.copyFromItem}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="max-h-72 w-60 overflow-y-auto">
              {copySources.map((item) => (
                <DropdownMenuItem key={item.id} onClick={() => onCopy(item)}>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PresetItem({
  preset,
  maxValues,
  onPreset,
}: {
  preset: Preset;
  maxValues: number;
  onPreset: (preset: Preset) => void;
}) {
  return (
    <DropdownMenuItem disabled={preset.values.length > maxValues} onClick={() => onPreset(preset)}>
      <SparklesIcon className="size-4 text-muted-foreground" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{preset.label}</span>
        <span className="text-xs text-muted-foreground">{preset.name}</span>
      </span>
    </DropdownMenuItem>
  );
}

function AxisEditor({
  axis,
  otherAxes,
  onRename,
  onAddOption,
  onRemoveOption,
  onRenameOption,
  onRemove,
}: {
  axis: VariantAxis;
  otherAxes: readonly VariantAxis[];
  onRename: (name: string) => void;
  onAddOption: (name: string) => void;
  onRemoveOption: (name: string) => void;
  onRenameOption: (from: string, to: string) => void;
  onRemove: () => void;
}) {
  const nameId = React.useId();
  const optionId = React.useId();
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<{ from: string; text: string } | null>(null);

  const otherCount = otherAxes.reduce((total, a) => total * Math.max(1, a.values.length), 1);

  const tryAdd = () => {
    const name = draft.trim();
    if (!name) return;
    const nextCount = (axis.values.length + 1) * otherCount;
    const problem =
      name.length > VARIANT_LIMITS.valueLength
        ? catalogWords.optionTooLong
        : axis.values.some((v) => v.name.toLowerCase() === name.toLowerCase())
          ? catalogWords.optionExists
          : axis.values.length >= VARIANT_LIMITS.values
            ? catalogWords.maxOptionsReached
            : nextCount > VARIANT_LIMITS.combos
              ? catalogWords.comboLimit(nextCount)
              : null;
    if (problem) {
      setError(problem);
      return;
    }
    onAddOption(name);
    setDraft('');
    setError(null);
  };

  const finishRename = () => {
    if (!editing) return;
    const to = editing.text.trim();
    const clash = axis.values.some(
      (v) => v.name !== editing.from && v.name.toLowerCase() === to.toLowerCase(),
    );
    if (to && to !== editing.from && !clash && to.length <= VARIANT_LIMITS.valueLength) {
      onRenameOption(editing.from, to);
    }
    setEditing(null);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={nameId}>{catalogWords.choiceNameLabel}</Label>
          <Input
            id={nameId}
            value={axis.name}
            maxLength={VARIANT_LIMITS.valueLength}
            placeholder={catalogWords.choiceNamePlaceholder}
            className="h-11 bg-card md:h-9"
            onChange={(e) => onRename(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-11 gap-1.5 text-muted-foreground hover:text-destructive md:h-9"
          onClick={onRemove}
        >
          <Trash2Icon className="size-4" />
          <span className="sr-only md:not-sr-only">{catalogWords.removeChoice}</span>
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={optionId}>{catalogWords.choiceOptionsLabel}</Label>
        {axis.values.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {axis.values.map((value) => (
              <li key={value.name}>
                {editing?.from === value.name ? (
                  <Input
                    autoFocus
                    value={editing.text}
                    aria-label={catalogWords.choiceOptionsLabel}
                    className="h-11 w-36 bg-card md:h-9"
                    onChange={(e) => setEditing({ from: value.name, text: e.target.value })}
                    onBlur={finishRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        finishRename();
                      }
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                ) : (
                  <Badge
                    variant="outline"
                    className="h-11 gap-1 rounded-lg bg-card pr-1 pl-3 text-sm font-medium md:h-9"
                  >
                    <button
                      type="button"
                      className="cursor-text"
                      onClick={() => setEditing({ from: value.name, text: value.name })}
                    >
                      {value.name}
                    </button>
                    <button
                      type="button"
                      aria-label={catalogWords.removeOptionAria(value.name)}
                      className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive md:size-7"
                      onClick={() => onRemoveOption(value.name)}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {axis.values.length < VARIANT_LIMITS.values ? (
          <div className="flex gap-2">
            <Input
              id={optionId}
              value={draft}
              maxLength={VARIANT_LIMITS.valueLength}
              placeholder={catalogWords.addOptionPlaceholder}
              aria-invalid={error ? true : undefined}
              className="h-11 min-w-0 flex-1 bg-card md:h-9"
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  tryAdd();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="h-11 md:h-9"
              disabled={!draft.trim()}
              onClick={tryAdd}
            >
              {catalogWords.addOptionButton}
            </Button>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
