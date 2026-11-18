import { useState } from 'react';
import { DEMO_SHOPS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@smartapp/ui/components/card';
import { Separator } from '@smartapp/ui/components/separator';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { KitFrame } from '../kit-frame.js';

// Kit page 4 of 5, Tokens (decisions T97, T98): the dashboard's colour tokens in the current mode. Use the
// switch at the top for the other mode. Values live in packages/ui/src/styles/tokens.css.

// The four surface layers, darkest to lightest in dark mode (T97): each sits on the one before it.
const LAYERS = [
  {
    name: 'sidebar',
    bg: 'bg-sidebar',
    fg: 'text-sidebar-foreground',
    use: 'Side nav, the base layer',
  },
  { name: 'background', bg: 'bg-background', fg: 'text-foreground', use: 'The page' },
  { name: 'card', bg: 'bg-card', fg: 'text-card-foreground', use: 'Cards and panels on the page' },
  {
    name: 'popover',
    bg: 'bg-popover',
    fg: 'text-popover-foreground',
    use: 'Menus, popovers, sheets',
  },
] as const;

const COLOR_TOKENS = [
  { name: 'primary', bg: 'bg-primary', fg: 'text-primary-foreground' },
  { name: 'secondary', bg: 'bg-secondary', fg: 'text-secondary-foreground' },
  { name: 'muted', bg: 'bg-muted', fg: 'text-muted-foreground' },
  { name: 'accent', bg: 'bg-accent', fg: 'text-accent-foreground' },
  { name: 'invert', bg: 'bg-invert', fg: 'text-invert-foreground' },
  { name: 'destructive', bg: 'bg-destructive', fg: 'text-destructive-foreground' },
  { name: 'success', bg: 'bg-success', fg: 'text-success-foreground' },
  { name: 'warning', bg: 'bg-warning', fg: 'text-warning-foreground' },
  { name: 'info', bg: 'bg-info', fg: 'text-info-foreground' },
  { name: 'member', bg: 'bg-member', fg: 'text-member-foreground' },
  { name: 'highlight', bg: 'bg-highlight', fg: 'text-highlight-foreground' },
  { name: 'success-soft', bg: 'bg-success-soft', fg: 'text-success-text' },
  { name: 'warning-soft', bg: 'bg-warning-soft', fg: 'text-warning-text' },
  { name: 'destructive-soft', bg: 'bg-destructive-soft', fg: 'text-destructive-text' },
  { name: 'info-soft', bg: 'bg-info-soft', fg: 'text-info-text' },
] as const;

const EDGES = [
  { name: 'border', className: 'border-border' },
  { name: 'border-strong', className: 'border-border-strong' },
  { name: 'input', className: 'border-input' },
  { name: 'ring', className: 'border-ring' },
] as const;

export default function KitTokensPage() {
  const [slug, setSlug] = useState(DEMO_SHOPS[0]?.slug ?? '');
  const shop = DEMO_SHOPS.find((s) => s.slug === slug) ?? DEMO_SHOPS[0];

  return (
    <KitFrame current="/kit/tokens">
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Surface layers</h2>
          <p className="text-sm text-muted-foreground">
            Neutral layers, each a step lighter than the one under it in dark mode. Brand blue is
            the accent only; mint is for members and stamps.
          </p>
        </div>
        <div className="rounded-xl bg-sidebar p-3 text-sidebar-foreground">
          <p className="px-1 pb-3 font-mono text-xs">sidebar</p>
          <div className="rounded-lg bg-background p-3 text-foreground">
            <p className="px-1 pb-3 font-mono text-xs">background</p>
            <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-xs">
              <p className="px-1 pb-3 font-mono text-xs">card</p>
              <div className="rounded-md border bg-popover p-3 text-popover-foreground shadow-md">
                <p className="font-mono text-xs">popover</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Muted words stay readable here.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LAYERS.map((layer) => (
            <div key={layer.name} className="overflow-hidden rounded-lg border">
              <div
                className={`flex h-16 items-center px-3 text-sm font-medium ${layer.bg} ${layer.fg}`}
              >
                Aa {layer.name}
              </div>
              <p className="bg-card p-2 text-xs text-muted-foreground">{layer.use}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Colours</h2>
          <p className="text-sm text-muted-foreground">
            Every pair passes 4.5:1 (checked by packages/ui/test/tokens-contrast.test.ts).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} className="overflow-hidden rounded-lg border bg-card shadow-xs">
              <div
                className={`flex h-16 items-center justify-center text-xs font-medium ${token.bg} ${token.fg}`}
              >
                Aa 4.5:1
              </div>
              <div className="p-2 text-center font-mono text-xs">{token.name}</div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Edges</h2>
          <p className="text-sm text-muted-foreground">
            Borders between layers, and the stronger edge for inputs (3:1 against the page).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {EDGES.map((edge) => (
            <div
              key={edge.name}
              className={`flex h-16 items-center justify-center rounded-lg border-2 bg-card font-mono text-xs ${edge.className}`}
            >
              {edge.name}
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Shop colours</h2>
          <p className="text-sm text-muted-foreground">
            Each shop&apos;s one colour becomes a 60 / 30 / 10 palette (ShopTheme), with words kept
            readable on every step.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEMO_SHOPS.map((s) => (
            <Button
              key={s.slug}
              variant={shop?.slug === s.slug ? 'default' : 'outline'}
              onClick={() => setSlug(s.slug)}
            >
              {s.name}
            </Button>
          ))}
        </div>
        {shop ? (
          <Card>
            <CardHeader>
              <CardTitle>{shop.name}</CardTitle>
              <CardDescription>
                {shop.kind} · {shop.city} · <span className="font-mono">{shop.brandColor}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShopTheme
                brandColor={shop.brandColor}
                surface={shop.surface}
                pageColor={shop.pageColor}
                className="grid grid-cols-3 overflow-hidden rounded-lg border text-sm font-medium"
              >
                <div className="flex h-16 items-center justify-center bg-shop-60 text-foreground">
                  60 page
                </div>
                <div className="flex h-16 items-center justify-center bg-shop-30 text-foreground">
                  30 cards
                </div>
                <div className="flex h-16 items-center justify-center bg-shop-10 text-shop-10-foreground">
                  10 accent
                </div>
              </ShopTheme>
            </CardContent>
          </Card>
        ) : null}
      </section>
    </KitFrame>
  );
}
