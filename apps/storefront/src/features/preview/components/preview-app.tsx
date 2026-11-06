'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  applyContent,
  EditorSectionEnum,
  type EditorSection,
  type PublicShop,
  type StorefrontContent,
} from '@smartapp/core';
import { StorefrontDataProvider } from '@smartapp/data';
import { useNow } from '@smartapp/data';
import type { DataSource } from '@smartapp/data/env';
import { AppToaster } from '@smartapp/ui/compositions/app-toaster';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { HomeSections } from '../../home/components/home-sections';
import { ShopProvider } from '../../shell/components/shop-context';
import { ShopShell } from '../../shell/components/shop-shell';
import { editorChannel, readEditorMessage, tellEditor } from '../preview-messages';
import { PreviewPart } from './preview-part';

// The top bar is part of the shop frame, not a Home section, so its outline is set on the element itself.
const BRAND_OUTLINE = ['outline-2', '-outline-offset-2', 'outline-info'] as const;

function sectionOf(target: EventTarget | null): EditorSection | null {
  if (!(target instanceof Element)) return null;
  const part = target.closest('[data-editor-section]');
  const parsed = EditorSectionEnum.safeParse(part?.getAttribute('data-editor-section'));
  if (parsed.success) return parsed.data;
  return target.closest('header') ? 'brand' : null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function HomeWithParts({
  shop,
  selected,
  hovered,
  show,
}: {
  shop: PublicShop;
  selected: EditorSection | null;
  hovered: EditorSection | null;
  show: { index: number; at: number } | undefined;
}) {
  const now = useNow();
  // About lives in the Shop info sheet, so the info card stands for it on Home.
  const outlined = selected === 'about' ? 'info' : selected;
  const pointed = hovered === 'about' ? 'info' : hovered;
  const wrap = (section: EditorSection, node: ReactNode) => (
    <PreviewPart section={section} selected={outlined === section} hovered={pointed === section}>
      {node}
    </PreviewPart>
  );
  return (
    <HomeSections
      storefront={shop.storefront}
      catalog={shop.catalog}
      referenceTime={now ?? new Date(0)}
      wrap={wrap}
      show={show}
    />
  );
}

/**
 * The storefront's Editor preview (decision T72): the real Home and shop frame, drawn from the draft the
 * Editor sends. It never takes orders: every tap only picks a part for the Editor.
 */
export function PreviewApp({
  initialShop,
  dashboardOrigin,
  source,
}: {
  initialShop: PublicShop;
  dashboardOrigin: string;
  source: DataSource;
}) {
  const [content, setContent] = useState<StorefrontContent | null>(null);
  const [selected, setSelected] = useState<EditorSection | null>(null);
  const [hovered, setHovered] = useState<EditorSection | null>(null);
  const [show, setShow] = useState<{ index: number; at: number } | undefined>(undefined);
  const scrollTo = useRef<EditorSection | null>(null);
  // Goes up on every select from the Editor, so the same part scrolls into view again (the frame resized).
  const [scrollTick, setScrollTick] = useState(0);

  const shop = useMemo<PublicShop>(
    () =>
      content
        ? { ...initialShop, storefront: applyContent(initialShop.storefront, content) }
        : initialShop,
    [content, initialShop],
  );
  const look = shop.storefront.look;

  // Messages from the Editor; then say we are ready, so it sends the draft.
  useEffect(() => {
    const parent = window.parent === window ? null : window.parent;
    const onMessage = (event: MessageEvent) => {
      const message = readEditorMessage(event, dashboardOrigin, parent);
      if (!message) return;
      switch (message.type) {
        case 'draft':
          setContent(message.content);
          break;
        case 'select':
          scrollTo.current = message.section;
          setSelected(message.section);
          setScrollTick((n) => n + 1);
          break;
        case 'hover':
          setHovered(message.section);
          break;
        case 'banner':
          setShow({ index: message.index, at: Date.now() });
          break;
      }
    };
    window.addEventListener('message', onMessage);
    tellEditor({ channel: editorChannel, type: 'ready' }, dashboardOrigin);
    return () => window.removeEventListener('message', onMessage);
  }, [dashboardOrigin]);

  // Every tap picks a part instead of opening a link, a sheet or the basket.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const section = sectionOf(event.target);
      if (!section) return;
      setSelected(section);
      tellEditor({ channel: editorChannel, type: 'select', section }, dashboardOrigin);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [dashboardOrigin]);

  // The top bar's outline, and the part the Editor picked scrolled into view.
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      for (const name of BRAND_OUTLINE) header.classList.toggle(name, selected === 'brand');
    }
    const target = scrollTo.current;
    scrollTo.current = null;
    if (!target || target === 'brand') return;
    const key = target === 'about' ? 'info' : target;
    document.querySelector(`[data-editor-section="${key}"]`)?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [selected, shop, scrollTick]);

  return (
    <ShopTheme
      brandColor={look.brandColor}
      surface={look.surface}
      pageColor={look.pageColor}
      cardColor={look.cardColor}
      withPortals
    >
      <StorefrontDataProvider slug={shop.storefront.slug} source={source} initialShop={shop}>
        <AppToaster>
          <ShopProvider initialShop={shop} preview>
            <ShopShell>
              <HomeWithParts shop={shop} selected={selected} hovered={hovered} show={show} />
            </ShopShell>
          </ShopProvider>
        </AppToaster>
      </StorefrontDataProvider>
    </ShopTheme>
  );
}
