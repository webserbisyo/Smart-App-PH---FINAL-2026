import { Link } from '@tanstack/react-router';
import { ArrowUpRightIcon, MoonIcon, SunIcon } from 'lucide-react';
import { SHOP_SURFACES, editorWords, type StorefrontContent } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { useShop } from '@/app/shop';
import type { PanelProps } from './types.js';
import { CountedLabel, orNull } from './field-count.js';

const W = editorWords.brand;
const TAGLINE_MAX = 80;

const SURFACE_ICONS = { light: SunIcon, dark: MoonIcon } as const;

export function BrandPanel({ content, update }: PanelProps) {
  const shop = useShop();
  const tagline = content.tagline ?? '';
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="editor-name">{W.name}</FieldLabel>
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg bg-muted px-3 py-1.5">
            <span id="editor-name" className="min-w-0 truncate text-sm font-medium">
              {shop.name}
            </span>
            <Button
              variant="link"
              className="h-9 shrink-0 px-0"
              nativeButton={false}
              render={<Link to="/settings/shop" />}
            >
              {W.nameIn}
              <ArrowUpRightIcon />
            </Button>
          </div>
        </Field>
        <Field>
          <CountedLabel htmlFor="editor-tagline" used={tagline.length} max={TAGLINE_MAX}>
            {W.tagline}
          </CountedLabel>
          <Input
            id="editor-tagline"
            className="h-11 md:h-9"
            value={tagline}
            maxLength={TAGLINE_MAX}
            placeholder={W.taglinePlaceholder}
            onChange={(e) =>
              update(
                (c): StorefrontContent => ({ ...c, tagline: orNull(e.target.value) }),
                'tagline',
              )
            }
          />
          <FieldDescription>{W.taglineHelp}</FieldDescription>
        </Field>
      </section>

      <Field>
        <FieldLabel>{W.page}</FieldLabel>
        <ToggleGroup
          value={[content.look.surface]}
          onValueChange={(value) => {
            const surface = SHOP_SURFACES.find((s) => s === value[0]);
            if (surface) update((c) => ({ ...c, look: { ...c.look, surface } }), 'surface');
          }}
          className="w-full rounded-xl border border-border/80 bg-muted/50 p-0.5"
        >
          {SHOP_SURFACES.map((surface) => {
            const Icon = SURFACE_ICONS[surface];
            return (
              <ToggleGroupItem
                key={surface}
                value={surface}
                className="h-10 flex-1 rounded-lg px-2 text-sm font-medium text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs md:h-8"
              >
                <Icon aria-hidden />
                {editorWords.surfaces[surface]}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </Field>
    </div>
  );
}
