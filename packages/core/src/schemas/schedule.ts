import { z } from 'zod';
import { IdSchema, IsoDateSchema, IsoDateTimeSchema } from './common.js';
import { ScheduleDayStateEnum, ScheduleSlotStateEnum } from './enums.js';

export const ScheduleSlotSchema = z.object({
  at: IsoDateTimeSchema,
  state: ScheduleSlotStateEnum,
  // Orders this time can still take (T85): null when the shop has no per-time limit.
  left: z.number().int().nonnegative().nullable().optional(),
  // Orders already on this time. Only on the owner's schedule for moving an order (T86).
  booked: z.number().int().nonnegative().optional(),
});
export type ScheduleSlot = z.infer<typeof ScheduleSlotSchema>;

export const ScheduleDaySchema = z.object({
  date: IsoDateSchema,
  state: ScheduleDayStateEnum,
  slots: z.array(ScheduleSlotSchema),
  // Orders already on this day. Only on the owner's schedule for moving an order (T86).
  booked: z.number().int().nonnegative().optional(),
});
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;

export const ScheduleNoticeItemSchema = z.object({
  name: z.string().min(1),
  noticeDays: z.number().int().min(1).max(30),
});
export type ScheduleNoticeItem = z.infer<typeof ScheduleNoticeItemSchema>;

export const ScheduleSchema = z.object({
  days: z.array(ScheduleDaySchema),
  earliest: IsoDateTimeSchema.nullable(),
  noticeItem: ScheduleNoticeItemSchema.nullable(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const DayLoadItemSchema = z.object({
  itemId: IdSchema,
  name: z.string().min(1),
  count: z.number().int().nonnegative(),
  limit: z.number().int().positive().nullable(),
});
export type DayLoadItem = z.infer<typeof DayLoadItemSchema>;

export const DayLoadSchema = z.object({
  date: IsoDateSchema,
  orders: z.number().int().nonnegative(),
  items: z.array(DayLoadItemSchema),
  slotsFull: z.number().int().nonnegative(),
});
export type DayLoad = z.infer<typeof DayLoadSchema>;
