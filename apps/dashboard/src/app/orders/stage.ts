import type { OrderStage, OrderStatus, ShopKind } from '@smartapp/core';
import { ordersWords, statusStage } from '@smartapp/core';

export interface StageLook {
  dot: string;
  soft: string;
  text: string;
  border: string;
  ring: string;
  // A soft, stage-tinted button (decision T35: the only solid blue on the page is the panel's main button).
  button: string;
}

// One colour per stage (decision T56). Full class names, so Tailwind sees them.
export const STAGE_LOOK: Readonly<Record<OrderStage, StageLook>> = {
  new: {
    dot: 'bg-stage-new',
    soft: 'bg-stage-new-soft',
    text: 'text-stage-new-text',
    border: 'border-stage-new',
    ring: 'ring-stage-new',
    button: 'bg-stage-new-soft text-stage-new-text hover:bg-stage-new/15',
  },
  preparing: {
    dot: 'bg-stage-preparing',
    soft: 'bg-stage-preparing-soft',
    text: 'text-stage-preparing-text',
    border: 'border-stage-preparing',
    ring: 'ring-stage-preparing',
    button: 'bg-stage-preparing-soft text-stage-preparing-text hover:bg-stage-preparing/20',
  },
  ready: {
    dot: 'bg-stage-ready',
    soft: 'bg-stage-ready-soft',
    text: 'text-stage-ready-text',
    border: 'border-stage-ready',
    ring: 'ring-stage-ready',
    button: 'bg-stage-ready-soft text-stage-ready-text hover:bg-stage-ready/20',
  },
  out: {
    dot: 'bg-stage-out',
    soft: 'bg-stage-out-soft',
    text: 'text-stage-out-text',
    border: 'border-stage-out',
    ring: 'ring-stage-out',
    button: 'bg-stage-out-soft text-stage-out-text hover:bg-stage-out/15',
  },
  done: {
    dot: 'bg-stage-done',
    soft: 'bg-stage-done-soft',
    text: 'text-stage-done-text',
    border: 'border-stage-done',
    ring: 'ring-stage-done',
    button: 'bg-stage-done-soft text-stage-done-text hover:bg-stage-done/20',
  },
};

export function stageLabel(stage: OrderStage, kind: ShopKind): string {
  return stage === 'preparing' ? ordersWords.stages.preparing(kind) : ordersWords.stages[stage];
}

/** The stage word for a status, for toasts ("#012 moved to Ready"). */
export function statusStageLabel(status: OrderStatus, kind: ShopKind): string {
  const stage = statusStage(status);
  return stage ? stageLabel(stage, kind) : '';
}
