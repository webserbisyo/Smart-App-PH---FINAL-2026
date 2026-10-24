import { z } from 'zod';

// Money in integer centavos (₱149 = 14900).
export const CentavosSchema = z.number().int().min(0);

// Times are ISO strings in UTC.
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });

// A Manila calendar date, YYYY-MM-DD.
export const IsoDateSchema = z.iso.date();

// 24-hour clock in Manila time, HH:MM. "24:00" closes at midnight.
export const ClockSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/);

// `demo:<slug>/<folder>/<name>` for demo photos, or a storage path later.
export const MediaRefSchema = z.string().min(1);

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLngSchema>;

export const IdSchema = z.string().min(1).max(64);
