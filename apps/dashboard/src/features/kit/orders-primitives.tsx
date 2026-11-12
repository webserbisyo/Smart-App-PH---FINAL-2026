import { useMemo, useState } from 'react';
import { DEMO_SHOPS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanOverlay,
  type KanbanCommitMeta,
} from '@smartapp/ui/components/reui/kanban';
import { Calendar } from '@smartapp/ui/components/calendar';
import { EventCalendar } from '@smartapp/ui/components/reui/event-calendar/event-calendar';
import type {
  CalendarEvent,
  CalendarView,
} from '@smartapp/ui/components/reui/event-calendar/event-calendar-types';
import { EventCalendarNav } from '@smartapp/ui/components/reui/event-calendar/event-calendar-nav';
import { EventCalendarContent } from '@smartapp/ui/components/reui/event-calendar/event-calendar-content';
import {
  WeekStripCalendar,
  type WeekStripDayState,
} from '@smartapp/ui/vendor/opensource-ui/week-strip-calendar';
import {
  BookingSlotCalendar,
  type BookingSlotGroup,
} from '@smartapp/ui/vendor/opensource-ui/booking-slot-calendar';
import { useCoarsePointer } from '@/app/use-coarse-pointer';
import { KitSection } from './kit-section.js';
import { DayChips, TimeChips } from '@smartapp/ui/compositions/slot-chips';
import { HourglassIcon } from 'lucide-react';

interface DemoCard {
  id: string;
  title: string;
  subtitle: string;
}

const COLUMN_KEYS = ['new', 'preparing', 'ready', 'out', 'done'] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];

const COLUMN_LABELS: Record<ColumnKey, string> = {
  new: 'New',
  preparing: 'Preparing',
  ready: 'Ready',
  out: 'Out',
  done: 'Done',
};

const INITIAL_KANBAN_CARDS: Record<string, DemoCard[]> = {
  new: [
    { id: 'ord-101', title: '#101 · Lola Remy', subtitle: 'Pandesal 12 pcs · ₱60.00' },
    { id: 'ord-102', title: '#102 · Lola Remy', subtitle: 'Ensaymada 6 pcs · ₱150.00' },
  ],
  preparing: [
    { id: 'ord-103', title: '#103 · Lola Remy', subtitle: 'Spanish Bread 10 pcs · ₱100.00' },
    { id: 'ord-104', title: '#104 · Lola Remy', subtitle: 'Pan de Coco 8 pcs · ₱80.00' },
  ],
  ready: [{ id: 'ord-105', title: '#105 · Lola Remy', subtitle: 'Monay 4 pcs · ₱40.00' }],
  out: [{ id: 'ord-106', title: '#106 · Lola Remy', subtitle: 'Bulk Pandesal 50 pcs · ₱250.00' }],
  done: [],
};

const AVAILABLE_VIEWS: CalendarView[] = ['month', 'week', 'agenda'];

