import type { EditorSection, PublicShop, StorefrontContent } from '@smartapp/core';

export interface PanelProps {
  content: StorefrontContent;
  update: (fn: (content: StorefrontContent) => StorefrontContent, key?: string) => void;
  shop: PublicShop | undefined;
  catalogName: string;
  /** Moves the preview's carousel to the banner being edited. */
  showBanner: (index: number) => void;
  /** Plays the opening screen into the page in the preview (T94). */
  watchOpening: () => void;
  onSelect: (section: EditorSection) => void;
}
