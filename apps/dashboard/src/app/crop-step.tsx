import * as React from 'react';
import { MinusIcon, PlusIcon } from 'lucide-react';
import { settingsWords } from '@smartapp/core';
import { cropImage } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { ButtonGroup, ButtonGroupText } from '@smartapp/ui/components/button-group';
import { Cropper, CropperArea, CropperImage } from '@smartapp/ui/components/cropper';
import { AsyncButton } from '@smartapp/ui/compositions/async-button';
import {
  ResponsiveDialog,
  ResponsiveDialogFooter,
} from '@smartapp/ui/compositions/responsive-dialog';

const U = settingsWords.upload;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

export interface CropShape {
  // Width over height: 1 for a square prize or menu photo.
  aspect: number;
  // The longest side kept, in pixels (the shared upload step makes it smaller again when needed).
  side: number;
}

interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], name, { type: blob.type || 'image/png' });
}

/**
 * The crop step on the shared photo row (decision T107): the installed DiceUI Cropper in a dialog on
 * desktop and a bottom sheet on phone, with zoom buttons for people who can't pinch. Hands back the
 * cropped photo as a file for the shared upload step.
 */
export function CropStep({
  src,
  shape,
  busy,
  onCancel,
  onCropped,
}: {
  // The picked photo (a blob: address); null keeps the step closed.
  src: string | null;
  shape: CropShape;
  busy: boolean;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<PixelArea | null>(null);
  const [cropping, setCropping] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setFailed(false);
  }, [src]);

  const apply = async () => {
    if (!src || !area) return;
    setCropping(true);
    try {
      const width = Math.min(shape.side, Math.round(area.width));
      const height = Math.round(width / shape.aspect);
      onCropped(await dataUrlToFile(await cropImage(src, area, width, height), 'photo.webp'));
    } catch {
      setFailed(true);
    } finally {
      setCropping(false);
    }
  };

  return (
    <ResponsiveDialog
      open={src !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={U.cropTitle}
      description={U.cropHelp}
    >
      {src ? (
        <div className="flex flex-col gap-4">
          <div className="relative h-72 overflow-hidden rounded-xl border border-border bg-muted">
            <Cropper
              aspectRatio={shape.aspect}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropAreaChange={(_, pixels) => setArea(pixels)}
              role="group"
              aria-label={U.cropArea}
              className="size-full"
            >
              <CropperImage src={src} alt="" crossOrigin="anonymous" />
              <CropperArea />
            </Cropper>
          </div>
          <ButtonGroup aria-label={U.zoom} className="self-center">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={U.zoomOut}
              disabled={zoom <= MIN_ZOOM}
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.25))}
            >
              <MinusIcon />
            </Button>
            <ButtonGroupText className="h-11 w-16 justify-center bg-background tabular-nums">
              {zoom.toFixed(1)}×
            </ButtonGroupText>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11"
              aria-label={U.zoomIn}
              disabled={zoom >= MAX_ZOOM}
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.25))}
            >
              <PlusIcon />
            </Button>
          </ButtonGroup>
          {failed ? (
            <p role="alert" className="text-xs font-medium text-destructive-text">
              {U.unreadable}
            </p>
          ) : null}
          <ResponsiveDialogFooter>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="h-11 md:h-9" onClick={onCancel}>
                {U.back}
              </Button>
              <AsyncButton
                type="button"
                status={cropping || busy ? 'loading' : 'idle'}
                busyLabel={U.shrinking}
                doneLabel={U.usePhoto}
                className="h-11 font-semibold md:h-9"
                disabled={!area}
                onClick={() => void apply()}
              >
                {U.usePhoto}
              </AsyncButton>
            </div>
          </ResponsiveDialogFooter>
        </div>
      ) : null}
    </ResponsiveDialog>
  );
}
