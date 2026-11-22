import * as React from 'react';
import {
  defaultPicks,
  findVariant,
  formatPeso,
  linePrice,
  newOrderWords,
  possibleValues,
  validateLinePicks,
  variantAvailability,
  words,
  type BasketLine,
  type Catalog,
  type Item,
  type OptionGroup,
} from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { CheckboxGroup, CheckboxGroupItem } from '@smartapp/ui/components/checkbox-group';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';
import { cn } from 'cn';
import { QtyField } from './qty-field.js';

const W = newOrderWords.choices;

/**
 * The choices for one item (T111): sizes or versions, add-ons, how many and a note, then Add. The same
 * price rules as the storefront's item sheet (packages/core); a dialog on a laptop, a drawer on a phone.
 * With `line` it changes a line already in the order instead.
 */
export function ChoicesSheet({
  item,
  catalog,
  now,
  line,
  onClose,
  onDone,
}: {
  item: Item | null;
  catalog: Catalog;
  now: Date;
  line: BasketLine | null;
  onClose: () => void;
  onDone: (line: BasketLine) => void;
}) {
  return (
    <ResponsiveDialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={item ? W.title(item.name) : ''}
      description={W.describe}
      scroll
    >
      {item ? (
        <ChoicesBody
          key={`${item.id}-${line ? 'edit' : 'add'}`}
          item={item}
          catalog={catalog}
          now={now}
          line={line}
          onDone={onDone}
        />
      ) : null}
    </ResponsiveDialog>
  );
}

