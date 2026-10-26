import { toast } from '@smartapp/ui/components/toast';

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

/**
 * The one way to show a toast (docs/components.md): success closes after 3 s, errors stay until closed.
 * Placement (above the storefront dock on phones, bottom right on desktop) lives in globals.css.
 */
export function notify({ title, description, tone = 'info', action }: NotifyInput): string {
  return toast.add({
    title,
    description,
    type: tone,
    timeout: tone === 'error' ? 0 : tone === 'success' ? SUCCESS_MS : INFO_MS,
    priority: tone === 'error' ? 'high' : 'low',
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  });
}
