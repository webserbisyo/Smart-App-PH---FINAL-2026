import { useState } from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { Button } from '@smartapp/ui/components/button';
import {
  Cropper,
  CropperArea,
  CropperImage,
  type CropperAreaData,
} from '@smartapp/ui/components/cropper';
import { ProgressiveBlur } from '@smartapp/ui/components/progressive-blur';
import { PulsatingButton } from '@smartapp/ui/components/pulsating-button';
import { useKitShop } from './kit-shop.js';
import { KitSection } from './kit-section.js';

const P = (name: string) => `packages/ui/src/components/${name}.tsx`;

const CHOICES = [
  'Extra patty',
  'Cheese slice',
  'Bacon',
  'Egg',
  'Jalapeños',
  'Onion rings',
] as const;

/** The parts installed in storefront polish round 2 (decisions R24, R38), in the picked shop's colours. */
export function PolishPrimitiveSections() {
  const shop = useKitShop();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropperAreaData | null>(null);

  return (
    <>
      <KitSection
        title="Cropper"
        library="DiceUI"
        path={P('cropper')}
        usedIn="storefront Account (Use my photo), kit"
      >
        <div className="flex flex-col gap-3 rounded-lg bg-shop-60 p-4">
          <div className="relative h-64 max-w-sm overflow-hidden rounded-2xl bg-muted">
            <Cropper
              aspectRatio={1}
              shape="circle"
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropAreaChange={(_, pixels) => setArea(pixels)}
              aria-label="Photo crop area"
            >
              <CropperImage src={shop.photo(0)} alt="" crossOrigin="anonymous" />
              <CropperArea />
            </Cropper>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom out"
              disabled={zoom <= 1}
              onClick={() => setZoom((z) => Math.max(1, z - 0.25))}
            >
              <MinusIcon aria-hidden="true" />
            </Button>
            <span className="w-12 text-center text-sm tabular-nums">{`${zoom.toFixed(1)}×`}</span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Zoom in"
              disabled={zoom >= 3}
              onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {area
                ? `${Math.round(area.width)} × ${Math.round(area.height)} px at ${Math.round(area.x)}, ${Math.round(area.y)}`
                : 'Loading…'}
            </span>
          </div>
        </div>
      </KitSection>

      <KitSection
        title="Progressive blur"
        library="Magic UI (CSS only)"
        path={P('progressive-blur')}
        usedIn="storefront item dialog (choices under the Add bar), kit"
      >
        <div className="relative h-56 max-w-sm overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <ul className="flex h-full flex-col divide-y overflow-y-auto pb-10">
            {CHOICES.map((choice) => (
              <li key={choice} className="flex min-h-12 items-center px-4 text-sm">
                {choice}
              </li>
            ))}
          </ul>
          <ProgressiveBlur position="bottom" height="2.5rem" />
        </div>
      </KitSection>

      <KitSection
        title="Pulsating button"
        library="Magic UI (CSS only)"
        path={P('pulsating-button')}
        usedIn="storefront Rewards before a stamp card (Join free), kit"
      >
        <div className="flex rounded-lg bg-shop-60 p-6">
          <PulsatingButton
            type="button"
            variant="ripple"
            distance="10px"
            className="h-12 rounded-full bg-member px-8 text-base font-semibold text-member-foreground hover:bg-member-hover motion-reduce:*:animate-none"
          >
            Join free
          </PulsatingButton>
        </div>
      </KitSection>
    </>
  );
}
