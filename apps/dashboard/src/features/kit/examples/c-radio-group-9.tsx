import { Card } from '@smartapp/ui/components/card';
import { Field, FieldGroup, FieldLabel, FieldTitle } from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Separator } from '@smartapp/ui/components/separator';
import { MailIcon, SmartphoneIcon, MessageCircleIcon } from 'lucide-react';

export function Pattern() {
  return (
    <Card className="w-full max-w-xs p-0">
      <RadioGroup defaultValue="email">
        <FieldGroup className="gap-0">
          <Field>
            <FieldLabel className="justify-between px-4 py-3">
              <FieldTitle className="flex items-center gap-2">
                <MailIcon aria-hidden="true" className="size-4 opacity-60" />
                Email
              </FieldTitle>
              <RadioGroupItem value="email" id="contact-email" />
            </FieldLabel>
          </Field>
          <Separator />
          <Field>
            <FieldLabel className="justify-between px-4 py-3">
              <FieldTitle className="flex items-center gap-2">
                <SmartphoneIcon aria-hidden="true" className="size-4 opacity-60" />
                Phone
              </FieldTitle>
              <RadioGroupItem value="phone" id="contact-phone" />
            </FieldLabel>
          </Field>
          <Separator />
          <Field>
            <FieldLabel className="justify-between px-4 py-3">
              <FieldTitle className="flex items-center gap-2">
                <MessageCircleIcon aria-hidden="true" className="size-4 opacity-60" />
                Chat
              </FieldTitle>
              <RadioGroupItem value="chat" id="contact-chat" />
            </FieldLabel>
          </Field>
        </FieldGroup>
      </RadioGroup>
    </Card>
  );
}
