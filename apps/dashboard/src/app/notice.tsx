import type * as React from 'react';
import { Banner, BannerActions, BannerContent, BannerIcon } from '@smartapp/ui/components/banner';
import { cn } from 'cn';

export type NoticeTone = 'info' | 'warning' | 'error' | 'brand';

const TONES: Record<NoticeTone, string> = {
  info: 'border-info/20 bg-info-soft text-info-text',
  warning: 'border-warning/20 bg-warning-soft text-warning-text',
  error: 'border-destructive/20 bg-destructive/10 text-destructive',
  brand: 'border-primary/20 bg-primary/5 text-foreground',
};

export interface NoticeProps {
  tone: NoticeTone;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string | undefined;
  ref?: React.Ref<HTMLDivElement> | undefined;
}

/**
 * An inline notice (offline, a copy, a warning, a save error) on the installed DiceUI Banner, dressed in
 * theme tokens (decision T43). Errors are announced at once; the rest politely.
 */
export function Notice({ tone, icon, children, action, className, ref }: NoticeProps) {
  return (
    <Banner
      ref={ref}
      dismissible={false}
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex-wrap items-start gap-2.5 rounded-xl border p-3 sm:flex-nowrap',
        TONES[tone],
        className,
      )}
    >
      <BannerIcon className="pt-0.5">{icon}</BannerIcon>
      <BannerContent>{children}</BannerContent>
      {/* On phones the action takes its own full-width line under the text. */}
      {action ? <BannerActions className="w-full sm:w-auto">{action}</BannerActions> : null}
    </Banner>
  );
}
