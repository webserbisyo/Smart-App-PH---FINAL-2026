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

// Near the bottom while the page gets ready (T94); it fades in once the logo's motion has played (T122).
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
 * The opening screen as drawn (decisions R51, T93, T94, T122): the shop's logo in the middle of its opening
 * colour, moving as the owner picked, with its name and tagline fading in under it and a loader. The iPhone
 * launch picture (/<slug>/splash/<size>) is the logo alone at the same spot, so nothing jumps at the handoff.
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
  const words = showName || line;
  return (
    <div
      id={id}
      aria-hidden="true"
      data-motion={opening.motion}
      data-play={play}
      style={cssVars({ '--splash-bg': colours.background, '--splash-fg': colours.foreground })}
      className={cn('fixed inset-0 z-splash bg-(--splash-bg) text-(--splash-fg)', className)}
    >
      {/* Logo, words and loader leave first, then the colour (T122). */}
      <div className="absolute inset-0 flex splash-content items-center justify-center">
        {/* The logo sits exactly in the middle of the page, where the iPhone launch picture has it (the picture
            moves its logo down by half the status bar, T125); the name and tagline fade in under it (T122). */}
        <div className="relative flex flex-col items-center">
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
          {words ? (
            <div
              className={cn(
                icon ? 'absolute top-full left-1/2 mt-4 w-screen -translate-x-1/2' : 'splash-logo',
              )}
            >
              <div className="flex splash-text flex-col items-center gap-1 px-6 text-center">
                {showName ? (
                  <span className="text-xl font-bold text-balance">{appNameOf(name, opening)}</span>
                ) : null}
                {line ? <span className="text-sm text-balance opacity-80">{line}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
        <SplashLoader loader={opening.loader} />
      </div>
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
