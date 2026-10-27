/**
 * The installed app's launch splash (decision R51): the shop's icon and name on its page colour, drawn the
 * same as the iPhone launch picture (/<slug>/splash/<size>), so the app goes from that picture straight into
 * the shop, never through white. Pure CSS (`app-splash`): shows only in the installed app, fades out once
 * the page paints, and never blocks a tap. Server-rendered, no script.
 */
export function AppSplash({ name, icon }: { name: string; icon: string | null }) {
  return (
    <div
      aria-hidden="true"
      className="app-splash fixed inset-0 z-splash flex-col items-center justify-center bg-shop-60 text-foreground"
    >
      <div className="flex flex-col items-center gap-4">
        {icon ? (
          <img src={icon} alt="" width={96} height={96} className="size-24 rounded-3xl" />
        ) : null}
        <span className="px-6 text-center text-xl font-bold text-balance">{name}</span>
      </div>
    </div>
  );
}
