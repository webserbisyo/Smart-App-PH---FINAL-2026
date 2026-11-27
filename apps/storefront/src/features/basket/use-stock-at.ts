'use client';

import { availabilityAt } from '@smartapp/core';
import { useLocationChoice } from '../location/components/use-location-choice';

/**
 * When stock is judged on this phone (T127): the booked time the customer picked in How and where when it
 * is still ahead, else now. The server judges it the same way (`availabilityAt` in the quote).
 */
export function useStockAt(slug: string, now: string | Date | null | undefined): Date {
  const { choice } = useLocationChoice(slug);
  return availabilityAt(choice.scheduledAt, now ?? new Date());
}
