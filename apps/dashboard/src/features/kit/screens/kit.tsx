import { words } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Separator } from '@smartapp/ui/components/separator';
import { KitFrame, KitJumpBar } from '../kit-frame.js';
import { ShellKitSections } from '../shell-sections.js';
import { StorefrontPrimitiveSections } from '../storefront-primitives.js';
import { ReuiPrimitiveSections } from '../reui-primitives.js';

// Kit page 1 of 5, Base (decision T98): the installed components and the app frame that both apps use.
// App screens are on /kit/dashboard and /kit/storefront; colours on /kit/tokens.
const GROUPS = [
  { id: 'kit-basics', label: 'Basics' },
  { id: 'kit-frame', label: 'App frame' },
  { id: 'kit-components', label: 'Components' },
  { id: 'kit-reui', label: 'ReUI' },
] as const;

export default function KitBasePage() {
  return (
    <KitFrame current="/kit">
      <KitJumpBar groups={GROUPS} />
      <p className="text-sm text-muted-foreground">
        The parts every {words.appName} screen is built from. Use these before adding anything new.
      </p>

      <div id="kit-basics" className="scroll-mt-20 space-y-12">
        {/* Component: Button */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Button</h2>
            <p className="text-sm text-muted-foreground">
              Library: shadcn (base-nova) · Path: packages/ui/src/components/button.tsx · Used in:
              login-01, signup-01, kit
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        <Separator />

        {/* Component: Card */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Card</h2>
            <p className="text-sm text-muted-foreground">
              Library: shadcn (base-nova) · Path: packages/ui/src/components/card.tsx · Used in:
              login-01, signup-01, kit
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sample Card Title</CardTitle>
                <CardDescription>A descriptive subtitle for this card component.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Card body content demonstrating typography and padding within the card structure.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Component: Field */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Field & Group</h2>
            <p className="text-sm text-muted-foreground">
              Library: shadcn (base-nova) · Path: packages/ui/src/components/field.tsx · Used in:
              login-01, signup-01, kit
            </p>
          </div>
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="kit-demo-input">Field with Description</FieldLabel>
                  <Input id="kit-demo-input" placeholder="Enter text..." />
                  <FieldDescription>Helper explanation goes here.</FieldDescription>
                </Field>
                <Field data-invalid="true">
                  <FieldLabel htmlFor="kit-error-input">Field with Error</FieldLabel>
                  <Input id="kit-error-input" aria-invalid="true" defaultValue="invalid input" />
                  <FieldError>This field has an error message.</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Component: Input */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Input</h2>
            <p className="text-sm text-muted-foreground">
              Library: shadcn (base-nova) · Path: packages/ui/src/components/input.tsx · Used in:
              login-01, signup-01, kit
            </p>
          </div>
          <div className="grid max-w-md gap-3">
            <Input placeholder="Standard placeholder" />
            <Input disabled value="Disabled input state" readOnly />
            <Input aria-invalid="true" defaultValue="Invalid input state" />
          </div>
        </section>

        <Separator />

        {/* Component: Label */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Label</h2>
            <p className="text-sm text-muted-foreground">
              Library: shadcn (base-nova) · Path: packages/ui/src/components/label.tsx · Used in:
              login-01, signup-01, kit
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="standard-label">Standard Accessible Label</Label>
            <Label htmlFor="required-label" className="font-semibold">
              Required Label <span className="text-destructive">*</span>
            </Label>
          </div>
        </section>

        <Separator />

        {/* Component: Separator */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Separator</h2>
            <p className="text-sm text-muted-foreground">
              Library: shadcn (base-nova) · Path: packages/ui/src/components/separator.tsx · Used
              in: login-01, signup-01, kit
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm">Content above separator</p>
            <Separator orientation="horizontal" />
            <p className="text-sm">Content below horizontal separator</p>
            <div className="flex h-5 items-center space-x-4 text-sm">
              <div>Left element</div>
              <Separator orientation="vertical" />
              <div>Right element</div>
            </div>
          </div>
        </section>
      </div>

      <div id="kit-frame" className="scroll-mt-20" />
      <ShellKitSections />

      <div id="kit-components" className="scroll-mt-20" />
      <StorefrontPrimitiveSections />

      <Separator />

      <div id="kit-reui" className="scroll-mt-20" />
      <ReuiPrimitiveSections />
    </KitFrame>
  );
}
