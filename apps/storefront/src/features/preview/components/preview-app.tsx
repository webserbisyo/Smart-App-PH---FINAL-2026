'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
  applyContent,
  BANNER_TEXT_MAX,
  EditorSectionEnum,
  editorPreviewWords,
  vocab,
  type Banner,
  type BannerTextField,
  type EditorSection,
  type PreviewPage,
  type PublicShop,
  type StorefrontContent,
} from '@smartapp/core';
import { StorefrontDataProvider } from '@smartapp/data';
import { useNow } from '@smartapp/data';
import type { DataSource } from '@smartapp/data/env';
import { AppToaster } from '@smartapp/ui/compositions/app-toaster';
import { ShopTheme } from '@smartapp/ui/compositions/shop-theme';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import type { BannerTextSlots } from '../../home/components/home-banners';
import { HomeSections } from '../../home/components/home-sections';
import { ShopProvider, useShop } from '../../shell/components/shop-context';
import { ShopShell } from '../../shell/components/shop-shell';
import { editorChannel, readEditorMessage, tellEditor } from '../preview-messages';
import { InlineText } from './inline-text';
import { PreviewPart } from './preview-part';

const W = editorPreviewWords;

// The other pages load only when the owner opens them, so the preview's first JavaScript stays Home's.
function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
const MenuContent = dynamic(
  () => import('../../menu/components/menu-content').then((m) => m.MenuContent),
  { ssr: false, loading: PageSkeleton },
);
const RewardsScreen = dynamic(
  () => import('../../rewards/components/rewards-screen').then((m) => m.RewardsScreen),
  { ssr: false, loading: PageSkeleton },
);
const AccountScreen = dynamic(
  () => import('../../rewards/components/account-screen').then((m) => m.AccountScreen),
  { ssr: false, loading: PageSkeleton },
);

// The top bar is part of the shop frame, not a Home section, so its outline is set on the element itself.
const BRAND_OUTLINE = ['outline-2', '-outline-offset-2', 'outline-info'] as const;

function sectionOf(target: Element): EditorSection | null {
  const part = target.closest('[data-editor-section]');
  const parsed = EditorSectionEnum.safeParse(part?.getAttribute('data-editor-section'));
  return parsed.success ? parsed.data : null;
}

// A link in the page (the dock, the top bar, a banner's button) opens that page in the preview.
function pageOfLink(target: Element, slug: string): PreviewPage | null {
  const href = target.closest('a[href]')?.getAttribute('href');
  if (!href) return null;
  const path = new URL(href, window.location.origin).pathname;
  const base = `/${slug}`;
  if (path === base) return 'home';
  if (path.startsWith(`${base}/menu`)) return 'menu';
  if (path.startsWith(`${base}/rewards`)) return 'rewards';
  if (path.startsWith(`${base}/account`) || path.startsWith(`${base}/join`)) return 'account';
  return null;
}

type Tap = { kind: 'section'; section: EditorSection } | { kind: 'page'; page: PreviewPage };

/**
 * What a tap in the preview does: on Home a part picks that part; a link opens its page; the account button
 * opens Account; the rest of the top bar (logo and name) picks the shop's look.
 */
