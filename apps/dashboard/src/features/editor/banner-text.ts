import {
  BANNER_TEXT_MAX,
  type Banner,
  type BannerTextField,
  type StorefrontContent,
} from '@smartapp/core';

/** Empty words are left out, since a banner's title and line are optional. */
export function withText(banner: Banner, key: BannerTextField, text: string): Banner {
  const next: Banner = { ...banner };
  if (text.trim()) next[key] = text.slice(0, BANNER_TEXT_MAX[key]);
  else delete next[key];
  return next;
}

/** The draft with one banner's title or line changed, as typed on the preview (T78). */
export function withBannerText(
  content: StorefrontContent,
  index: number,
  key: BannerTextField,
  text: string,
): StorefrontContent {
  const banner = content.look.banners[index];
  if (!banner) return content;
  const banners = content.look.banners.map((b, i) => (i === index ? withText(b, key, text) : b));
  return { ...content, look: { ...content.look, banners } };
}

/** The same Undo step as typing in the Banners panel's box, so both feel like one edit. */
export function bannerTextKey(index: number, key: BannerTextField): string {
  return `editor-banner-${index + 1}-${key === 'title' ? 'title' : 'line'}`;
}
