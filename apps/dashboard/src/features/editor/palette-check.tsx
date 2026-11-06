import { CheckCircle2Icon, InfoIcon } from 'lucide-react';
import {
  PALETTE_BLACK,
  contrastRatio,
  editorWords,
  hexToOklch,
  parseOklch,
  shopPalette,
  type ShopLook,
} from '@smartapp/core';
import { cssVars } from '@smartapp/ui/lib/css-vars';

const W = editorWords.brand;

/** True when the button colour is the owner's own colour, not a deeper shade of it. */
function keptExact(brandHex: string, shop10: string): boolean {
  const brand = hexToOklch(brandHex);
  const used = parseOklch(shop10);
  if (!brand || !used) return false;
  return Math.abs(brand.l - used.l) < 0.01;
}

/** The 60 · 30 · 10 the customers will see, and the three readability checks (rule E7). */
export function PaletteCheck({ look }: { look: ShopLook }) {
  const p = shopPalette(look.brandColor, look.surface, look.pageColor);
  const cardSurface = look.surface === 'dark' ? p.shop30 : p.shop60;
  const checks = [
    { label: W.checks.buttons, ratio: contrastRatio(p.shop10Foreground, p.shop10) },
    { label: W.checks.links, ratio: contrastRatio(p.shop10Text, cardSurface) },
    { label: W.checks.body, ratio: contrastRatio(p.foreground, p.shop60) },
  ];
  let note: string = W.adjusted;
  if (p.shop10Foreground === PALETTE_BLACK) note = W.exactBlack;
  else if (keptExact(look.brandColor, p.shop10)) note = W.exactWhite;

  return (
    <section className="flex flex-col gap-3" aria-label={W.palette}>
      <h3 className="text-sm font-medium">{W.palette}</h3>
      <div
        className="flex h-14 overflow-hidden rounded-xl border border-border"
        style={cssVars({ '--p60': p.shop60, '--p30': p.shop30, '--p10': p.shop10 })}
        aria-hidden
      >
        <div className="flex-6 bg-(--p60)" />
        <div className="flex-3 border-x border-border bg-(--p30)" />
        <div className="flex-1 bg-(--p10)" />
      </div>
      <ul
        className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
        style={cssVars({ '--p60': p.shop60, '--p30': p.shop30, '--p10': p.shop10 })}
        aria-hidden
      >
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-border bg-(--p60)" />
          {W.page60}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-border bg-(--p30)" />
          {W.cards30}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-border bg-(--p10)" />
          {W.brand10}
        </li>
      </ul>
      <ul className="flex flex-col gap-1.5">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center gap-2 text-sm">
            <CheckCircle2Icon className="size-4 shrink-0 text-success" aria-hidden />
            <span className="min-w-0 flex-1">{check.label}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {W.ratio(check.ratio)}
            </span>
            <span className="text-xs font-medium text-success-text">{W.passes}</span>
          </li>
        ))}
      </ul>
      <p className="flex gap-2 text-xs text-muted-foreground">
        <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {note} {W.statusFixed}
        </span>
      </p>
    </section>
  );
}
