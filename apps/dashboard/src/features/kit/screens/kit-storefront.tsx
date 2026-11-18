import { Badge } from '@smartapp/ui/components/badge';
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
import { KitFrame, KitJumpBar } from '../kit-frame.js';
import { StorefrontPatterns } from '../storefront-patterns.js';
import { StorefrontSections } from '../storefront-sections.js';

// Kit page 3 of 5, Storefront (decision T98): customer screens, each wrapped in a demo shop's colours.
// The storefront is light only and takes the shop's colour, so the dark switch only changes this frame.
const GROUPS = [
  { id: 'kit-storefront', label: 'Shop screens' },
  { id: 'kit-stress', label: 'Hard colours' },
  { id: 'kit-patterns', label: 'Library references' },
] as const;

// Colours an owner could pick that are hardest to keep readable: very light, very dark, and a dark page.
const STRESS_SHOPS = [
  { name: 'Bright yellow', brandColor: '#FFE600', surface: 'light' }, // brand-guard-ignore: kit stress colour
  { name: 'Near black', brandColor: '#111111', surface: 'light' }, // brand-guard-ignore: kit stress colour
  { name: 'Dark page', brandColor: '#FF5A1F', surface: 'dark' }, // brand-guard-ignore: kit stress colour
] as const;

export default function KitStorefrontPage() {
  return (
    <KitFrame current="/kit/storefront">
      <KitJumpBar groups={GROUPS} />

      <div id="kit-storefront" className="scroll-mt-20" />
      <StorefrontSections />

      <Separator />

      <section id="kit-stress" className="scroll-mt-20 space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">Hard shop colours</h2>
          <p className="text-sm text-muted-foreground">
            The palette keeps words readable whatever colour an owner picks. Check buttons, chips
            and cards here after changing the palette rules.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STRESS_SHOPS.map((shop) => (
            <ShopTheme
              key={shop.name}
              brandColor={shop.brandColor}
              surface={shop.surface}
              className="rounded-xl bg-shop-60 p-4 text-foreground"
            >
              <Card>
                <CardHeader>
                  <CardTitle>{shop.name}</CardTitle>
                  <CardDescription className="font-mono">{shop.brandColor}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Button>Add to basket</Button>
                  <Button variant="outline">Details</Button>
                  <Badge>Members</Badge>
                </CardContent>
              </Card>
            </ShopTheme>
          ))}
        </div>
      </section>

      <Separator />

      <div id="kit-patterns" className="scroll-mt-20" />
      <StorefrontPatterns />
    </KitFrame>
  );
}
