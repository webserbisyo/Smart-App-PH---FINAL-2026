import type { LucideIcon } from 'lucide-react';

/** A quick list above the categories: Favourites, Best sellers, New (decision R29). */
export interface MenuPick {
  id: 'fav' | 'best' | 'new';
  label: string;
  // Spoken name of the toggle, e.g. "Show best sellers".
  toggleLabel: string;
  icon: LucideIcon;
  pressed: boolean;
  onToggle: () => void;
  count?: number | undefined;
}
