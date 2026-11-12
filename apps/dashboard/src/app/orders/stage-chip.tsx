import type { OrderStage, ShopKind } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/reui/badge';
import { cn } from 'cn';
import { STAGE_LOOK, stageLabel } from './stage.js';
import { StageIcon } from './stage-icon.js';

export interface StageChipProps {
  stage: OrderStage;
  kind: ShopKind;
  count?: number | undefined;
  className?: string | undefined;
}

/** A stage as icon + word + colour (never colour alone), composed from the installed ReUI Badge. */
export function StageChip({ stage, kind, count, className }: StageChipProps) {
  const look = STAGE_LOOK[stage];
  return (
    <Badge
      variant="outline"
      size="lg"
      radius="full"
      className={cn('gap-1 border-transparent font-semibold', look.soft, look.text, className)}
    >
      <StageIcon stage={stage} kind={kind} />
      {stageLabel(stage, kind)}
      {count !== undefined ? <span className="tabular-nums">{count}</span> : null}
    </Badge>
  );
}
