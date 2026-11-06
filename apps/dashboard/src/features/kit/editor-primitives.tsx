import * as React from 'react';
import { BRAND_COLOR_PRESETS } from '@smartapp/core';
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
  ColorPickerSwatches,
  ColorPickerTrigger,
  ColorPickerValue,
} from '@smartapp/ui/components/reui/color-picker';
import { KitSection } from './kit-section.js';

function ColorPickerDemo() {
  const [value, setValue] = React.useState<string | null>('#D7372F');
  return (
    <div className="flex max-w-sm flex-col gap-4">
      <ColorPicker value={value} onValueChange={setValue} aria-label="Brand colour">
        <ColorPickerTrigger className="w-full justify-start gap-2">
          <ColorPickerSwatch />
          <ColorPickerValue className="font-mono text-sm uppercase" />
        </ColorPickerTrigger>
        <ColorPickerContent>
          <ColorPickerPanel>
            <ColorPickerArea className="h-40" />
            <div className="flex items-center gap-2">
              <ColorPickerEyeDropper />
              <ColorPickerSlider channel="hue" className="flex-1" />
            </div>
            <div className="flex items-center gap-1">
              <ColorPickerFields className="flex-1" formats={['hex', 'rgb', 'hsl']} />
              <ColorPickerCopy />
            </div>
          </ColorPickerPanel>
        </ColorPickerContent>
      </ColorPicker>
      <ColorPicker value={value} onValueChange={setValue} aria-label="Presets">
        <ColorPickerSwatches shape="circle" colors={[...BRAND_COLOR_PRESETS]} />
      </ColorPicker>
      <p className="font-mono text-xs text-muted-foreground">{value ?? 'none'}</p>
    </div>
  );
}

export function EditorPrimitiveSections() {
  return (
    <KitSection
      title="Color Picker"
      library="ReUI (base-nova)"
      path="packages/ui/src/components/reui/color-picker.tsx"
      usedIn="Editor brand colour and page colour (Any colour), with eyedropper and code fields (T73)"
    >
      <ColorPickerDemo />
    </KitSection>
  );
}
