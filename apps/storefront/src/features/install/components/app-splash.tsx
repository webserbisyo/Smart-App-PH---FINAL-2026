import { openingColours, type ShopLook } from '@smartapp/core';
import { cssVars } from '@smartapp/ui/lib/css-vars';
import { cn } from '@smartapp/ui/lib/utils';

/**
 * The installed app's launch splash (decisions R51, T93): the shop's icon and name on its opening colour
 * (the page colour unless the owner picked the brand or their own), drawn the same as the iPhone launch
 * picture (/<slug>/splash/<size>), so the app goes from that picture straight into the shop, never through
 * white. Pure CSS (`app-splash`, `splash-logo`): shows only in the installed app, moves the logo as the
 * owner picked, fades out once the page paints, and never blocks a tap. Server-rendered, no script.
 */
export function AppSplash({
  name,
  icon,
  look,
}: {
  name: string;
  icon: string | null;
  look: ShopLook;
}) {
  const { opening } = look;
  const colours = openingColours(look);
  return (
    <div
      aria-hidden="true"
      data-motion={opening.motion}
      style={cssVars({ '--splash-bg': colours.background, '--splash-fg': colours.foreground })}
      className="app-splash fixed inset-0 z-splash flex-col items-center justify-center bg-(--splash-bg) text-(--splash-fg)"
    >
      <div className={cn('flex flex-col items-center gap-4', !icon && 'splash-logo')}>
        {icon ? (
          <img
            src={icon}
            alt=""
            width={96}
            height={96}
            className="size-24 splash-logo rounded-3xl"
          />
        ) : null}
        {opening.showName || !icon ? (
          <span className="px-6 text-center text-xl font-bold text-balance">{name}</span>
        ) : null}
      </div>
    </div>
  );
}