function addDaysToDate(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DEMO_BOOKING_SLOT_GROUPS: readonly BookingSlotGroup[] = [
  {
    name: 'Morning',
    slots: [
      '8:00 AM',
      '8:30 AM',
      '9:00 AM',
      '9:30 AM',
      '10:00 AM',
      '10:30 AM',
      '11:00 AM',
      '11:30 AM',
    ],
  },
  {
    name: 'Afternoon',
    slots: ['1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'],
  },
  {
    name: 'Evening',
    slots: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM'],
  },
];

const FULL_BOOKING_SLOTS: readonly string[] = ['9:30 AM', '2:00 PM', '6:00 PM'];

function isColumnKey(val: string): val is ColumnKey {
  return val === 'new' || val === 'preparing' || val === 'ready' || val === 'out' || val === 'done';
}

export function OrdersPrimitiveSections() {
  const hardwareCoarse = useCoarsePointer();
  const [simulateCoarse, setSimulateCoarse] = useState(false);
  const isCoarse = hardwareCoarse || simulateCoarse;

  // 1. Kanban state
  const [columns, setColumns] = useState<Record<string, DemoCard[]>>(INITIAL_KANBAN_CARDS);
  const [snapBackNote, setSnapBackNote] = useState<string | null>(null);

  const allCards = useMemo(() => {
    return Object.values(columns).flat();
  }, [columns]);

  const handleValueCommit = (
    nextValue: Record<string, DemoCard[]>,
    meta: KanbanCommitMeta<DemoCard>,
  ) => {
    if (meta.kind === 'item') {
      const activeContainer = meta.activeContainer;
      const overContainer = meta.overContainer;
      if (isColumnKey(activeContainer) && isColumnKey(overContainer)) {
        const activeIdx = COLUMN_KEYS.indexOf(activeContainer);
        const overIdx = COLUMN_KEYS.indexOf(overContainer);
        // Snap-back rule: dropping 2 or more columns ahead is prevented and reverts
        if (activeIdx !== -1 && overIdx !== -1 && overIdx - activeIdx >= 2) {
          const fromCol = COLUMN_KEYS[activeIdx];
          const toCol = COLUMN_KEYS[overIdx];
          if (fromCol && toCol) {
            setSnapBackNote(
              `Snap back: skipped from ${COLUMN_LABELS[fromCol]} to ${COLUMN_LABELS[toCol]}. Move one column at a time.`,
            );
          }
          setColumns(meta.previousValue);
          return;
        }
      }
    }
    setSnapBackNote(null);
    setColumns(nextValue);
  };

  // 2. Calendar state
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [calendarDate, setCalendarDate] = useState<Date | undefined>(today);

  const bookedDays = useMemo(() => {
    return [addDaysToDate(today, 2), addDaysToDate(today, 5), addDaysToDate(today, 8)];
  }, [today]);

  // 3. Event Calendar state (Lola Remy 10 sample bookings)
  const lolaRemy = useMemo(
    () => DEMO_SHOPS.find((s) => s.slug === 'lola-remy') ?? DEMO_SHOPS[0],
    [],
  );

  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [canDragEvents, setCanDragEvents] = useState(false);

  const initialEvents: readonly CalendarEvent[] = useMemo(() => {
    const shopName = lolaRemy ? lolaRemy.name : 'Lola Remy';
    return [
      {
        id: 'lr-1',
        title: `${shopName}: Pandesal Morning Batch`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 6, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 30),
        color: 'var(--primary)',
      },
      {
        id: 'lr-2',
        title: `${shopName}: Ensaymada Catering`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 30),
        color: 'var(--warning)',
      },
      {
        id: 'lr-3',
        title: `${shopName}: Spanish Bread Church Delivery`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0),
        color: 'var(--info)',
      },
      {
        id: 'lr-4',
        title: `${shopName}: Ube Cheese Bulk Order`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 0),
        color: 'var(--success)',
      },
      {
        id: 'lr-5',
        title: `${shopName}: Suki Member Box`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0),
        color: 'var(--member)',
      },
      {
        id: 'lr-6',
        title: `${shopName}: Monay Afternoon Batch`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 8, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 30),
        color: 'var(--primary)',
      },
      {
        id: 'lr-7',
        title: `${shopName}: School Canteen Bread Trays`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 30),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 12, 0),
        color: 'var(--warning)',
      },
      {
        id: 'lr-8',
        title: `${shopName}: Custom Celebration Box`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 13, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 14, 30),
        color: 'var(--info)',
      },
      {
        id: 'lr-9',
        title: `${shopName}: Pandesal Batch #3`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 7, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 8, 30),
        color: 'var(--success)',
      },
      {
        id: 'lr-10',
        title: `${shopName}: Weekend Catering Panaderya`,
        start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 15, 0),
        end: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 17, 0),
        color: 'var(--member)',
      },
    ];
  }, [lolaRemy, today]);

  const [events, setEvents] = useState<CalendarEvent[]>([...initialEvents]);

  // 4. Week strip state (14 days, closed/full states)
  const [weekStripSelected, setWeekStripSelected] = useState<Date>(today);

  const weekStripDayStates: Record<string, WeekStripDayState> = useMemo(() => {
    return {
      [formatDateKey(addDaysToDate(today, 2))]: 'full',
      [formatDateKey(addDaysToDate(today, 4))]: 'closed',
      [formatDateKey(addDaysToDate(today, 7))]: 'full',
      [formatDateKey(addDaysToDate(today, 11))]: 'closed',
    };
  }, [today]);

  // 5. Booking slots state
  const [bookedSlot, setBookedSlot] = useState<string | null>(null);
  const [bookedDate, setBookedDate] = useState<Date | null>(null);

  return (
    <>
      {/* 1. Kanban */}
      <KitSection
        title="Kanban"
        library="ReUI"
        path="packages/ui/src/components/reui/kanban.tsx"
        usedIn="kit (Orders in O3 to O6)"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              5 columns · 6 plain cards · Drag with mouse, move with Space/arrows. Drop 2+ columns
              ahead snaps back.
            </span>
            <Button
              type="button"
              variant={simulateCoarse ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSimulateCoarse(!simulateCoarse)}
            >
              {isCoarse ? 'Touch pointer (drag disabled)' : 'Mouse pointer (drag enabled)'}
            </Button>
          </div>

          {snapBackNote && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-warning-foreground">
              {snapBackNote}
            </div>
          )}

          <div className="overflow-x-auto pb-2">
            <Kanban
              value={columns}
              onValueChange={(val) => setColumns(val)}
              getItemValue={(item) => item.id}
              restoreOnCancel={true}
              onValueCommit={(val, meta) => handleValueCommit(val, meta)}
            >
              <KanbanBoard className="flex min-w-190 gap-3">
                {COLUMN_KEYS.map((key) => {
                  const cardList = columns[key] ?? [];
                  return (
                    <KanbanColumn
                      key={key}
                      value={key}
                      disabled={isCoarse}
                      className="min-w-36 flex-1 rounded-xl border border-border bg-muted/40 p-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                          {COLUMN_LABELS[key]}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">
                          {cardList.length}
                        </span>
                      </div>

                      <KanbanColumnContent value={key} className="min-h-28 gap-2">
                        {cardList.map((card) => (
                          <KanbanItem
                            key={card.id}
                            value={card.id}
                            disabled={isCoarse}
                            className="cursor-grab rounded-lg border border-border bg-card p-3 text-card-foreground shadow-xs focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
                          >
                            <div className="text-sm font-medium">{card.title}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {card.subtitle}
                            </div>
                          </KanbanItem>
                        ))}
                      </KanbanColumnContent>
                    </KanbanColumn>
                  );
                })}
              </KanbanBoard>

              <KanbanOverlay>
                {({ value: activeId }) => {
                  const card = allCards.find((c) => c.id === activeId);
                  if (!card) return null;
                  return (
                    <div className="rounded-lg border border-primary bg-card p-3 text-card-foreground shadow-lg">
                      <div className="text-sm font-medium">{card.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{card.subtitle}</div>
                    </div>
                  );
                }}
              </KanbanOverlay>
            </Kanban>
          </div>
        </div>
      </KitSection>

      {/* 2. Calendar */}
      <KitSection
        title="Calendar"
        library="shadcn"
        path="packages/ui/src/components/calendar.tsx"
        usedIn="kit (Orders in O3 to O6)"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Single date with today marked, disabled past days, and modifiers dot under booked days
            (2, 5, and 8 days ahead).
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <Calendar
              mode="single"
              selected={calendarDate}
              onSelect={setCalendarDate}
              disabled={{ before: today }}
              modifiers={{ booked: bookedDays }}
              modifiersClassNames={{
                booked:
                  'relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:size-1 after:rounded-full after:bg-primary',
              }}
              className="rounded-xl border border-border p-3 shadow-xs"
            />
            <div className="space-y-1 rounded-xl border border-border bg-card p-4 text-xs text-card-foreground">
              <div className="text-sm font-semibold">Selected date</div>
              <div className="text-muted-foreground">
                {calendarDate ? calendarDate.toLocaleDateString() : 'None'}
              </div>
              <div className="pt-2 text-muted-foreground">
                Dots mark booked order delivery windows.
              </div>
            </div>
          </div>
        </div>
      </KitSection>

      {/* 3. Event Calendar */}
      <KitSection
        title="Event Calendar"
        library="ReUI"
        path="packages/ui/src/components/reui/event-calendar/event-calendar.tsx"
        usedIn="Orders Bookings view (T83): Week and Month on a laptop, List on phones, drag to change the time"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              10 sample bookings for {lolaRemy ? lolaRemy.name : 'Lola Remy'} · Month, Week, and
              Agenda views · Mapped tokens.
            </span>
            <Button
              type="button"
              variant={canDragEvents ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCanDragEvents(!canDragEvents)}
            >
              {canDragEvents ? 'Drag enabled' : 'Read-only (drag disabled)'}
            </Button>
          </div>

          <div className="h-130 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-xs">
            <EventCalendar
              events={events}
              onEventsChange={(evts) => setEvents([...evts])}
              view={calendarView}
              onViewChange={(v) => setCalendarView(v)}
              views={AVAILABLE_VIEWS}
              interactions={
                canDragEvents ? { drag: true, resize: false } : { drag: false, resize: false }
              }
            >
              <EventCalendarNav />
              <EventCalendarContent />
            </EventCalendar>
          </div>
        </div>
      </KitSection>

      {/* 4. Week strip */}
      <KitSection
        title="Week Strip Calendar"
        library="Opensource UI"
        path="packages/ui/src/vendor/opensource-ui/week-strip-calendar.tsx"
        usedIn="kit (Orders in O3 to O6)"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            14 days from today · Closed and Full indicators · Swipe weeks with arrows.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <WeekStripCalendar
              selected={weekStripSelected}
              onSelect={setWeekStripSelected}
              dayStates={weekStripDayStates}
            />
            <div className="space-y-1 rounded-xl border border-border bg-card p-4 text-xs text-card-foreground">
              <div className="text-sm font-semibold">Selected date</div>
              <div className="text-muted-foreground">{weekStripSelected.toLocaleDateString()}</div>
              <div className="pt-2 text-muted-foreground">
                State: {weekStripDayStates[formatDateKey(weekStripSelected)] ?? 'open'}
              </div>
            </div>
          </div>
        </div>
      </KitSection>

      {/* 4b. Slot chips (T85) */}
      <KitSection
        title="Slot chips (our composition)"
        library="composition (Scroller + Toggle Group)"
        path="packages/ui/src/compositions/slot-chips.tsx"
        usedIn="storefront When picker, order panel Change time, Orders Calendar phone day row (T85)"
      >
        <SlotChipsExample />
      </KitSection>

      {/* 5. Booking slots */}
      <KitSection
        title="Booking Slot Calendar"
        library="Opensource UI"
        path="packages/ui/src/vendor/opensource-ui/booking-slot-calendar.tsx"
        usedIn="kit only (the storefront When picker follows this pattern with installed parts, T83)"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Morning, Afternoon and Evening groups of 30-minute slots · 3 full slots crossed out.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <BookingSlotCalendar
              title="Delivery or Pickup window"
              subtitle="30 min · Lola Remy bakery"
              slots={DEMO_BOOKING_SLOT_GROUPS}
              takenSlots={FULL_BOOKING_SLOTS}
              onBook={(date, slot) => {
                setBookedDate(date);
                setBookedSlot(slot);
              }}
            />
            <div className="space-y-1 rounded-xl border border-border bg-card p-4 text-xs text-card-foreground">
              <div className="text-sm font-semibold">Booked appointment</div>
              <div className="text-muted-foreground">
                {bookedDate && bookedSlot
                  ? `${bookedDate.toLocaleDateString()} at ${bookedSlot}`
                  : 'Tap a slot to reserve'}
              </div>
              <div className="pt-2 text-muted-foreground">
                Full slots: {FULL_BOOKING_SLOTS.join(', ')}
              </div>
            </div>
          </div>
        </div>
      </KitSection>
    </>
  );
}

