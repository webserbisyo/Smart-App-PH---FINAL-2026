import { Field, FieldDescription, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Textarea } from '@smartapp/ui/components/textarea';

export function Pattern() {
  return (
    <div className="mx-auto w-full max-w-xs">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="ticket-subject">Subject</FieldLabel>
          <Input id="ticket-subject" placeholder="Briefly describe the issue" />
          <FieldDescription>Use a clear and descriptive subject line.</FieldDescription>
        </Field>
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="ticket-message">Message</FieldLabel>
            <span className="text-xs text-muted-foreground">0/500</span>
          </div>
          <Textarea
            id="ticket-message"
            placeholder="Tell us more about your problem…"
            className="min-h-30"
          />
          <FieldDescription>
            Include any relevant details to help us resolve your issue.
          </FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  );
}
