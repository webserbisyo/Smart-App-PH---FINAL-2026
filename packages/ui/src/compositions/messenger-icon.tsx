import type { SVGProps } from 'react';
import { siMessenger } from 'simple-icons';

/**
 * The Messenger logo from simple-icons (CC0), drawn like a Lucide icon: it takes the text colour and the
 * size classes. The one brand mark allowed next to Lucide (decision T77), for Messenger buttons only.
 */
export function MessengerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...props}>
      <path d={siMessenger.path} />
    </svg>
  );
}
