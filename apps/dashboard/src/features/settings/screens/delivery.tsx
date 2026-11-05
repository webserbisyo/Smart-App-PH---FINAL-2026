import * as React from 'react';
import { Link } from '@tanstack/react-router';
import { CalculatorIcon, MapPinOffIcon, PlusIcon, Trash2Icon, TruckIcon } from 'lucide-react';
import {
  distanceRowFor,
  distanceRowProblems,
  formatPeso,
  nextDistanceRow,
  settingsWords,
  type DeliverySettings,
  type DistanceRow,
  type OwnerSettings,
} from '@smartapp/core';
import { useSaveDelivery } from '@smartapp/data';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@smartapp/ui/components/input-group';
import { Notice } from '@/app/notice';
import { PageEmpty } from '@/app/page-state';
import { PesoInput } from '@/app/peso-input';
import {
  SaveBar,
  SettingsCard,
  SettingsPage,
  SwitchRow,
  WithSettings,
  useDraft,
  useSectionSave,
} from '../settings-ui.js';

const W = settingsWords.delivery;
const MAX_ROWS = 5;
const MAX_ZONES = 20;

/** Each row starts where the row above ends, so there is never a gap (N25). */
function chain(rows: readonly DistanceRow[]): DistanceRow[] {
  let from = 0;
  return rows.map((row) => {
    const next = { ...row, fromKm: from };
    from = row.toKm;
    return next;
  });
}

function kmText(km: number): string {
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}

export function DeliverySettingsScreen() {
  return <WithSettings>{(settings) => <DeliveryForm settings={settings} />}</WithSettings>;
}