function ChoicesBody({
  item,
  catalog,
  now,
  line,
  onDone,
}: {
  item: Item;
  catalog: Catalog;
  now: Date;
  line: BasketLine | null;
  onDone: (line: BasketLine) => void;
}) {
  const start = React.useMemo(
    () => line ?? { ...defaultPicks(item, catalog.optionGroups, now), note: '', qty: 1 },
    [item, catalog.optionGroups, now, line],
  );
  const [variantId, setVariantId] = React.useState(start.variantId);
  const [optionIds, setOptionIds] = React.useState<string[]>([...start.optionIds]);
  const [qty, setQty] = React.useState(line?.qty ?? 1);
  const [note, setNote] = React.useState(line?.note ?? '');
  const [tried, setTried] = React.useState(false);

  const picks = { variantId, optionIds };
  const problems = validateLinePicks(item, catalog.optionGroups, { ...picks, note }, now);
  const price = linePrice(item, catalog.optionGroups, { ...picks, qty });
  const groups = item.optionGroupIds
    .map((id) => catalog.optionGroups.find((g) => g.id === id))
    .filter((g): g is OptionGroup => g !== undefined);
  const missing = problems.find((p) => p.groupId !== null);
  const variant = item.variants.find((v) => v.id === variantId) ?? item.variants[0];

  const submit = () => {
    setTried(true);
    if (problems.length > 0) return;
    onDone({
      itemId: item.id,
      variantId,
      optionIds: [...optionIds].sort(),
      note: note.trim(),
      qty,
    });
  };

  return (
    <>
      <div className="flex flex-col gap-5 pb-2">
        {item.axes.length > 0 && item.variants.length > 1 ? (
          item.axes.map((axis, axisIndex) => {
            const current = variant?.values ?? [];
            const allowed = possibleValues(item, axisIndex, current);
            return (
              <div key={axis.name} className="flex flex-col gap-2">
                <span className="text-sm font-semibold">{axis.name}</span>
                <ToggleGroup
                  value={[current[axisIndex] ?? '']}
                  onValueChange={(next) => {
                    const picked = next[0];
                    if (!picked) return;
                    const values = [...current];
                    values[axisIndex] = picked;
                    const match =
                      findVariant(item, values) ??
                      item.variants.find((v) => v.values[axisIndex] === picked);
                    if (match) setVariantId(match.id);
                  }}
                  aria-label={axis.name}
                  spacing={2}
                  className="flex flex-wrap justify-start"
                >
                  {axis.values.map((v) => {
                    const values = [...current];
                    values[axisIndex] = v.name;
                    const combo = findVariant(item, values);
                    const off =
                      !allowed.includes(v.name) ||
                      (combo !== null && variantAvailability(combo, now) !== 'available');
                    return (
                      <ToggleGroupItem
                        key={v.name}
                        value={v.name}
                        variant="outline"
                        disabled={off}
                        className={cn(
                          'h-11 gap-1 rounded-lg px-3 text-sm aria-pressed:bg-primary aria-pressed:text-primary-foreground md:h-9',
                          off && 'line-through opacity-50',
                        )}
                      >
                        {v.name}
                        {v.priceDelta > 0 ? (
                          <span className="text-xs opacity-80">+{formatPeso(v.priceDelta)}</span>
                        ) : null}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
              </div>
            );
          })
        ) : item.variants.length > 1 ? (
          <RadioGroup value={variantId} onValueChange={(v) => setVariantId(String(v))}>
            {item.variants.map((v) => {
              const off = variantAvailability(v, now) !== 'available';
              return (
                <FieldLabel
                  key={v.id}
                  htmlFor={`nv-${v.id}`}
                  className={cn(
                    'flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border px-3',
                    off ? 'opacity-50' : 'cursor-pointer',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <RadioGroupItem id={`nv-${v.id}`} value={v.id} disabled={off} />
                    {v.values.join(' · ')}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatPeso(v.price)}</span>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        ) : null}

        {groups.map((group) => {
          const chosen = group.options.filter((o) => optionIds.includes(o.id)).map((o) => o.id);
          const others = optionIds.filter((id) => !group.options.some((o) => o.id === id));
          const bad = tried && missing?.groupId === group.id;
          return (
            <div
              key={group.id}
              className={cn('flex flex-col gap-2 rounded-xl', bad && 'p-2 ring-2 ring-destructive')}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{group.name}</span>
                <Badge variant={bad ? 'destructive-light' : 'secondary'} size="sm" radius="full">
                  {words.shop.groupRule(group.min, group.max)}
                </Badge>
              </div>
              {group.max === 1 ? (
                <RadioGroup
                  value={chosen[0] ?? ''}
                  onValueChange={(v) => setOptionIds([...others, String(v)])}
                  className="gap-1"
                >
                  {group.options.map((o) => (
                    <FieldLabel
                      key={o.id}
                      htmlFor={`no-${o.id}`}
                      className={cn(
                        'flex min-h-11 items-center justify-between gap-3 rounded-lg px-2',
                        o.soldOut ? 'opacity-50' : 'cursor-pointer hover:bg-muted/40',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <RadioGroupItem id={`no-${o.id}`} value={o.id} disabled={o.soldOut} />
                        {o.name}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {o.priceDelta === 0 ? words.shop.free : `+${formatPeso(o.priceDelta)}`}
                      </span>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              ) : (
                <CheckboxGroup
                  value={chosen}
                  onValueChange={(next) => setOptionIds([...others, ...next])}
                  className="gap-1"
                >
                  {group.options.map((o) => {
                    const atMax = chosen.length >= group.max && !chosen.includes(o.id);
                    return (
                      <div
                        key={o.id}
                        className="flex px-2 *:first:min-h-11 *:first:flex-1 *:first:gap-3"
                      >
                        <CheckboxGroupItem
                          value={o.id}
                          disabled={o.soldOut || atMax}
                          className="flex size-5 items-center justify-center rounded-md"
                        >
                          <span>{o.name}</span>
                          <span className="ml-auto text-xs font-semibold text-muted-foreground">
                            {o.priceDelta === 0 ? words.shop.free : `+${formatPeso(o.priceDelta)}`}
                          </span>
                        </CheckboxGroupItem>
                      </div>
                    );
                  })}
                </CheckboxGroup>
              )}
            </div>
          );
        })}

        <Field>
          <FieldLabel htmlFor="new-order-line-note">{W.note}</FieldLabel>
          <Input
            id="new-order-line-note"
            value={note}
            maxLength={120}
            placeholder={W.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 text-base md:h-9 md:text-sm"
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">{W.qty}</span>
          <QtyField
            value={qty}
            onChange={setQty}
            label={newOrderWords.basket.qtyLabel(item.name)}
            lessLabel={newOrderWords.basket.less(item.name)}
            moreLabel={newOrderWords.basket.more(item.name)}
            min={1}
          />
        </div>
      </div>
      <ResponsiveDialogFooter>
        <Button className="h-11 w-full font-semibold md:h-9" onClick={submit}>
          {tried && missing?.groupName
            ? W.missing(missing.groupName)
            : line
              ? W.save(formatPeso(price))
              : W.add(formatPeso(price))}
        </Button>
      </ResponsiveDialogFooter>
    </>
  );
}
