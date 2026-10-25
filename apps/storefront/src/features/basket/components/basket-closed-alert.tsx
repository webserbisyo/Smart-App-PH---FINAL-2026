'use client';

import { ClockIcon, InfoIcon, WifiOffIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@smartapp/ui/components/reui/alert';
import type { ClosedStateDecision } from '../basket-rules';

export interface BasketClosedAlertProps {
  decision: ClosedStateDecision;
  versionResetNotice?: boolean | undefined;
}

export function BasketClosedAlert({ decision, versionResetNotice }: BasketClosedAlertProps) {
  if (versionResetNotice) {
    return (
      <Alert
        variant="warning"
        className="flex items-center gap-2.5 rounded-lg border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground"
      >
        <InfoIcon className="size-4 shrink-0 text-warning" aria-hidden="true" />
        <AlertDescription className="font-medium">
          Your basket was reset after an update.
        </AlertDescription>
      </Alert>
    );
  }

  if (decision.state === 'open' || !decision.alertMessage) {
    return null;
  }

  const isOffline = decision.state === 'offline';
  const Icon = isOffline ? WifiOffIcon : ClockIcon;

  return (
    <Alert
      variant="warning"
      className="flex items-center gap-2.5 rounded-lg border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground"
    >
      <Icon className="size-4 shrink-0 text-warning" aria-hidden="true" />
      <AlertDescription className="font-medium">{decision.alertMessage}</AlertDescription>
    </Alert>
  );
}
