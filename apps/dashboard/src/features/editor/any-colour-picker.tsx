import { editorWords } from '@smartapp/core';
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerCopy,
  ColorPickerEyeDropper,
  ColorPickerFields,
  ColorPickerPanel,
  ColorPickerSlider,
  ColorPickerSwatch,
  ColorPickerTrigger,
  ColorPickerValue,
} from '@smartapp/ui/components/reui/color-picker';

const W = editorWords.brand;

// Hex is what owners copy from Canva or a printer; RGB and HSL for anyone who has them (decision T73).
const FORMATS = ['hex', 'rgb', 'hsl'] as const;

/**
 * "Any colour": the installed ReUI Color Picker with its area, hue track, code fields, eyedropper (where the
 * browser has one) and Copy. A drag is one Undo step because the caller merges changes with one key.
 */
export function AnyColourPicker({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <ColorPicker
      id={id}
      value={value}
      format="hex"
      aria-label={label}
      onValueChange={(next) => {
        if (next && /^#[0-9a-f]{6}$/i.test(next)) onChange(next.toUpperCase());
      }}
      i18n={{
        labels: {
          eyeDropper: W.eyedropper,
          copy: W.copy,
          copied: W.copied,
          format: W.format,
        },
      }}
    >
      <ColorPickerTrigger className="h-11 w-full justify-start gap-2 md:h-9">
        <ColorPickerSwatch />
        <ColorPickerValue className="font-mono text-sm uppercase" />
      </ColorPickerTrigger>
      <ColorPickerContent align="start">
        <ColorPickerPanel>
          <ColorPickerArea className="h-40" />
          <div className="flex items-center gap-2">
            <ColorPickerEyeDropper />
            <ColorPickerSlider channel="hue" className="flex-1" />
          </div>
          <div className="flex items-center gap-1">
            <ColorPickerFields className="flex-1" formats={[...FORMATS]} />
            <ColorPickerCopy />
          </div>
        </ColorPickerPanel>
      </ColorPickerContent>
    </ColorPicker>
  );
}
