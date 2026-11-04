import {
  BellRingIcon,
  BikeIcon,
  ChefHatIcon,
  CircleCheckIcon,
  PackageCheckIcon,
  PackageOpenIcon,
} from 'lucide-react';
import type { OrderStage, ShopKind } from '@smartapp/core';

export interface StageIconProps {
  stage: OrderStage;
  kind: ShopKind;
  className?: string | undefined;
}

/** The stage's Lucide icon (Preparing is an open box for retail shops). Always decorative: the word sits next to it. */
export function StageIcon({ stage, kind, className }: StageIconProps) {
  switch (stage) {
    case 'new':
      return <BellRingIcon className={className} aria-hidden="true" />;
    case 'preparing':
      return kind === 'retail' ? (
        <PackageOpenIcon className={className} aria-hidden="true" />
      ) : (
        <ChefHatIcon className={className} aria-hidden="true" />
      );
    case 'ready':
      return <PackageCheckIcon className={className} aria-hidden="true" />;
    case 'out':
      return <BikeIcon className={className} aria-hidden="true" />;
    case 'done':
      return <CircleCheckIcon className={className} aria-hidden="true" />;
  }
}
