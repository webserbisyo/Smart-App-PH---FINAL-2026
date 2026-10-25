// Source: https://opensourceui.in/components/add-to-cart-button · copied 2026-10-25 · MIT, Opensource UI by Bidyut Kundu
// Changes: our cn, colours and shadows to tokens/utilities (dark key → shop-10, emerald → success), labels from
// props (no default English), motion tokens. Nothing auto-updates.
'use client';

import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from 'react';

import { cn } from 'cn';
import { Check, Loader2, ShoppingBag } from 'lucide-react';

type Phase = 'idle' | 'loading' | 'added';

export type AddToCartButtonProps = Readonly<
  {
    label: string;
    loadingLabel: string;
    addedLabel: string;
    loadingMs?: number;
    resetMs?: number;
  } & ComponentPropsWithoutRef<'button'>
>;

// Icons stack in one fixed slot and fade with the same rhythm as the labels.
const ICON_LAYER =
  'absolute inset-0 grid place-items-center transition-opacity ease-out motion-reduce:transition-none';

// Labels stack in one grid cell; outgoing fades out, incoming fades in after.
const LABEL_LAYER =
  'col-start-1 row-start-1 text-center transition-opacity ease-out motion-reduce:transition-none';

// Add-to-cart — raised key that sinks while adding, then settles into a
// green added state; icon morphs bag → spinner → check in place.
export const AddToCartButton = forwardRef<HTMLButtonElement, AddToCartButtonProps>(
  (
    {
      className,
      label,
      loadingLabel,
      addedLabel,
      loadingMs = 1200,
      resetMs = 1600,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [phase, setPhase] = useState<Phase>('idle');
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => {
      const timeoutIds = timers;
      return () => {
        timeoutIds.current.forEach((id) => globalThis.clearTimeout(id));
      };
    }, []);

    const idle = phase === 'idle';
    const loading = phase === 'loading';
    const added = phase === 'added';

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event);
      if (!idle) return;
      setPhase('loading');
      timers.current.push(
        globalThis.setTimeout(() => setPhase('added'), loadingMs),
        globalThis.setTimeout(() => setPhase('idle'), loadingMs + resetMs),
      );
    };

    return (
      <button
        ref={ref}
        type="button"
        data-slot="add-to-cart-button"
        data-phase={phase}
        aria-busy={loading || undefined}
        aria-disabled={!idle || undefined}
        onClick={handleClick}
        className={cn(
          'inline-flex h-12 min-w-44 items-center justify-center gap-2 rounded-xl px-5 font-sans text-sm font-semibold outline-none select-none',
          'transition-[background-color,box-shadow,color] duration-slow ease-standard motion-reduce:transition-none',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          // Raised key: soft blurred top sheen, deep lift + bottom recess.
          idle && 'cursor-pointer bg-shop-10 text-shop-10-foreground shadow-key-raised',
          idle &&
            'active:bg-shop-10-hover active:shadow-key-sunken hover-hover:hover:bg-shop-10-hover',
          // Adding: stays sunken while it works.
          loading && 'cursor-default bg-shop-10-hover text-shop-10-foreground shadow-key-sunken',
          // Added: pops back up as a solid success key.
          added && 'cursor-default bg-success text-success-foreground shadow-key-done',
          className,
        )}
        {...props}
      >
        <span className="sr-only" aria-live="polite">
          {loading ? loadingLabel : added ? addedLabel : ''}
        </span>

        {/* Fixed icon slot keeps the icon and label aligned in every phase. */}
        <span className="relative size-4 shrink-0">
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              idle ? 'opacity-100 delay-200 duration-300' : 'opacity-0 duration-200',
            )}
          >
            <ShoppingBag size={15} strokeWidth={2} />
          </span>
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              loading ? 'opacity-100 delay-200 duration-300' : 'opacity-0 duration-200',
            )}
          >
            <Loader2
              size={15}
              strokeWidth={2.5}
              className="animate-spin motion-reduce:animate-none"
            />
          </span>
          <span
            aria-hidden
            className={cn(
              ICON_LAYER,
              added ? 'opacity-100 delay-200 duration-300' : 'opacity-0 duration-200',
            )}
          >
            <Check size={16} strokeWidth={2.5} />
          </span>
        </span>

        <span className="grid">
          <span
            aria-hidden={!idle}
            className={cn(
              LABEL_LAYER,
              idle ? 'opacity-100 delay-200 duration-300' : 'opacity-0 duration-200',
            )}
          >
            {label}
          </span>
          <span
            aria-hidden={!loading}
            className={cn(
              LABEL_LAYER,
              loading ? 'opacity-100 delay-200 duration-300' : 'opacity-0 duration-200',
            )}
          >
            {loadingLabel}
          </span>
          <span
            aria-hidden={!added}
            className={cn(
              LABEL_LAYER,
              added ? 'opacity-100 delay-200 duration-300' : 'opacity-0 duration-200',
            )}
          >
            {addedLabel}
          </span>
        </span>
      </button>
    );
  },
);

AddToCartButton.displayName = 'AddToCartButton';