function SlotChipsExample() {
  const [day, setDay] = useState<string | null>('sat');
  const [time, setTime] = useState<string | null>('11');
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <DayChips
        label="Pick a day"
        value={day}
        onValueChange={setDay}
        pressedClassName="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        chips={[
          {
            value: 'fri',
            label: 'Today',
            detail: 'Too soon',
            icon: <HourglassIcon className="size-3" />,
            disabled: true,
          },
          { value: 'sat', label: 'Tomorrow', detail: '5 orders', tone: 'primary', current: true },
          { value: 'sun', label: 'Sun 15', detail: 'Closed', disabled: true },
          { value: 'mon', label: 'Mon 16', detail: 'Full', tone: 'danger', disabled: true },
          { value: 'tue', label: 'Tue 17' },
          { value: 'wed', label: 'Wed 18' },
        ]}
      />
      <TimeChips
        label="Pick a time"
        value={time}
        onValueChange={setTime}
        pressedClassName="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
        chips={[
          { value: '9', label: '9:00 AM', detail: 'Now', current: true, disabled: true },
          {
            value: '10',
            label: '10:00 AM',
            detail: 'Full',
            struck: true,
            disabled: true,
            tone: 'danger',
          },
          { value: '11', label: '11:00 AM', detail: '2 left', tone: 'warning' },
          { value: '12', label: '12:00 PM' },
        ]}
      />
    </div>
  );
}
