import {
  addDays,
  homeWords,
  HOME_PERIOD_MAX_DAYS,
  periodDates,
  type HomePeriod,
  type PeriodDates,
} from '@smartapp/core';
import { PeriodPicker as Picker, rangeText, type PeriodPick } from '@/app/period-picker';

const W = homeWords.period;
type Quick = Exclude<HomePeriod, 'custom'>;
const QUICK: readonly Quick[] = ['today', 'yesterday', '7d', '30d', 'month'];
const PICKS: readonly PeriodPick<Quick>[] = QUICK.map((id) => ({ id, label: W.picks[id] }));

/** "Last 7 days", or the picked dates. */
export function periodLabel(period: HomePeriod, dates: PeriodDates): string {
  return period === 'custom' ? rangeText(dates, W.range) : W.picks[period];
}

/** Home's period picker (T83): the shared picker with Home's picks, the last 60 days, never the future. */
export function PeriodPicker({
  period,
  dates,
  today,
  onChange,
}: {
  period: HomePeriod;
  dates: PeriodDates;
  today: string;
  onChange: (period: HomePeriod, dates?: PeriodDates) => void;
}) {
  return (
    <Picker
      picks={PICKS}
      picked={period === 'custom' ? null : period}
      dates={dates}
      label={periodLabel(period, dates)}
      words={W}
      earliest={addDays(today, -(HOME_PERIOD_MAX_DAYS - 1))}
      latest={today}
      maxDays={HOME_PERIOD_MAX_DAYS}
      onPick={(p) => onChange(p)}
      onRange={(picked) => {
        // Dates that match a quick pick show as that pick.
        const quick = QUICK.find((p) => {
          const d = periodDates(p, today);
          return d.from === picked.from && d.to === picked.to;
        });
        onChange(quick ?? 'custom', quick ? undefined : picked);
      }}
    />
  );
}
