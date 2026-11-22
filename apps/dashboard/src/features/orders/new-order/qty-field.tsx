import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@smartapp/ui/components/reui/number-field';

/**
 * How many (T111): the installed ReUI Number Field with − and + (44 px on a phone, 36 px on a laptop),
 * whole numbers from `min` to 99.
 */
export function QtyField({
  value,
  onChange,
  label,
  lessLabel,
  moreLabel,
  min,
}: {
  value: number;
  onChange: (qty: number) => void;
  label: string;
  lessLabel: string;
  moreLabel: string;
  min: number;
}) {
  return (
    <NumberField
      value={value}
      min={min}
      max={99}
      step={1}
      onValueChange={(next) => {
        if (next !== null && Number.isInteger(next)) onChange(next);
      }}
      className="w-auto"
    >
      <NumberFieldGroup className="h-11 w-32 md:h-9 md:w-28">
        <NumberFieldDecrement className="h-full w-11 md:w-9" aria-label={lessLabel} />
        <NumberFieldInput
          aria-label={label}
          inputMode="numeric"
          className="h-full min-w-0 text-center text-base tabular-nums md:text-sm"
        />
        <NumberFieldIncrement className="h-full w-11 md:w-9" aria-label={moreLabel} />
      </NumberFieldGroup>
    </NumberField>
  );
}
