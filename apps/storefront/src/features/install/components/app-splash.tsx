import {
  appNameOf,
  OPENING_LOGO_PX,
  openingColours,
  type OpeningLoader,
  type OpeningLogoSize,
  type ShopLook,
} from '@smartapp/core';
import { Spinner } from '@smartapp/ui/components/spinner';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from '@smartapp/ui/lib/utils';
import { SPLASH_ID } from '../install-rules';

const LOGO_CLASS: Record<OpeningLogoSize, string> = {
  small: 'size-16 rounded-2xl',
  medium: 'size-24 rounded-3xl',
  large: 'size-32 rounded-4xl',
};

// Under the logo while a slow page gets ready (T94); it fades in only after a second (`splash-loader`).
function SplashLoader({ loader }: { loader: OpeningLoader }) {
  if (loader === 'none') return null;
  return (
    <div className="absolute inset-x-0 bottom-16 flex splash-loader justify-center">
      {loader === 'dots' ? (
        <span className="flex gap-1.5">
          <span className="size-2 splash-dot rounded-full bg-current" />
          <span className="size-2 splash-dot rounded-full bg-current" />
          <span className="size-2 splash-dot rounded-full bg-current" />
        </span>
      ) : loader === 'bar' ? (
        <span className="splash-bar h-1 w-24 rounded-full bg-current/20" />
      ) : (
        <Spinner role="presentation" aria-hidden="true" className="size-6" />
      )}
    </div>
  );
}

export interface SplashScreenProps {
  /** The shop's name from Settings; the owner's app name wins when set. */
  name: string;
  tagline: string | null;
  icon: string | null;
  look: ShopLook;
  /** `app-splash` in the installed app; `splash-preview` in the Editor's preview. */
  className: string;
  id?: string | undefined;
  /** The Editor's preview: hold on the splash, or play the opening into the page. */
  play?: 'hold' | 'open' | undefined;
}

/**
 * The opening screen as drawn (decisions R51, T93, T94): the shop's icon, name and tagline on its opening
 * colour, the logo moving as the owner picked, and a loader for slow pages. The same layout as the iPhone
 * launch picture (/<slug>/splash/<size>), so the app goes from that picture straight into the shop.
 */
export function SplashScreen({
  name,
  tagline,
  icon,
  look,
  className,
  id,
  play,
}: SplashScreenProps) {
  const { opening } = look;
  const colours = openingColours(look);
  const px = OPENING_LOGO_PX[opening.logoSize];
  const showName = opening.showName || !icon;
  const line = opening.showTagline && tagline ? tagline : null;
  return (
    <div
      id={id}
      aria-hidden="true"
      data-motion={opening.motion}
      data-play={play}
      style={cssVars({ '--splash-bg': colours.background, '--splash-fg': colours.foreground })}
      className={cn(
        'fixed inset-0 z-splash flex-col items-center justify-center bg-(--splash-bg) text-(--splash-fg)',
        className,
      )}
    >
      <div className={cn('flex flex-col items-center gap-4', !icon && 'splash-logo')}>
        {icon ? (
          <img
            src={icon}
            alt=""
            width={px}
            height={px}
            // The first thing the opening screen needs (T121): fetched before the page's other pictures.
            fetchPriority="high"
            className={cn('splash-logo', LOGO_CLASS[opening.logoSize])}
          />
        ) : null}
        {showName || line ? (
          <div className="flex flex-col items-center gap-1 px-6 text-center">
            {showName ? (
              <span className="text-xl font-bold text-balance">{appNameOf(name, opening)}</span>
            ) : null}
            {line ? <span className="text-sm text-balance opacity-80">{line}</span> : null}
          </div>
        ) : null}
      </div>
      <SplashLoader loader={opening.loader} />
    </div>
  );
}

/**
 * The installed app's launch splash. Server-rendered and pure CSS (`app-splash`): it shows only in the
 * installed app, stays until the page is ready (InstallWatcher; at least 1 s, at most 3 s) and never blocks a
 * tap.
 */
export function AppSplash({
  name,
  tagline,
  icon,
  look,
}: {
  name: string;
  tagline: string | null;
  icon: string | null;
  look: ShopLook;
}) {
  return (
    <SplashScreen
      id={SPLASH_ID}
      name={name}
      tagline={tagline}
      icon={icon}
      look={look}
      className="app-splash"
    />
  );
}
