import { useEffect, useState, useSyncExternalStore } from 'react';
import { BellRingIcon } from 'lucide-react';
import { settingsWords } from '@smartapp/core';
import { useDeviceAlerts, useOwnerPushKey, useSetDeviceAlerts } from '@smartapp/data';
import { notify } from '@smartapp/ui/compositions/notify';
import { SettingsCard, SwitchRow } from './settings-ui.js';
import {
  deviceAlertState,
  deviceEndpoint,
  SAMPLE_DEVICE,
  subscribeDevice,
  unsubscribeDevice,
  type DeviceAlertState,
} from '@/app/device-alerts';

const W = settingsWords.notifications;

/**
 * "Alerts on this device" (launch phase 5, Q2): a notice for each new order and payment photo on this phone
 * or laptop, even with the screen off. The email switches below stay as they are.
 */
function noSubscribe() {
  return () => {};
}

export function DeviceAlertsCard() {
  const found = useSyncExternalStore<DeviceAlertState>(
    noSubscribe,
    deviceAlertState,
    () => 'unsupported',
  );
  // A No on the browser's question shows at once, before the page is opened again.
  const [denied, setDenied] = useState(false);
  const state: DeviceAlertState = denied ? 'denied' : found;
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = useOwnerPushKey(state === 'ready');
  const sampleData = key.data?.key === null;
  const alerts = useDeviceAlerts(endpoint ?? (sampleData ? SAMPLE_DEVICE : null));
  const save = useSetDeviceAlerts();

  useEffect(() => {
    if (found === 'ready') void deviceEndpoint().then(setEndpoint);
  }, [found]);

  const on = alerts.data?.on === true;
  const line =
    state === 'needs_install'
      ? W.deviceIphone
      : state === 'denied'
        ? W.deviceDenied
        : state === 'unsupported'
          ? W.deviceUnsupported
          : failed
            ? W.deviceFailed
            : on
              ? W.deviceOn
              : undefined;

  async function change(next: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      if (next) {
        const made = await subscribeDevice(key.data?.key ?? null);
        if (!made.ok) {
          setDenied(true);
          return;
        }
        setEndpoint(made.endpoint);
        await save.mutateAsync({
          on: true,
          endpoint: made.endpoint,
          subscription: made.subscription,
        });
        notify({ title: W.deviceTurnedOn, tone: 'success' });
      } else {
        const had = sampleData ? SAMPLE_DEVICE : ((await unsubscribeDevice()) ?? endpoint);
        if (had) await save.mutateAsync({ on: false, endpoint: had });
        notify({ title: W.deviceTurnedOff, tone: 'success' });
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard title={W.deviceCard} description={line}>
      <SwitchRow
        id="notify-device"
        icon={<BellRingIcon />}
        label={W.deviceAlerts}
        help={W.deviceAlertsHelp}
        checked={on}
        disabled={state !== 'ready' || busy || key.isPending || alerts.isFetching}
        onCheckedChange={(next) => void change(next)}
      />
    </SettingsCard>
  );
}