function tapOf(target: EventTarget | null, page: PreviewPage, slug: string): Tap | null {
  if (!(target instanceof Element)) return null;
  const section = page === 'home' || page === 'about' ? sectionOf(target) : null;
  if (section) return { kind: 'section', section };
  const linked = pageOfLink(target, slug);
  if (linked) return { kind: 'page', page: linked };
  const header = target.closest('header');
  if (header && target.closest('[aria-haspopup="menu"]')) return { kind: 'page', page: 'account' };
  return header ? { kind: 'section', section: 'brand' } : null;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function HomeWithParts({
  shop,
  selected,
  hovered,
  show,
  bannerText,
}: {
  shop: PublicShop;
  selected: EditorSection | null;
  hovered: EditorSection | null;
  show: { index: number; at: number } | undefined;
  bannerText: BannerTextSlots | undefined;
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
      bannerText={bannerText}
    />
  );
}

// The About page is Home with the Shop info sheet open; closing the sheet goes back to Home.
function InfoSheetSync({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  const { infoOpen, setInfoOpen } = useShop();
  const wasOpen = useRef(infoOpen);
  useEffect(() => {
    setInfoOpen(open);
  }, [open, setInfoOpen]);
  useEffect(() => {
    if (wasOpen.current && !infoOpen && open) onClosed();
    wasOpen.current = infoOpen;
  }, [infoOpen, open, onClosed]);
  return null;
}

function PreviewPageBody({
  page,
  shop,
  home,
}: {
  page: PreviewPage;
  shop: PublicShop;
  home: ReactNode;
}) {
  switch (page) {
    case 'menu':
      return (
        <MenuContent
          catalog={shop.catalog}
          catalogTitle={vocab(shop.storefront.info.kind).catalog}
        />
      );
    case 'rewards':
      return <RewardsScreen />;
    case 'account':
      return <AccountScreen />;
    default:
      return home;
  }
}

/**
 * The storefront's Editor preview (decision T72): the real Home and shop frame, drawn from the draft the
 * Editor sends. It never takes orders: a tap picks a part for the Editor or opens another page (Menu,
 * Rewards, Account, Shop info; T78), and banner words can be typed straight onto Home.
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
  const [page, setPage] = useState<PreviewPage>('home');
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
        case 'page':
          setPage(message.page);
          window.scrollTo({ top: 0 });
          break;
      }
    };
    window.addEventListener('message', onMessage);
    tellEditor({ channel: editorChannel, type: 'ready' }, dashboardOrigin);
    return () => window.removeEventListener('message', onMessage);
  }, [dashboardOrigin]);

  const slug = initialShop.storefront.slug;
  const openPage = useCallback(
    (next: PreviewPage) => {
      setPage(next);
      window.scrollTo({ top: 0 });
      tellEditor({ channel: editorChannel, type: 'page', page: next }, dashboardOrigin);
    },
    [dashboardOrigin],
  );
  const backHome = useCallback(() => openPage('home'), [openPage]);

  // A tap picks a part or opens a page instead of following a link, a sheet or the basket. Inside the Shop
  // info sheet buttons still work (Close, Copy), but links never leave the preview.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[role="dialog"]')) {
        if (target.closest('a[href]')) event.preventDefault();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const tap = tapOf(target, page, slug);
      if (!tap) return;
      if (tap.kind === 'page') {
        openPage(tap.page);
        return;
      }
      setSelected(tap.section);
      tellEditor({ channel: editorChannel, type: 'select', section: tap.section }, dashboardOrigin);
    };
    // Menus open on press, before the click: the account menu never opens here, its tap opens Account.
    const onPress = (event: Event) => {
      const target = event.target;
      if (target instanceof Element && target.closest('header [aria-haspopup="menu"]')) {
        event.stopPropagation();
      }
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('mousedown', onPress, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('mousedown', onPress, true);
    };
  }, [dashboardOrigin, page, slug, openPage]);

  // While the owner works on banners, each banner's words can be typed straight onto the page.
  const bannerText = useMemo<BannerTextSlots | undefined>(() => {
    if (selected !== 'banners') return undefined;
    const send = (index: number, field: BannerTextField, value: string) =>
      tellEditor({ channel: editorChannel, type: 'text', index, field, value }, dashboardOrigin);
    return (index: number, banner: Banner) => ({
      title: (
        <InlineText
          value={banner.title ?? ''}
          placeholder={W.bannerTitle}
          label={W.bannerTitleAria(index + 1)}
          max={BANNER_TEXT_MAX.title}
          onText={(value) => send(index, 'title', value)}
        />
      ),
      description: (
        <InlineText
          value={banner.description ?? ''}
          placeholder={W.bannerDescription}
          label={W.bannerDescriptionAria(index + 1)}
          max={BANNER_TEXT_MAX.description}
          onText={(value) => send(index, 'description', value)}
        />
      ),
    });
  }, [selected, dashboardOrigin]);

  // The top bar's outline, and the part the Editor picked scrolled into view.
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      for (const name of BRAND_OUTLINE) header.classList.toggle(name, selected === 'brand');
    }
    const target = scrollTo.current;
    scrollTo.current = null;
    if (!target || target === 'brand' || page !== 'home') return;
    const key = target === 'about' ? 'info' : target;
    document.querySelector(`[data-editor-section="${key}"]`)?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [selected, shop, scrollTick, page]);

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
          <ShopProvider initialShop={shop} preview previewPage={page}>
            <InfoSheetSync open={page === 'about'} onClosed={backHome} />
            <ShopShell>
              <PreviewPageBody
                page={page}
                shop={shop}
                home={
                  <HomeWithParts
                    shop={shop}
                    selected={selected}
                    hovered={hovered}
                    show={show}
                    bannerText={bannerText}
                  />
                }
              />
            </ShopShell>
          </ShopProvider>
        </AppToaster>
      </StorefrontDataProvider>
    </ShopTheme>
  );
}
