// The founder's Setup (T92), shared by owner Settings and Super Admin so a price change shows on every Plan
// page. Small on purpose: the store imports it up front, the rest of Super Admin loads on first use.
import { PLAN_TRIAL_DAYS, type PlanPayTo } from '@smartapp/core';

/** The founder's Setup (T92), shared with owner Settings so a price change shows on every Plan page. */
export interface PlatformSetupState {
  priceMonthly: number;
  trialDays: number;
  sixMonthBonus: boolean;
  payTo: PlanPayTo;
  messengerUrl: string;
}

export function defaultPlatformSetup(priceMonthly: number): PlatformSetupState {
  return {
    priceMonthly,
    trialDays: PLAN_TRIAL_DAYS,
    // Approved 2026-11-13 (T92): pay 6 months, get 1 free.
    sixMonthBonus: true,
    payTo: { accountName: 'Smart App PH', gcash: '0917 000 0399', maya: '0917 000 0399' },
    messengerUrl: 'https://m.me/smartappph',
  };
}
