'use client';

import { formatPeso, words, type OptionGroup } from '@smartapp/core';
import { Card } from '@smartapp/ui/components/card';
import { CheckboxGroup, CheckboxGroupItem } from '@smartapp/ui/components/checkbox-group';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { Separator } from '@smartapp/ui/components/separator';
import { isOptionDisabledAtMax } from '../url-state';

export interface ItemSheetGroupsProps {
  groups: readonly OptionGroup[];
  selectedOptionIds: readonly string[];
  onChangeOptionIds: (optionIds: string[]) => void;
  invalidGroupIds?: readonly string[];
}

/**
 * Add-on groups section for the item sheet:
 * - Header (c-radio-group-6) + rule pill (c-checkbox-19)
 * - Single choice (max 1) -> RadioGroup rows
 * - Multi choice (max > 1) -> DiceUI CheckboxGroup with c-checkbox-11 rows
 * - Disables unticked rows at group.max
 * - Marks missing required groups invalid (c-radio-group-4 pattern)
 */
export function ItemSheetGroups({
  groups,
  selectedOptionIds,
  onChangeOptionIds,
  invalidGroupIds = [],
}: ItemSheetGroupsProps) {
  if (groups.length === 0) return null;

  const handleRadioChange = (group: OptionGroup, optionId: string) => {
    // Remove any previous selection from this group and add new optionId
    const otherGroupOptions = selectedOptionIds.filter(
      (id) => !group.options.some((o) => o.id === id),
    );
    onChangeOptionIds([...otherGroupOptions, optionId]);
  };

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => {
        const isInvalid = invalidGroupIds.includes(group.id);
        const rulePill = words.shop.groupRule(group.min, group.max);
        const chosenInGroup = group.options
          .map((o) => o.id)
          .filter((id) => selectedOptionIds.includes(id));

        return (
          <div
            key={group.id}
            id={`group-${group.id}`}
            data-group-id={group.id}
            className={`flex flex-col gap-2 rounded-xl p-2 transition-colors ${
              isInvalid ? 'bg-destructive/5 ring-2 ring-destructive/80' : ''
            }`}
          >
            {/* Header (c-radio-group-6) + Rule pill (c-checkbox-19) */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {group.name}
              </span>
              <Badge
                variant={isInvalid ? 'destructive-light' : 'secondary'}
                size="xs"
                radius="full"
              >
                {rulePill}
              </Badge>
            </div>

            {/* Max 1: Radio rows */}
            {group.max === 1 ? (
              <Card className="w-full overflow-hidden border-border bg-card p-0">
                <RadioGroup
                  value={chosenInGroup[0] ?? ''}
                  onValueChange={(val) => handleRadioChange(group, val)}
                  className="gap-0"
                >
                  {group.options.map((option, idx) => {
                    const priceText =
                      option.priceDelta === 0
                        ? words.shop.free
                        : `+${formatPeso(option.priceDelta)}`;
                    const isSoldOut = option.soldOut;

                    return (
                      <div key={option.id}>
                        {idx > 0 ? <Separator /> : null}
                        <FieldLabel
                          htmlFor={`opt-${option.id}`}
                          className={`flex items-center justify-between px-4 py-3 text-sm transition-colors ${
                            isSoldOut
                              ? 'cursor-not-allowed bg-muted/40 opacity-50'
                              : 'cursor-pointer hover:bg-muted/30'
                          }`}
                        >
                          <Field
                            orientation="horizontal"
                            className="items-center gap-3"
                            data-invalid={isInvalid && chosenInGroup.length === 0}
                          >
                            <RadioGroupItem
                              value={option.id}
                              id={`opt-${option.id}`}
                              disabled={isSoldOut}
                              aria-invalid={isInvalid && chosenInGroup.length === 0}
                            />
                            <span className="font-medium text-foreground">{option.name}</span>
                          </Field>
                          <span className="text-xs font-semibold whitespace-nowrap text-muted-foreground">
                            {isSoldOut ? words.shop.lineProblem.sold_out : priceText}
                          </span>
                        </FieldLabel>
                      </div>
                    );
                  })}
                </RadioGroup>
              </Card>
            ) : (
              /* Multi choices: DiceUI CheckboxGroup with c-checkbox-11 card rows */
              <Card className="w-full overflow-hidden border-border bg-card p-0">
                <CheckboxGroup
                  value={chosenInGroup}
                  onValueChange={(newChosen) => {
                    const otherGroupOptions = selectedOptionIds.filter(
                      (id) => !group.options.some((o) => o.id === id),
                    );
                    onChangeOptionIds([...otherGroupOptions, ...newChosen]);
                  }}
                  className="gap-0"
                  aria-invalid={isInvalid && chosenInGroup.length < group.min}
                >
                  {group.options.map((option, idx) => {
                    const isSelected = selectedOptionIds.includes(option.id);
                    const isSoldOut = option.soldOut;
                    const isDisabledAtMax = isOptionDisabledAtMax(
                      chosenInGroup,
                      group.max,
                      option.id,
                    );
                    const isDisabled = isSoldOut || isDisabledAtMax;

                    const priceText =
                      option.priceDelta === 0
                        ? words.shop.free
                        : `+${formatPeso(option.priceDelta)}`;

                    return (
                      <div key={option.id}>
                        {idx > 0 ? <Separator /> : null}
                        {/* The whole row is the label (44 px+ tap area); the box is a 20 px rounded square so
                            "pick many" reads differently from the round "pick one" radios (decision R28). */}
                        <div
                          className={`flex px-4 text-sm transition-colors *:first:min-h-12 *:first:flex-1 *:first:gap-3 ${
                            isDisabled
                              ? 'cursor-not-allowed bg-muted/40 opacity-50'
                              : 'cursor-pointer hover:bg-muted/30'
                          }`}
                        >
                          <CheckboxGroupItem
                            value={option.id}
                            disabled={isDisabled}
                            className="flex size-5 items-center justify-center rounded-md"
                          >
                            <span className="font-medium text-foreground">{option.name}</span>
                            <span className="ml-auto text-xs font-semibold whitespace-nowrap text-muted-foreground">
                              {isSoldOut
                                ? words.shop.lineProblem.sold_out
                                : isDisabledAtMax && !isSelected
                                  ? words.storefrontShell.menu.itemSheet.upTo(group.max)
                                  : priceText}
                            </span>
                          </CheckboxGroupItem>
                        </div>
                      </div>
                    );
                  })}
                </CheckboxGroup>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}
