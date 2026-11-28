import { describe, expect, it } from 'vitest';
import { slotColumns } from '../src/index.js';

// The time picker's columns (T129). Manila helper: "2026-12-02 06:00" → ISO UTC.
const mnl = (local: string) => new Date(`${local.replace(' ', 'T')}:00+08:00`).toISOString();

describe('slotColumns (T129)', () => {
  // Lola Remy on a Wednesday: hourly, 6 AM to 11 AM and 2 PM to 7 PM.
  const hourly = [6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19].map((h) => ({
    at: mnl(`2026-12-02 ${String(h).padStart(2, '0')}:00`),
  }));

  it('hourly times: no Minute column, AM and PM, only the real hours', () => {
    const cols = slotColumns(hourly, null);
    expect(cols.showMinutes).toBe(false);
    expect(cols.periods.map((p) => p.value)).toEqual(['AM', 'PM']);
    expect(cols.period).toBe('AM');
    expect(cols.hours.map((h) => h.label)).toEqual(['6', '7', '8', '9', '10', '11']);
    expect(cols.hour).toBeNull();
  });

  it('the picked time decides the part of the day and the hour', () => {
    const cols = slotColumns(hourly, mnl('2026-12-02 15:00'));
    expect(cols.period).toBe('PM');
    expect(cols.hours.map((h) => h.label)).toEqual(['2', '3', '4', '5', '6', '7']);
    expect(cols.hour).toBe('15');
  });

  it('half-hour times show minutes for the picked hour, and a full hour is crossed out', () => {
    const slots = [
      { at: mnl('2026-12-02 11:00'), disabled: true },
      { at: mnl('2026-12-02 11:30'), disabled: true },
      { at: mnl('2026-12-02 12:00') },
      { at: mnl('2026-12-02 12:30') },
    ];
    const cols = slotColumns(slots, mnl('2026-12-02 12:30'));
    expect(cols.showMinutes).toBe(true);
    // Before and after noon: 11 AM is AM, 12 NN is PM.
    expect(cols.periods).toEqual([
      { value: 'AM', firstOpen: null },
      { value: 'PM', firstOpen: mnl('2026-12-02 12:00') },
    ]);
    expect(cols.hours.map((h) => [h.label, h.firstOpen])).toEqual([
      ['12', mnl('2026-12-02 12:00')],
    ]);
    expect(cols.minutes.map((m) => m.label)).toEqual(['00', '30']);
    // Nothing picked: it opens on the first part with an open time.
    expect(slotColumns(slots, null).period).toBe('PM');
  });

  it('keeps a tapped hour while no time in it is picked', () => {
    const slots = [{ at: mnl('2026-12-02 09:00') }, { at: mnl('2026-12-02 09:15') }];
    const cols = slotColumns(slots, null, { period: 'AM', hour: '09' });
    expect(cols.hour).toBe('09');
    expect(cols.minutes.map((m) => m.label)).toEqual(['00', '15']);
  });
});
