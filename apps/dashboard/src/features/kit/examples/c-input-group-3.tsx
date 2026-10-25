import { Field } from '@smartapp/ui/components/field';
import { InputGroup, InputGroupInput } from '@smartapp/ui/components/input-group';

export function Pattern() {
  return (
    <Field className="max-w-xs" data-invalid="true">
      <InputGroup>
        <InputGroupInput placeholder="Invalid field" aria-invalid="true" />
      </InputGroup>
    </Field>
  );
}
