import { describe, expect, it } from 'vitest';
import {
  closedStateDecision,
  isFixableProblem,
  lineProblemMessage,
  stampProgressDecision,
} from './basket-rules';
import { SHOP_PACKS, type OpenState, type PublicStampCard } from '@smartapp/core';

describe('basket rules and helpers', () => {
  describe('lineProblemMessage', () => {
    it('formats sold out and missing messages', () => {
      expect(lineProblemMessage({ code: 'sold_out', groupId: null, groupName: null })).toBe(
        'Sold out',
      );
      expect(lineProblemMessage({ code: 'sold_out_today', groupId: null, groupName: null })).toBe(
        'Sold out today',
      );
      expect(lineProblemMessage({ code: 'item_missing', groupId: null, groupName: null })).toBe(
        'No longer available',
      );
      expect(lineProblemMessage({ code: 'variant_missing', groupId: null, groupName: null })).toBe(
        'This choice is no longer available',
      );
      expect(lineProblemMessage({ code: 'option_missing', groupId: null, groupName: null })).toBe(
        'An add-on was removed',
      );
    });

    it('formats group-related problem messages with group name', () => {
      expect(
        lineProblemMessage({ code: 'required_missing', groupId: 'g1', groupName: 'Patty' }),
      ).toBe('Choose Patty');
      expect(
        lineProblemMessage({ code: 'option_sold_out', groupId: 'g2', groupName: 'Drink' }),
      ).toBe('Drink: one choice is sold out');
      expect(lineProblemMessage({ code: 'too_few', groupId: 'g3', groupName: 'Sides' })).toBe(
        'Choose more for Sides',
      );
      expect(lineProblemMessage({ code: 'too_many', groupId: 'g4', groupName: 'Extras' })).toBe(
        'Too many for Extras',
      );
    });

    it('formats price changed message with and without amounts', () => {
      expect(
        lineProblemMessage({ code: 'price_changed', groupId: null, groupName: null }, 14900, 15900),
      ).toBe('Price changed from ₱149 to ₱159');
      expect(lineProblemMessage({ code: 'price_changed', groupId: null, groupName: null })).toBe(
        'Price changed',
      );
    });
  });

  describe('isFixableProblem', () => {
    it('returns true for reconfigurable issues', () => {
      expect(
        isFixableProblem({ code: 'required_missing', groupId: 'g1', groupName: 'Patty' }),
      ).toBe(true);
      expect(isFixableProblem({ code: 'variant_missing', groupId: null, groupName: null })).toBe(
        true,
      );
      expect(isFixableProblem({ code: 'too_few', groupId: 'g1', groupName: 'Sides' })).toBe(true);
    });

    it('returns false for permanent sold out or removed items', () => {
      expect(isFixableProblem({ code: 'sold_out', groupId: null, groupName: null })).toBe(false);
      expect(isFixableProblem({ code: 'sold_out_today', groupId: null, groupName: null })).toBe(
        false,
      );
      expect(isFixableProblem({ code: 'item_missing', groupId: null, groupName: null })).toBe(
        false,
      );
    });
  });

  describe('closedStateDecision', () => {
    const mockSf = SHOP_PACKS['lola-remy'].storefront;

    it('handles offline state', () => {
      const openState: OpenState = {
        state: 'open',
        closesAt: '2026-10-25T13:00:00.000Z',
        nextOpening: null,
        busyUntil: null,
        paused: false,
      };
      const res = closedStateDecision({
        sf: mockSf,
        openState,
        isOnline: false,
        now: '2026-10-25T02:00:00.000Z',
      });
      expect(res.state).toBe('offline');
      expect(res.alertMessage).toBe("You're offline. Your basket is saved.");
      expect(res.buttonDisabled).toBe(true);
    });

    it('handles paused state', () => {
      const openState: OpenState = {
        state: 'open',
        closesAt: null,
        nextOpening: null,
        busyUntil: null,
        paused: true,
      };
      const res = closedStateDecision({
        sf: mockSf,
        openState,
        isOnline: true,
        now: '2026-10-25T02:00:00.000Z',
      });
      expect(res.state).toBe('paused');
      expect(res.alertMessage).toBe('Not taking orders right now');
      expect(res.buttonDisabled).toBe(true);
    });

    it('handles busy state with return time', () => {
      const openState: OpenState = {
        state: 'busy',
        closesAt: null,
        nextOpening: null,
        busyUntil: '2026-10-25T07:40:00.000Z', // 3:40 PM Manila
        paused: false,
      };
      const res = closedStateDecision({
        sf: mockSf,
        openState,
        isOnline: true,
        now: '2026-10-25T06:00:00.000Z',
      });
      expect(res.state).toBe('busy');
      expect(res.alertMessage).toContain('Busy · back');
      expect(res.buttonDisabled).toBe(false);
    });

    it('handles closed state with scheduling on today', () => {
      const openState: OpenState = {
        state: 'closed',
        closesAt: null,
        nextOpening: '2026-10-24T21:00:00.000Z', // Oct 25 5:00 AM Manila
        busyUntil: null,
        paused: false,
      };
      const res = closedStateDecision({
        sf: mockSf,
        openState,
        isOnline: true,
        now: '2026-10-24T20:30:00.000Z', // Oct 25 4:30 AM Manila
      });
      expect(res.state).toBe('closed_with_scheduling');
      expect(res.alertMessage).toContain('Closed now · Opens');
      expect(res.alertMessage).toContain('Your basket is saved.');
      expect(res.buttonLabel).toContain('Schedule for');
      expect(res.buttonDisabled).toBe(false);
    });

    it('handles closed state without scheduling', () => {
      const openState: OpenState = {
        state: 'closed',
        closesAt: null,
        nextOpening: '2026-10-24T21:00:00.000Z', // Oct 25 5:00 AM Manila
        busyUntil: null,
        paused: false,
      };
      const sfNoSchedule = { ...mockSf, takeOrdersWhileClosed: false };
      const res = closedStateDecision({
        sf: sfNoSchedule,
        openState,
        isOnline: true,
        now: '2026-10-24T20:30:00.000Z',
      });
      expect(res.state).toBe('closed_no_scheduling');
      expect(res.alertMessage).toContain('Opens');
      expect(res.alertMessage).toContain('Your basket is saved.');
      expect(res.buttonDisabled).toBe(true);
    });
  });

  describe('stampProgressDecision', () => {
    const stampCard: PublicStampCard = {
      status: 'on',
      rule: {
        stampsNeeded: 10,
        minOrderTotal: 15000, // ₱150
        welcomeStamps: 1,
        maxEarned: 1,
        period: 'day',
      },
      reward: {
        kind: 'discount',
        amount: 10000,
        itemId: null,
        variantId: null,
        title: '₱100 off',
        description: '',
        image: null,
        quantityTotal: null,
        quantityLeft: null,
        onePerCustomer: false,
      },
    };

    it('returns null when card is off', () => {
      expect(stampProgressDecision({ ...stampCard, status: 'off' }, 20000)).toBeNull();
    });

    it('returns earns when subtotal meets minimum', () => {
      const res = stampProgressDecision(stampCard, 15000, 0);
      expect(res).not.toBeNull();
      expect(res?.earns).toBe(true);
      expect(res?.text).toBe('This order earns 1 stamp');
    });

    it('returns spend more when subtotal is below minimum', () => {
      const res = stampProgressDecision(stampCard, 8000, 0);
      expect(res).not.toBeNull();
      expect(res?.earns).toBe(false);
      expect(res?.text).toBe('Spend ₱70 more to earn a stamp');
    });

    it('returns already earned when cap is reached', () => {
      const res = stampProgressDecision(stampCard, 20000, 1);
      expect(res).not.toBeNull();
      expect(res?.earns).toBe(false);
      expect(res?.text).toBe('You already earned today’s stamp');
    });
  });
});
