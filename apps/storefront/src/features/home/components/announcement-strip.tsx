import { AlertTriangleIcon, CircleCheckIcon, MegaphoneIcon } from 'lucide-react';
import { words, type Announcement } from '@smartapp/core';
import { Marquee, MarqueeContent, MarqueeEdge, MarqueeItem } from '@smartapp/ui/components/marquee';

const TONE_ICON = {
  info: MegaphoneIcon,
  success: CircleCheckIcon,
  warning: AlertTriangleIcon,
} as const;

// The owner's one-line news as a slim scrolling strip (DiceUI marquee, decision R13); still for
// reduced motion. Shown only when the owner wrote something.
export function AnnouncementStrip({ announcement }: { announcement: Announcement }) {
  const text = announcement.text.trim();
  if (!text) return null;
  const Icon = TONE_ICON[announcement.tone];
  return (
    <section aria-label={words.storefrontShell.home.announcement}>
      <Marquee
        speed={28}
        pauseOnHover
        className="rounded-full bg-shop-10-soft text-shop-10-soft-foreground"
      >
        <MarqueeContent>
          <MarqueeItem className="flex items-center gap-2 py-2 pr-8 text-sm font-medium">
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {text}
          </MarqueeItem>
        </MarqueeContent>
        <MarqueeEdge side="left" />
        <MarqueeEdge side="right" />
      </Marquee>
    </section>
  );
}
