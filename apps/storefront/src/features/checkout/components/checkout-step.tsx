import type { ReactNode } from 'react';

interface CheckoutStepProps {
  // 1, 2 or 3; leave out for the cards after the numbered steps.
  step?: number;
  id: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

/** One numbered checkout card (checkout-6 look): number, title, an optional action, the fields. */
export function CheckoutStep({ step, id, title, action, children }: CheckoutStepProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-xs ring-1 ring-foreground/8 sm:p-6"
    >
      <div className="flex min-h-11 items-center gap-3">
        {step ? (
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular"
          >
            {step}
          </span>
        ) : null}
        <h2 id={`${id}-title`} className="min-w-0 flex-1 text-base font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