function DeliveryForm({ settings }: { settings: OwnerSettings }) {
  const { draft, setDraft, dirty, reset } = useDraft<DeliverySettings>(settings.delivery);
  const saveDelivery = useSaveDelivery();
  const section = useSectionSave(settingsWords.sectionTitles.delivery);

  if (!settings.ordering.orderTypes.includes('delivery'))
    return (
      <SettingsPage id="delivery">
        <PageEmpty
          variant="box"
          icon={<TruckIcon />}
          title={W.offTitle}
          description={W.offLine}
          action={
            <Button
              nativeButton={false}
              render={<Link to="/settings/ordering" />}
              className="h-11 md:h-9"
            >
              {W.openOrdering}
            </Button>
          }
        />
      </SettingsPage>
    );

  const rows = draft.distance;
  const problems = distanceRowProblems(rows);
  const zonesValid = draft.zones.every((z) => z.name.trim() && z.etaText.trim());
  const rowsValid = rows.every((r) => r.etaText.trim());
  const valid = problems.size === 0 && zonesValid && rowsValid;
  const setRows = (distance: DistanceRow[]) =>
    setDraft((d) => ({ ...d, distance: chain(distance) }));
  const updateRow = (index: number, patch: Partial<DistanceRow>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <SettingsPage id="delivery">
      <SettingsCard title={W.distanceCard} description={W.distanceLine}>
        {settings.shop.contact.pin === null ? (
          <Notice
            tone="warning"
            icon={<MapPinOffIcon className="size-4" />}
            action={
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<Link to="/settings/shop" />}
              >
                {W.openShop}
              </Button>
            }
          >
            {W.noPin}
          </Notice>
        ) : null}
        <ol className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const problem = problems.get(index);
            return (
              <li
                key={index}
                className="flex flex-col gap-3 rounded-lg border border-border p-3"
                aria-label={W.row(index + 1)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {W.row(index + 1)}
                    <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                      {kmText(row.fromKm)} – {kmText(row.toKm)} km
                    </span>
                  </p>
                  {rows.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 text-muted-foreground md:size-9"
                      aria-label={W.removeRow(index + 1)}
                      onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    >
                      <Trash2Icon />
                    </Button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field>
                    <FieldLabel htmlFor={`row-${index}-to`}>{W.toKm}</FieldLabel>
                    <KmInput
                      id={`row-${index}-to`}
                      value={row.toKm}
                      invalid={problem !== undefined}
                      onChange={(toKm) => updateRow(index, { toKm })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`row-${index}-fee`}>{W.fee}</FieldLabel>
                    <PesoInput
                      id={`row-${index}-fee`}
                      value={row.fee}
                      onChange={(fee) => updateRow(index, { fee })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`row-${index}-eta`}>{W.eta}</FieldLabel>
                    <Input
                      className="h-11 md:h-9"
                      id={`row-${index}-eta`}
                      value={row.etaText}
                      maxLength={40}
                      aria-invalid={row.etaText.trim() ? undefined : true}
                      onChange={(e) => updateRow(index, { etaText: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`row-${index}-min`}>{W.minOrder}</FieldLabel>
                    <PesoInput
                      id={`row-${index}-min`}
                      value={row.minOrder}
                      onChange={(minOrder) => updateRow(index, { minOrder })}
                    />
                  </Field>
                </div>
                {problem ? (
                  <p role="alert" className="text-xs font-medium text-destructive-text">
                    {W.rowProblems[problem]}
                  </p>
                ) : !row.etaText.trim() ? (
                  <p role="alert" className="text-xs font-medium text-destructive-text">
                    {W.etaRequired}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
        {rows.length < MAX_ROWS ? (
          <Button
            variant="outline"
            className="h-11 self-start md:h-9"
            onClick={() => setRows([...rows, nextDistanceRow(rows)])}
          >
            <PlusIcon />
            {W.addRow}
          </Button>
        ) : null}
      </SettingsCard>

      <SettingsCard title={W.zonesCard} description={W.zonesLine}>
        {draft.zones.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {draft.zones.map((zone, index) => (
              <li
                key={zone.id}
                className="grid grid-cols-2 items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-12"
              >
                <Field className="col-span-2 md:col-span-5">
                  <FieldLabel htmlFor={`zone-${zone.id}-name`}>{W.zoneName}</FieldLabel>
                  <Input
                    className="h-11 md:h-9"
                    id={`zone-${zone.id}-name`}
                    value={zone.name}
                    maxLength={60}
                    aria-invalid={zone.name.trim() ? undefined : true}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        zones: d.zones.map((z, i) =>
                          i === index ? { ...z, name: e.target.value } : z,
                        ),
                      }))
                    }
                  />
                </Field>
                <Field className="md:col-span-3">
                  <FieldLabel htmlFor={`zone-${zone.id}-fee`}>{W.fee}</FieldLabel>
                  <PesoInput
                    id={`zone-${zone.id}-fee`}
                    value={zone.fee}
                    onChange={(fee) =>
                      setDraft((d) => ({
                        ...d,
                        zones: d.zones.map((z, i) => (i === index ? { ...z, fee } : z)),
                      }))
                    }
                  />
                </Field>
                <Field className="md:col-span-3">
                  <FieldLabel htmlFor={`zone-${zone.id}-eta`}>{W.eta}</FieldLabel>
                  <Input
                    className="h-11 md:h-9"
                    id={`zone-${zone.id}-eta`}
                    value={zone.etaText}
                    maxLength={40}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        zones: d.zones.map((z, i) =>
                          i === index ? { ...z, etaText: e.target.value } : z,
                        ),
                      }))
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  size="icon"
                  className="col-span-2 size-11 justify-self-end text-muted-foreground md:col-span-1 md:size-9"
                  aria-label={W.removeZone(zone.name)}
                  onClick={() =>
                    setDraft((d) => ({ ...d, zones: d.zones.filter((_, i) => i !== index) }))
                  }
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {draft.zones.length < MAX_ZONES ? (
          <Button
            variant="outline"
            className="h-11 self-start md:h-9"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                zones: [
                  ...d.zones,
                  {
                    id: `zone-${Date.now().toString(36)}`,
                    name: '',
                    fee: d.distance[d.distance.length - 1]?.fee ?? 5000,
                    etaText: d.distance[d.distance.length - 1]?.etaText ?? '30 to 45 min',
                  },
                ],
              }))
            }
          >
            <PlusIcon />
            {W.addZone}
          </Button>
        ) : null}
      </SettingsCard>

      <SettingsCard title={W.freeCard}>
        <SwitchRow
          id="free-delivery"
          label={W.freeSwitch}
          help={W.freeHelp}
          checked={draft.freeDeliveryFrom !== null}
          onCheckedChange={(on) =>
            setDraft((d) => ({
              ...d,
              freeDeliveryFrom: on ? (d.freeDeliveryFrom ?? 100000) : null,
            }))
          }
        />
        {draft.freeDeliveryFrom !== null ? (
          <Field className="sm:w-56">
            <FieldLabel htmlFor="free-from">{W.freeFrom}</FieldLabel>
            <PesoInput
              id="free-from"
              value={draft.freeDeliveryFrom}
              onChange={(freeDeliveryFrom) => setDraft((d) => ({ ...d, freeDeliveryFrom }))}
            />
          </Field>
        ) : null}
      </SettingsCard>

      <DistanceCalculator delivery={draft} />

      <SaveBar
        dirty={dirty}
        valid={valid}
        status={section.status}
        onDiscard={() => {
          reset();
          section.clear();
        }}
        onSave={() => void section.save(() => saveDelivery.mutateAsync(draft))}
      />
    </SettingsPage>
  );
}

