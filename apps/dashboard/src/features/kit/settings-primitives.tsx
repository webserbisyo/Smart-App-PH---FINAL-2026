import * as React from 'react';
import { STARTING_MAKE, avatarSvgSrc, type AvatarMake } from '@smartapp/core';
import { Avatar, AvatarFallback, AvatarImage } from '@smartapp/ui/components/avatar';
import {
  CompareSlider,
  CompareSliderAfter,
  CompareSliderBefore,
  CompareSliderHandle,
  CompareSliderLabel,
} from '@smartapp/ui/components/compare-slider';
import {
  Gauge,
  GaugeIndicator,
  GaugeLabel,
  GaugeRange,
  GaugeTrack,
  GaugeValueText,
} from '@smartapp/ui/components/gauge';
import {
  TimePicker,
  TimePickerContent,
  TimePickerHour,
  TimePickerInput,
  TimePickerInputGroup,
  TimePickerLabel,
  TimePickerMinute,
  TimePickerPeriod,
  TimePickerSeparator,
  TimePickerTrigger,
} from '@smartapp/ui/components/time-picker';
import { AvatarMaker } from '@smartapp/ui/compositions/avatar-maker';
import { KitSection } from './kit-section.js';

function MakerDemo() {
  const [made, setMade] = React.useState<{ make: AvatarMake; svg: string | null }>({
    make: STARTING_MAKE,
    svg: null,
  });
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Avatar className="size-20 bg-avatar-sky">
        {made.svg ? <AvatarImage src={avatarSvgSrc(made.svg)} alt="" /> : null}
        <AvatarFallback className="bg-avatar-sky">JM</AvatarFallback>
      </Avatar>
      <AvatarMaker
        value={made.make}
        tileClassName="bg-avatar-sky"
        onChange={(make, svg) => setMade({ make, svg })}
      />
      <p className="text-xs text-muted-foreground tabular-nums">
        Saved as {JSON.stringify(made.make)} and a {Math.round((made.svg?.length ?? 0) / 1000)} KB
        drawing
      </p>
    </div>
  );
}

function TimeDemo() {
  const [value, setValue] = React.useState('09:00');
  return (
    <div className="flex flex-col gap-2">
      <TimePicker
        value={value}
        onValueChange={setValue}
        locale="en-PH"
        minuteStep={5}
        className="w-40"
      >
        <TimePickerLabel>Monday opens</TimePickerLabel>
        <TimePickerInputGroup className="h-9">
          <TimePickerInput segment="hour" />
          <TimePickerSeparator />
          <TimePickerInput segment="minute" />
          <TimePickerInput segment="period" />
          <TimePickerTrigger />
        </TimePickerInputGroup>
        <TimePickerContent>
          <TimePickerHour />
          <TimePickerMinute />
          <TimePickerPeriod />
        </TimePickerContent>
      </TimePicker>
      <p className="text-xs text-muted-foreground tabular-nums">Saved as {value}</p>
    </div>
  );
}

function GaugeDemo({ used, tone }: { used: number; tone: string }) {
  return (
    <Gauge value={used} max={500} size={140} thickness={12} startAngle={-120} endAngle={120}>
      <GaugeIndicator>
        <GaugeTrack />
        <GaugeRange className={tone} />
      </GaugeIndicator>
      <GaugeValueText>{used} MB</GaugeValueText>
      <GaugeLabel>of 500 MB</GaugeLabel>
    </Gauge>
  );
}

/** Settings pieces on /kit (T64 to T66, T83): DiceUI Time Picker, Gauge, Compare Slider and the picture maker. */
export function SettingsPrimitiveSections() {
  return (
    <>
      <KitSection
        title="Picture maker"
        library="composition (Toggle Group, Skeleton, DiceBear Adventurer)"
        path="packages/ui/src/compositions/avatar-maker.tsx"
        usedIn="Settings Change picture, Make your own, and the storefront Account picture, Make my own (T83)"
      >
        <MakerDemo />
      </KitSection>
      <KitSection
        title="Time Picker"
        library="DiceUI (base-nova)"
        path="packages/ui/src/components/time-picker.tsx"
        usedIn="Settings Hours with a mouse and keyboard; phones use the native time wheel (T64)"
      >
        <TimeDemo />
      </KitSection>
      <KitSection
        title="Gauge"
        library="DiceUI (base-nova)"
        path="packages/ui/src/components/gauge.tsx"
        usedIn="Settings Storage meter: ok, almost full, full (T66)"
      >
        <div className="flex flex-wrap gap-6">
          <GaugeDemo used={212} tone="text-primary" />
          <GaugeDemo used={486} tone="text-warning" />
          <GaugeDemo used={500} tone="text-destructive" />
        </div>
      </KitSection>
      <KitSection
        title="Compare Slider"
        library="DiceUI (base-nova)"
        path="packages/ui/src/components/compare-slider.tsx"
        usedIn="Upload row Compare and the Storage try-out: original against what we save (T65)"
      >
        <CompareSlider className="aspect-video w-full max-w-md overflow-hidden rounded-xl">
          <CompareSliderBefore>
            <div className="size-full bg-success-soft" />
          </CompareSliderBefore>
          <CompareSliderAfter>
            <div className="size-full bg-primary/30" />
          </CompareSliderAfter>
          <CompareSliderHandle />
          <CompareSliderLabel side="before">Original · 4.2 MB</CompareSliderLabel>
          <CompareSliderLabel side="after">Saved · 180 KB</CompareSliderLabel>
        </CompareSlider>
      </KitSection>
    </>
  );
}
