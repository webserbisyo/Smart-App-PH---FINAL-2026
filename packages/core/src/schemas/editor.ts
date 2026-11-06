// The Editor (decisions N7, N8, N13, T72 to T75): what the owner changes on the shop page, the saved draft,
// and the messages between the Editor and the storefront's preview page.
import { z } from 'zod';
import { IsoDateTimeSchema, MediaRefSchema } from './common.js';
import { ShopLookSchema } from './storefront.js';

// The parts of the shop page the owner can pick in the Editor, in the order they show on the page.
export const EDITOR_SECTIONS = [
  'brand',
  'banners',
  'announcement',
  'rewards',
  'categories',
  'bestSellers',
  'favourites',
  'info',
  'about',
  'membersCount',
] as const;
export const EditorSectionEnum = z.enum(EDITOR_SECTIONS);
export type EditorSection = z.infer<typeof EditorSectionEnum>;

/**
 * What the draft holds (blueprint 8.5): the logo, tagline and About text from the shop's info, and the whole
 * look (colours, banners, announcement, section switches). Name and contact stay in Settings (T64); items and
 * the Best seller switch stay in Menu (T44); the stamp card stays in Members.
 */
export const StorefrontContentSchema = z.object({
  logo: MediaRefSchema.nullable(),
  tagline: z.string().max(80).nullable(),
  about: z.string().max(600).nullable(),
  look: ShopLookSchema,
});
export type StorefrontContent = z.infer<typeof StorefrontContentSchema>;

/**
 * One read for the Editor: the draft, what customers see now, and the versions. `baseVersion` goes up on
 * every save; a save from an older version gives `draft_conflict` (E3). `contentVersion` goes up on Publish.
 */
export const StorefrontDraftStateSchema = z.object({
  draft: StorefrontContentSchema,
  published: StorefrontContentSchema,
  baseVersion: z.number().int().min(0),
  contentVersion: z.number().int().min(0),
  savedAt: IsoDateTimeSchema.nullable(),
});
export type StorefrontDraftState = z.infer<typeof StorefrontDraftStateSchema>;

export const SaveStorefrontDraftInputSchema = z.object({
  content: StorefrontContentSchema,
  baseVersion: z.number().int().min(0),
});
export type SaveStorefrontDraftInput = z.infer<typeof SaveStorefrontDraftInputSchema>;

export const PublishStorefrontInputSchema = z.object({
  baseVersion: z.number().int().min(0),
});
export type PublishStorefrontInput = z.infer<typeof PublishStorefrontInputSchema>;

export const ContentVersionSchema = z.object({ contentVersion: z.number().int().min(0) });
export type ContentVersion = z.infer<typeof ContentVersionSchema>;

export const PreviewTokenSchema = z.object({
  token: z.string().min(1),
  expiresAt: IsoDateTimeSchema,
});
export type PreviewToken = z.infer<typeof PreviewTokenSchema>;

// Every message carries this tag, so other scripts' messages (browser extensions, dev tools) are ignored.
export const EDITOR_CHANNEL = 'smartapp-editor';
const channel = z.literal(EDITOR_CHANNEL);

/**
 * The page the preview shows (final polish, T78): Home, the menu, Rewards, Account as a guest sees it, or
 * Home with the Shop info sheet open (where the About text lives).
 */
export const PREVIEW_PAGES = ['home', 'menu', 'rewards', 'account', 'about'] as const;
export const PreviewPageEnum = z.enum(PREVIEW_PAGES);
export type PreviewPage = z.infer<typeof PreviewPageEnum>;

// A banner's words, typed straight onto the preview (T78).
export const BANNER_TEXT_FIELDS = ['title', 'description'] as const;
export const BannerTextFieldEnum = z.enum(BANNER_TEXT_FIELDS);
export type BannerTextField = z.infer<typeof BannerTextFieldEnum>;
// The longest each one may be (BannerSchema).
export const BANNER_TEXT_MAX: Record<BannerTextField, number> = { title: 40, description: 90 };

/**
 * Editor → preview: the whole draft, the part to outline, the part under the pointer, the banner to show,
 * the page to show.
 */
export const EditorToPreviewSchema = z.discriminatedUnion('type', [
  z.object({ channel, type: z.literal('draft'), content: StorefrontContentSchema }),
  z.object({ channel, type: z.literal('select'), section: EditorSectionEnum.nullable() }),
  z.object({ channel, type: z.literal('hover'), section: EditorSectionEnum.nullable() }),
  z.object({ channel, type: z.literal('banner'), index: z.number().int().min(0).max(2) }),
  z.object({ channel, type: z.literal('page'), page: PreviewPageEnum }),
]);
export type EditorToPreview = z.infer<typeof EditorToPreviewSchema>;

/**
 * Preview → Editor: the page is ready for a draft, the owner tapped a part of it, moved to another page, or
 * typed a banner's words on the page.
 */
export const PreviewToEditorSchema = z.discriminatedUnion('type', [
  z.object({ channel, type: z.literal('ready') }),
  z.object({ channel, type: z.literal('select'), section: EditorSectionEnum }),
  z.object({ channel, type: z.literal('page'), page: PreviewPageEnum }),
  z.object({
    channel,
    type: z.literal('text'),
    index: z.number().int().min(0).max(2),
    field: BannerTextFieldEnum,
    value: z.string().max(BANNER_TEXT_MAX.description),
  }),
]);
export type PreviewToEditor = z.infer<typeof PreviewToEditorSchema>;
