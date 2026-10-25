'use client';

import { SparklesIcon } from 'lucide-react';
import type { PublicStampCard } from '@smartapp/core';
import { stampProgressDecision } from '../basket-rules';

export interface BasketStampProgressProps {
  stampCard: PublicStampCard;
  subtotal: number;
}

export function BasketStampProgress({ stampCard, subtotal }: BasketStampProgressProps) {
  const decision = stampProgressDecision(stampCard, subtotal);
  if (!decision) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-member/20 bg-member-soft p-2.5 text-xs font-medium text-member-text">
      <SparklesIcon className="size-4 shrink-0 text-member" aria-hidden="true" />
      <span className="flex-1">{decision.text}</span>
    </div>
  );
}
