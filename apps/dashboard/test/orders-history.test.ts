import { describe, expect, it } from 'vitest';
import type { BoardOrder } from '@smartapp/core';
import { formatPeso, manilaDate } from '@smartapp/core';

function mockHistoryOrder(patch: Partial<BoardOrder> = {}): BoardOrder {
  return {
    id: 'ord_hist_1',
    token: 'tok_hist_123',
    orderNo: 12,
    type: 'pickup',
    status: 'completed',
    paymentStatus: 'paid',
    paymentMethod: 'gcash',
    scheduledAt: null,
    placedAt: '2026-11-02T02:30:00.000Z', // Sun 2 Nov 2026 10:30 AM Manila
    customerName: 'Corazon Aquino',
    customerPhone: '+639181234567',
    isFirstOrder: false,
    isMember: false,
    hasReward: false,
    itemsSummary: '1 × Ensaymada Box',
    total: 35000,
    dueAt: '2026-11-02T03:00:00.000Z',
    startBy: '2026-11-02T02:30:00.000Z',
    pickupCode: 'ENSA',
    seenAt: '2026-11-02T02:30:00.000Z',
    lines: [
      {
        itemId: 'item_ensaymada',
        qty: 1,
        name: 'Ensaymada Box',
        variantLabel: '6 pcs',
        optionLabels: [],
        note: null,
      },
    ],
    moreLines: 0,
    note: null,
    ownerNote: null,
    deliveryArea: null,
    lastStepAt: '2026-11-02T03:00:00.000Z',
    totals: {
      subtotal: 35000,
      deliveryFee: 0,
      discount: 0,
      total: 35000,
    },
    ...patch,
  };
}

describe('O4 History tab: date change, search by number, name, phone, and total sales', () => {
  const sampleOrders: BoardOrder[] = [
    mockHistoryOrder({
      id: 'ord_1',
      orderNo: 101,
      customerName: 'Juan dela Cruz',
      customerPhone: '+639171112233',
      placedAt: '2026-11-02T02:00:00.000Z', // 2026-11-02
      totals: { subtotal: 25000, deliveryFee: 0, discount: 0, total: 25000 },
      status: 'completed',
    }),
    mockHistoryOrder({
      id: 'ord_2',
      orderNo: 102,
      customerName: 'Maria Clara',
      customerPhone: '+639185556677',
      placedAt: '2026-11-02T05:00:00.000Z', // 2026-11-02
      totals: { subtotal: 45000, deliveryFee: 0, discount: 0, total: 45000 },
      status: 'completed',
    }),
    mockHistoryOrder({
      id: 'ord_3',
      orderNo: 103,
      customerName: 'Crisostomo Ibarra',
      customerPhone: '+639199998888',
      placedAt: '2026-11-02T08:00:00.000Z', // 2026-11-02
      totals: { subtotal: 10000, deliveryFee: 0, discount: 0, total: 10000 },
      status: 'cancelled', // Cancelled order excluded from total sales
    }),
    mockHistoryOrder({
      id: 'ord_4',
      orderNo: 104,
      customerName: 'Andres Bonifacio',
      customerPhone: '+639201234567',
      placedAt: '2026-11-03T02:00:00.000Z', // 2026-11-03
      totals: { subtotal: 30000, deliveryFee: 0, discount: 0, total: 30000 },
      status: 'completed',
    }),
  ];

  it('filters orders by Manila calendar date', () => {
    const nov2Orders = sampleOrders.filter((o) => manilaDate(o.placedAt) === '2026-11-02');
    expect(nov2Orders).toHaveLength(3);

    const nov3Orders = sampleOrders.filter((o) => manilaDate(o.placedAt) === '2026-11-03');
    expect(nov3Orders).toHaveLength(1);
    expect(nov3Orders[0]?.orderNo).toBe(104);
  });

  it('searches orders by order number, customer name, and customer phone', () => {
    const nov2Orders = sampleOrders.filter((o) => manilaDate(o.placedAt) === '2026-11-02');

    // 1. Search by order number (string or padded)
    const searchByNumber = (q: string) =>
      nov2Orders.filter(
        (o) =>
          String(o.orderNo).includes(q) ||
          `#${String(o.orderNo).padStart(3, '0')}`.toLowerCase().includes(q.toLowerCase()),
      );
    expect(searchByNumber('101')).toHaveLength(1);
    expect(searchByNumber('101')[0]?.customerName).toBe('Juan dela Cruz');
    expect(searchByNumber('#102')).toHaveLength(1);

    // 2. Search by customer name (case-insensitive substring)
    const searchByName = (q: string) =>
      nov2Orders.filter((o) => o.customerName.toLowerCase().includes(q.toLowerCase()));
    expect(searchByName('clara')).toHaveLength(1);
    expect(searchByName('clara')[0]?.orderNo).toBe(102);

    // 3. Search by customer phone
    const searchByPhone = (q: string) => nov2Orders.filter((o) => o.customerPhone?.includes(q));
    expect(searchByPhone('5556677')).toHaveLength(1);
    expect(searchByPhone('5556677')[0]?.customerName).toBe('Maria Clara');
  });

  it('calculates total sales for the date, excluding cancelled/expired orders', () => {
    const nov2Orders = sampleOrders.filter((o) => manilaDate(o.placedAt) === '2026-11-02');

    const totalSales = nov2Orders
      .filter((o) => o.status !== 'cancelled' && o.status !== 'expired')
      .reduce((sum, o) => sum + o.totals.total, 0);

    // 25000 + 45000 = 70000 centavos = ₱700 (ord_3 with 10000 cancelled is excluded)
    expect(totalSales).toBe(70000);
    expect(formatPeso(totalSales)).toBe('₱700');
  });
});
