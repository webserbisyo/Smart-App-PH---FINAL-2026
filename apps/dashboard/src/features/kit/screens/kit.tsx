import { useState } from 'react';
import { DEMO_SHOPS, words, type DemoShopSummary } from '@smartapp/core';
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
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { AppToaster } from '@smartapp/ui/compositions/app-toaster';
import { ShellKitSections } from '../shell-sections.js';
import { StorefrontPrimitiveSections } from '../storefront-primitives.js';
import { ReuiPrimitiveSections } from '../reui-primitives.js';
import { StorefrontPatterns } from '../storefront-patterns.js';
import { StorefrontSections } from '../storefront-sections.js';

interface TokenSwatch {
  name: string;
  bgClass: string;
  fgClass: string;
}

// The kit's jump bar (kit pass K12): one stop per group.
const KIT_GROUPS = [
  { id: 'kit-tokens', label: 'Tokens' },
  { id: 'kit-primitives', label: 'Primitives' },
  { id: 'kit-storefront', label: 'Storefront' },
  { id: 'kit-reui', label: 'ReUI' },
  { id: 'kit-patterns', label: 'Library references' },
] as const;

const COLOR_TOKENS: readonly TokenSwatch[] = [
  { name: 'primary', bgClass: 'bg-primary', fgClass: 'text-primary-foreground' },
  { name: 'secondary', bgClass: 'bg-secondary', fgClass: 'text-secondary-foreground' },
  { name: 'destructive', bgClass: 'bg-destructive', fgClass: 'text-destructive-foreground' },
  { name: 'success', bgClass: 'bg-success', fgClass: 'text-success-foreground' },
  { name: 'warning', bgClass: 'bg-warning', fgClass: 'text-warning-foreground' },
  { name: 'info', bgClass: 'bg-info', fgClass: 'text-info-foreground' },
  { name: 'member', bgClass: 'bg-member', fgClass: 'text-member-foreground' },
  { name: 'highlight', bgClass: 'bg-highlight', fgClass: 'text-highlight-foreground' },
  { name: 'background', bgClass: 'bg-background', fgClass: 'text-foreground' },
  { name: 'card', bgClass: 'bg-card', fgClass: 'text-card-foreground' },
  { name: 'muted', bgClass: 'bg-muted', fgClass: 'text-muted-foreground' },
  { name: 'accent', bgClass: 'bg-accent', fgClass: 'text-accent-foreground' },
];

export default function KitPage() {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
  );
  const defaultSlug = DEMO_SHOPS[0]?.slug ?? '';
  const [selectedShopSlug, setSelectedShopSlug] = useState<string>(defaultSlug);

  function toggleDark(): void {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  const selectedShop =
    DEMO_SHOPS.find((s: DemoShopSummary) => s.slug === selectedShopSlug) ?? DEMO_SHOPS[0];

  return (
    <div className="min-h-dvh overflow-x-clip bg-background p-4 text-foreground md:p-10">
      <div className="mx-auto max-w-5xl space-y-12">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Design System & Component Kit</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live components, design tokens, and demo brand preview for {words.appName}.
            </p>
          </div>
          <Button variant="outline" onClick={toggleDark}>
            {isDark ? 'Light mode' : 'Dark mode'}
          </Button>
        </header>

        <nav
          aria-label="Kit sections"
          className="sticky top-0 z-sticky -mx-4 border-b bg-background/90 px-4 py-2 backdrop-blur-md md:-mx-10 md:px-10"
        >
          {/* Plain links: the ReUI Scrollspy reads the first scroll area on the page,
              and the kit shows several, so it cannot track this page. */}
          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {KIT_GROUPS.map((group) => (
              <Button
                key={group.id}
                variant="outline"
                size="sm"
                render={<a href={`#${group.id}`} />}
                nativeButton={false}
                className="h-9 shrink-0 rounded-full px-4 pointer-coarse:h-11"
              >
                {group.label}
              </Button>
            ))}
          </div>
        </nav>

        {/* Color Tokens Section */}
        <section id="kit-tokens" className="scroll-mt-20 space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Color Tokens</h2>
            <p className="text-sm text-muted-foreground">
              Tailwind v4 OKLCH token swatches in current theme mode.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {COLOR_TOKENS.map((token) => (
              <div key={token.name} className="overflow-hidden rounded-lg border bg-card shadow-xs">
                <div
                  className={`flex h-16 items-center justify-center text-xs font-medium ${token.bgClass} ${token.fgClass}`}
                >
                  Aa 4.5:1
                </div>
                <div className="p-2 text-center font-mono text-xs">{token.name}</div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Demo Shops Brand Switcher */}
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Demo Shops Brand Palette</h2>
            <p className="text-sm text-muted-foreground">
              Dynamic shop brand colors set with the typed cssVars() helper.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DEMO_SHOPS.map((shop: DemoShopSummary) => (
              <Button
                key={shop.slug}
                variant={selectedShop?.slug === shop.slug ? 'default' : 'outline'}
                onClick={() => setSelectedShopSlug(shop.slug)}
              >
                {shop.name}
              </Button>
            ))}
          </div>
          {selectedShop ? (
            <Card className="bg-card">
              <CardHeader>
                <CardTitle>{selectedShop.name}</CardTitle>
                <CardDescription>
                  {selectedShop.kind} · {selectedShop.city} · {selectedShop.ownerName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  Hex color: <span className="font-mono">{selectedShop.brandColor}</span>
                </div>
                <div
                  className="inline-flex items-center rounded-md bg-shop px-3 py-1.5 text-sm font-semibold text-primary-foreground"
                  style={cssVars({
                    '--shop-color': selectedShop.brandColor,
                  })}
                >
                  Brand Accent Button
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>

        <Separator />

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

        <div id="kit-primitives" className="scroll-mt-20" />
        <ShellKitSections />

        <AppToaster>
          <StorefrontPrimitiveSections />
        </AppToaster>

        <Separator />

        <div id="kit-storefront" className="scroll-mt-20" />
        <StorefrontSections />

        <Separator />

        <div id="kit-reui" className="scroll-mt-20" />
        <ReuiPrimitiveSections />

        <Separator />

        <div id="kit-patterns" className="scroll-mt-20" />
        <StorefrontPatterns />
      </div>
    </div>
  );
}
