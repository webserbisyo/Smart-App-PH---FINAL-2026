import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from '@smartapp/ui/components/field';
import { Switch } from '@smartapp/ui/components/switch';

export function Pattern() {
  return (
    <div className="flex items-center justify-center">
      <FieldLabel htmlFor="switch-with-desc" className="w-full max-w-xs">
        <Field orientation="horizontal">
          <FieldContent>
            <FieldTitle>Share across devices</FieldTitle>
            <FieldDescription>
              Focus is shared across devices, and turns off when you leave the app.
            </FieldDescription>
          </FieldContent>
          <Switch id="switch-with-desc" />
        </Field>
      </FieldLabel>
    </div>
  );
}
