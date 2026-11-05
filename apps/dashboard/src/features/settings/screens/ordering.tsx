import * as React from 'react';
import { BikeIcon, ShoppingBagIcon, StoreIcon } from 'lucide-react';
import {
  BookingRulesSchema,
  ORDER_TYPES,
  ordersWords,
  settingsWords,
  words,
  type OrderType,
  type OrderingSettings,
  type OwnerSettings,
} from '@smartapp/core';
import { useSaveOrdering } from '@smartapp/data';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import {
  BOOKING_RULE_FIELDS,
  BookingRulesFields,
  type BookingRuleField,
} from '@/app/booking-rules-fields';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  SwitchRow,
  WithSettings,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';

const W = settingsWords.ordering;
const TYPE_ICON: Record<OrderType, React.ReactNode> = {
  walk_in: <StoreIcon />,
  pickup: <ShoppingBagIcon />,
  delivery: <BikeIcon />,
};

export function OrderingSettingsScreen() {
  return <WithSettings>{(settings) => <OrderingForm settings={settings} />}</WithSettings>;
}

function OrderingForm({ settings }: { settings: OwnerSettings }) {
  const { draft, setDraft, dirty, reset } = useDraft<OrderingSettings>(settings.ordering);
  const saveOrdering = useSaveOrdering();
  const section = useSectionSave(settingsWords.sectionTitles.ordering);
  const [confirmOff, setConfirmOff] = React.useState<'pickup' | 'delivery' | null>(null);

  const parsed = BookingRulesSchema.safeParse(draft.rules);
  const errors: Partial<Record<BookingRuleField, string>> = {};
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = BOOKING_RULE_FIELDS.find((k) => k === issue.path[0]);
      if (key) errors[key] = ordersWords.bookingRules.fieldError[key];
    }
  const valid = parsed.success && draft.orderTypes.length > 0;

  const setType = (type: OrderType, on: boolean) =>
    setDraft((d) => ({
      ...d,
      orderTypes: on
        ? ORDER_TYPES.filter((t) => t === type || d.orderTypes.includes(t))
        : d.orderTypes.filter((t) => t !== type),
    }));

  const toggle = (type: OrderType, on: boolean) => {
    // Booked orders stay; the owner hears that before turning pickup or delivery off.
    if (!on && (type === 'pickup' || type === 'delivery') && settings.booked[type] > 0) {
      setConfirmOff(type);
      return;
    }
    setType(type, on);
  };

  const onlyOne = draft.orderTypes.length === 1;

  return (
    <SettingsPage id="ordering">
      <SettingsCard title={W.typesCard}>
        <div className="flex flex-col gap-3">
          {ORDER_TYPES.map((type) => {
            const on = draft.orderTypes.includes(type);
            const last = on && onlyOne;
            return (
              <SwitchRow
                key={type}
                id={`type-${type}`}
                icon={TYPE_ICON[type]}
                label={words.shop.orderType[type]}
                help={last ? W.lastType : W.typeHelp[type]}
                checked={on}
                disabled={last}
                onCheckedChange={(next) => toggle(type, next)}
              />
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title={W.timingCard}>
        <BookingRulesFields
          value={draft.rules}
          onChange={(rules) => setDraft((d) => ({ ...d, rules }))}
          errors={errors}
        />
      </SettingsCard>

      <AlertDialog
        open={confirmOff !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmOff(null);
        }}
      >
        <AlertDialogContent>
          {confirmOff ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {W.confirmOffTitle(words.shop.orderType[confirmOff])}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {W.confirmOffBody(settings.booked[confirmOff], words.shop.orderType[confirmOff])}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{W.keepOn}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setType(confirmOff, false);
                    setConfirmOff(null);
                  }}
                >
                  {W.turnOff}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : null}
        </AlertDialogContent>
      </AlertDialog>

      <SaveBar
        dirty={dirty}
        valid={valid}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={() => void section.save(() => saveOrdering.mutateAsync(draft))}
      />
    </SettingsPage>
  );
}
