'use client';

import type { ReactNode } from 'react';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from 'cn';
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  toast,
  useToastManager,
} from '@smartapp/ui/components/toast';

const TONES = {
  success: { icon: CircleCheckIcon, badge: 'bg-success text-success-foreground' },
  error: { icon: OctagonXIcon, badge: 'bg-destructive text-destructive-foreground' },
  warning: { icon: TriangleAlertIcon, badge: 'bg-warning text-warning-foreground' },
  info: { icon: InfoIcon, badge: 'bg-info text-info-foreground' },
  loading: { icon: Loader2Icon, badge: 'bg-invert-foreground/15 text-invert-foreground' },
} as const satisfies Record<string, { icon: LucideIcon; badge: string }>;

type Tone = keyof typeof TONES;

function isTone(type: string | undefined): type is Tone {
  return type !== undefined && Object.hasOwn(TONES, type);
}

/** The tone's icon on a solid semantic circle (ReUI c-sonner-13 look), the same on every shop. */
function ToneBadge({ type }: { type: string | undefined }) {
  if (!isTone(type)) return null;
  const { icon: Icon, badge } = TONES[type];
  return (
    <span
      data-slot="toast-tone"
      aria-hidden="true"
      className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', badge)}
    >
      <Icon
        className={cn('size-4', type === 'loading' && 'motion-safe:animate-spin')}
        strokeWidth={2.5}
      />
    </span>
  );
}

function AppToastList() {
  const { toasts } = useToastManager();
  return toasts.map((item) => (
    <Toast
      key={item.id}
      toast={item}
      data-tone={isTone(item.type) ? item.type : undefined}
      className="border-transparent bg-invert text-invert-foreground shadow-xl ring-1 ring-foreground/10"
    >
      <ToastContent className="gap-3 py-3 pr-2.5 pl-3.5">
        <ToneBadge type={item.type} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ToastTitle className="font-semibold text-invert-foreground" />
          <ToastDescription className="text-invert-foreground/75" />
        </div>
        <ToastAction className="h-9 rounded-full border-invert-foreground/25 bg-transparent px-3.5 text-invert-foreground hover:bg-invert-foreground/10 hover:text-invert-foreground" />
        <ToastClose className="size-9 rounded-full text-invert-foreground/70 hover:bg-invert-foreground/10 hover:text-invert-foreground" />
      </ToastContent>
    </Toast>
  ));
}

/**
 * The app's toasts: the installed Base UI toast dressed in the ReUI Sonner looks (c-sonner-4 coloured icons,
 * c-sonner-13 inverted card). Semantic colours, never the shop's, so success is green on every shop.
 * Placement (bottom above the dock on phones, top centre on desktop) lives in globals.css.
 */
export function AppToaster({ children }: { children?: ReactNode }) {
  return (
    <ToastProvider toastManager={toast} limit={3}>
      {children}
      <ToastPortal>
        <ToastViewport>
          <AppToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  );
}