/** Kilometres with one decimal; the text is kept while typing ("2.") so the dot isn't lost. */
function KmInput({
  id,
  value,
  invalid,
  onChange,
}: {
  id: string;
  value: number;
  invalid: boolean;
  onChange: (km: number) => void;
}) {
  const [text, setText] = React.useState(() => kmText(value));
  const [last, setLast] = React.useState(value);
  if (value !== last) {
    setLast(value);
    if (Number(text.replace(',', '.')) !== value) setText(kmText(value));
  }
  return (
    <InputGroup className="h-11 md:h-9">
      <InputGroupInput
        id={id}
        inputMode="decimal"
        value={text}
        aria-invalid={invalid ? true : undefined}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d.,]/g, '');
          setText(next);
          const km = Math.round(Number(next.replace(',', '.')) * 10) / 10;
          if (next && Number.isFinite(km) && km <= 100) onChange(km);
        }}
        onBlur={() => setText(kmText(value))}
      />
      <InputGroupAddon align="inline-end">km</InputGroupAddon>
    </InputGroup>
  );
}

/** Type a distance and see the fee a customer pays, from the unsaved rows (the "Customers see" here). */
function DistanceCalculator({ delivery }: { delivery: DeliverySettings }) {
  const [text, setText] = React.useState('2.5');
  const km = Number(text.replace(',', '.'));
  const row = text.trim() ? distanceRowFor(delivery.distance, km) : null;
  const maxKm = delivery.distance[delivery.distance.length - 1]?.toKm ?? 0;
  return (
    <SettingsCard title={W.calcCard}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field className="sm:w-40">
          <FieldLabel htmlFor="calc-km">{W.calcLabel}</FieldLabel>
          <InputGroup className="h-11 md:h-9">
            <InputGroupAddon>
              <CalculatorIcon />
            </InputGroupAddon>
            <InputGroupInput
              id="calc-km"
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <InputGroupAddon align="inline-end">km</InputGroupAddon>
          </InputGroup>
        </Field>
        <output
          htmlFor="calc-km"
          aria-live="polite"
          className="flex min-h-11 flex-1 items-center rounded-lg bg-muted px-3 text-sm font-medium text-foreground"
        >
          {row
            ? W.calcResult(
                row.fee === 0 ? W.calcFree : formatPeso(row.fee),
                row.etaText,
                row.minOrder > 0 ? formatPeso(row.minOrder) : null,
              )
            : W.calcNone(maxKm)}
        </output>
      </div>
      {delivery.freeDeliveryFrom !== null ? (
        <FieldDescription>{W.freeHelp}</FieldDescription>
      ) : null}
    </SettingsCard>
  );
}
