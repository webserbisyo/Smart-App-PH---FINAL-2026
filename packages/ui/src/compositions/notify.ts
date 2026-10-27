import type { toast } from '@smartapp/ui/components/toast';

type ToastManager = typeof toast;
type ToastOptions = Parameters<ToastManager['add']>[0];

export type NotifyTone = 'success' | 'error' | 'info' | 'warning';

export interface NotifyInput {
  title: string;
  description?: string | undefined;
  tone?: NotifyTone | undefined;
  // At most one action (docs/ux.md section 5), e.g. Undo.
  action?: { label: string; onClick: () => void } | undefined;
}

const SUCCESS_MS = 3000;
const INFO_MS = 5000;

// The toast layer loads lazily (decision R49): until it listens, toasts wait here and the first one asks
// AppToaster to load it.
let manager: ToastManager | null = null;
const waiting: ToastOptions[] = [];
const listeners = new Set<() => void>();
let wanted = false;
let count = 0;

export function subscribeToastLayer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toastLayerWanted(): boolean {
  return wanted;
}

/** Called by the toast layer once its provider listens; shows the toasts that waited. */
export function connectToasts(next: ToastManager): () => void {
  manager = next;
  for (const options of waiting.splice(0)) next.add(options);
  return () => {
    if (manager === next) manager = null;
  };
}

/**
 * The one way to show a toast (docs/components.md): success closes after 3 s, errors stay until closed.
 * Placement (above the storefront dock on phones, bottom right on desktop) lives in globals.css.
 */
export function notify({ title, description, tone = 'info', action }: NotifyInput): string {
  count += 1;
  const options: ToastOptions = {
    id: `notify-${count}`,
    title,
    description,
    type: tone,
    timeout: tone === 'error' ? 0 : tone === 'success' ? SUCCESS_MS : INFO_MS,
    priority: tone === 'error' ? 'high' : 'low',
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  };
  if (manager) return manager.add(options);
  waiting.push(options);
  if (!wanted) {
    wanted = true;
    for (const listener of listeners) listener();
  }
  return `notify-${count}`;
}
