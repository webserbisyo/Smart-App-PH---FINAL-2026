import {
  formatManila,
  formatPeso,
  formatStorage,
  manilaDate,
  manilaToDate,
  settingsWords,
  storageLevel,
  todayHoursText,
  words,
  type NotificationPrefs,
  type OwnerProfile,
  type OwnerSettings,
  type Plan,
  type StorageLevel,
  type StorageSummary,
} from '@smartapp/core';
import type { Appearance } from '@smartapp/core';
import type { SettingsSectionId } from './sections.js';

const S = settingsWords.status;

export type StatusTone = 'ok' | 'warning' | 'danger';
export interface SectionStatus {
  line: string;
  tone: StatusTone;
}

export interface StatusInputs {
  settings: OwnerSettings | undefined;
  profile: OwnerProfile | undefined;
  prefs: NotificationPrefs | undefined;
  plan: Plan | undefined;
  storage: StorageSummary | undefined;
  appearance: Appearance;
  shopLink: string;
  now: string;
}

/** "Sat 25 Oct" for a Manila calendar date. */
export function dayLabel(date: string): string {
  return formatManila(manilaToDate(date, '12:00'), 'date');
}

const LEVEL_TONE: Record<StorageLevel, StatusTone> = {
  ok: 'ok',
  high: 'ok',
  almost: 'warning',
  full: 'danger',
};

export function planStatusLine(plan: Plan): SectionStatus {
  switch (plan.status) {
    case 'trial':
      return {
        line: S.plan.trial(plan.trialEndsAt ? formatManila(plan.trialEndsAt, 'date') : ''),
        tone: 'ok',
      };
    case 'active':
      return { line: S.plan.active(plan.paidUntil ? dayLabel(plan.paidUntil) : ''), tone: 'ok' };
    case 'due':
      return {
        line: S.plan.due(plan.paidUntil ? dayLabel(plan.paidUntil) : ''),
        tone: 'warning',
      };
    case 'overdue':
      return {
        line: S.plan.overdue(plan.graceUntil ? dayLabel(plan.graceUntil) : ''),
        tone: 'danger',
      };
    case 'paused':
      return { line: S.plan.paused, tone: 'danger' };
  }
}

/** The one line under each section in the Settings list, from what is set now (decision T64). */
export function sectionStatus(id: SettingsSectionId, input: StatusInputs): SectionStatus | null {
  const { settings, profile, prefs, plan, storage } = input;
  switch (id) {
    case 'shop':
      return settings ? { line: S.shop(input.shopLink), tone: 'ok' } : null;
    case 'hours': {
      if (!settings) return null;
      const today = manilaDate(input.now);
      const text = todayHoursText(settings.hours, today);
      return { line: S.hoursOpen(`${settingsWords.hours.today} · ${text}`), tone: 'ok' };
    }
    case 'ordering': {
      if (!settings) return null;
      const names = settings.ordering.orderTypes.map((t) => words.shop.orderType[t]).join(', ');
      return { line: S.ordering(names, settings.ordering.rules.prepMinutes), tone: 'ok' };
    }
    case 'delivery': {
      if (!settings) return null;
      if (!settings.ordering.orderTypes.includes('delivery'))
        return { line: S.deliveryOff, tone: 'ok' };
      const d = settings.delivery;
      return {
        line: S.delivery(
          d.distance.length,
          d.zones.length,
          d.freeDeliveryFrom === null ? null : formatPeso(d.freeDeliveryFrom),
        ),
        tone: d.distance.length + d.zones.length === 0 ? 'warning' : 'ok',
      };
    }
    case 'payments': {
      if (!settings) return null;
      const list = settings.payments.payments;
      const names = list.map((p) => words.shop.paymentMethod[p.method]).join(', ');
      const sample = list.some((p) => p.sample);
      return {
        line: sample ? `${S.payments(names)} · ${S.sample}` : S.payments(names),
        tone: sample ? 'warning' : 'ok',
      };
    }
    case 'account':
      return profile
        ? {
            line: S.account(profile.name, settingsWords.account.appearance[input.appearance]),
            tone: 'ok',
          }
        : null;
    case 'notifications': {
      if (!prefs) return null;
      const on = [prefs.newOrder, prefs.paymentToCheck, prefs.storage, prefs.planPayment].filter(
        Boolean,
      ).length;
      return { line: S.notificationsOn(on), tone: 'ok' };
    }
    case 'plan':
      return plan ? planStatusLine(plan) : null;
    case 'storage':
      return storage
        ? {
            line: S.storage(formatStorage(storage.usedBytes), formatStorage(storage.limitBytes)),
            tone: LEVEL_TONE[storageLevel(storage.usedBytes, storage.limitBytes)],
          }
        : null;
  }
}
