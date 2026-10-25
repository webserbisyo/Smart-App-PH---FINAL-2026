import { Field } from '@smartapp/ui/components/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@smartapp/ui/components/input-group';
import { CheckIcon } from 'lucide-react';

export function Pattern() {
  return (
    <Field className="max-w-xs">
      <InputGroup>
        <InputGroupInput defaultValue="reui_dev" />
        <InputGroupAddon align="inline-end">
          <div className="flex size-4 items-center justify-center rounded-full bg-success">
            <CheckIcon className="size-3 text-success-foreground" />
          </div>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
