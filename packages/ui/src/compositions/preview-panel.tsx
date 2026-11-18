'use client';

// The Preview panel (decision T100, after the Stays app's D42): one floating pill on sample data that opens
// a small panel of switches (who you are, a test scenario, the clock). Development and preview builds only;
// each app wires its own switches. `?clean=1` hides it for this browser tab (screen recordings) and
// `?clean=0` brings it back.
import { useId, useSyncExternalStore } from 'react';
import { FlaskConicalIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldLabel } from '@smartapp/ui/components/field';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@smartapp/ui/components/popover';

export interface PreviewPanelOption {
  value: string;
  label: string;
}

export interface PreviewPanelField {
  id: string;
  label: string;
  value: string;
  options: readonly PreviewPanelOption[];
  onChange: (value: string) => void;
}

export interface PreviewPanelProps {
  pill: string;
  // What is on now, beside the pill word ("Normal", "Lunch rush").
  summary: string;
  title: string;
  hint: string;
  fields: readonly PreviewPanelField[];
}

const CLEAN_KEY = 'smartapp:preview-clean';

// The clean switch is read once per load; nothing changes it while the page is open.
function noSubscribe(): () => void {
  return () => {};
}

function readClean(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get('clean');
    if (param === '1') window.sessionStorage.setItem(CLEAN_KEY, '1');
    if (param === '0') window.sessionStorage.removeItem(CLEAN_KEY);
    return window.sessionStorage.getItem(CLEAN_KEY) === '1';
  } catch {
    // Session storage blocked: only the link decides.
    return new URLSearchParams(window.location.search).get('clean') === '1';
  }
}

export function PreviewPanel({ pill, summary, title, hint, fields }: PreviewPanelProps) {
  const baseId = useId();
  // Hidden on the server and until hydrated (snapshot `true`), so there is no hydration mismatch.
  const clean = useSyncExternalStore(noSubscribe, readClean, () => true);
  if (clean) return null;
  return (
    <div data-slot="preview-pill" className="fixed preview-pill-place z-toast">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="h-11 max-w-xs gap-2 rounded-full bg-popover px-4 text-popover-foreground shadow-lg dark:bg-popover dark:hover:bg-muted"
            />
          }
        >
          <FlaskConicalIcon className="text-warning" aria-hidden="true" />
          <span className="font-semibold">{pill}</span>
          <span className="truncate text-muted-foreground">· {summary}</span>
        </PopoverTrigger>
        <PopoverContent side="top" align="start" className="w-80 gap-3 p-4">
          <PopoverHeader>
            <PopoverTitle className="flex items-center gap-2 font-semibold">
              <FlaskConicalIcon className="size-4 text-warning" aria-hidden="true" />
              {title}
            </PopoverTitle>
          </PopoverHeader>
          {fields.map((field) => {
            const id = `${baseId}-${field.id}`;
            return (
              <Field key={field.id} className="gap-1.5">
                <FieldLabel htmlFor={id} className="text-xs text-muted-foreground">
                  {field.label}
                </FieldLabel>
                <NativeSelect
                  id={id}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  // 44 px tall with 16 px text so phones don't zoom (docs/ux.md section 5).
                  className="w-full [&_select]:h-11 [&_select]:text-base"
                >
                  {field.options.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            );
          })}
          <PopoverDescription className="text-xs">{hint}</PopoverDescription>
        </PopoverContent>
      </Popover>
    </div>
  );
}
