import { describe, expect, it } from 'vitest';
import {
  EDITOR_CHANNEL,
  EditorToPreviewSchema,
  PreviewToEditorSchema,
  SHOP_PACKS,
  StorefrontContentSchema,
  applyContent,
  colourFamily,
  contentOf,
  editorChanges,
  imageSources,
  isLocalPicture,
  logoColours,
  logoPalettes,
  sameContent,
  sectionIsOn,
  srcsetUrls,
  withSection,
} from '../src/index.js';

const kanto = SHOP_PACKS['kanto-smash'].storefront;

describe('editor content (T72)', () => {
  it('reads the draft from a storefront and puts it back unchanged', () => {
    const content = contentOf(kanto);
    expect(StorefrontContentSchema.parse(content)).toEqual(content);
    const back = applyContent(kanto, content);
    expect(back).toEqual(kanto);
    expect(back).not.toBe(kanto);
  });

  it('compares drafts by value, not key order', () => {
    const a = contentOf(kanto);
    const b = { look: a.look, about: a.about, tagline: a.tagline, logo: a.logo };
    expect(sameContent(a, b)).toBe(true);
    expect(sameContent(a, { ...a, tagline: 'Other' })).toBe(false);
  });

  it('turns both Hours and Contact with the one "Hours and contact" part', () => {
    const off = withSection(contentOf(kanto), 'info', false);
    expect(off.look.sections.hours).toBe(false);
    expect(off.look.sections.contact).toBe(false);
    expect(sectionIsOn(off, 'info')).toBe(false);
    expect(sectionIsOn(off, 'brand')).toBeNull();
  });
});

describe('what Publish changes (E2)', () => {
  it('is empty when nothing changed', () => {
    const c = contentOf(kanto);
    expect(editorChanges(c, structuredClone(c))).toEqual([]);
  });

  it('lists colour, page, banners, announcement and section changes in page order', () => {
    const before = contentOf(kanto);
    const after = structuredClone(before);
    after.look.brandColor = '#1F9D55';
    after.look.surface = 'light';
    after.look.banners = after.look.banners.slice(0, 1);
    after.look.announcement = null;
    after.look.sections.membersCount = !before.look.sections.membersCount;
    after.tagline = 'New line';
    const kinds = editorChanges(before, after).map((c) => c.kind);
    expect(kinds).toEqual(['brandColor', 'surface', 'tagline', 'banners', 'section']);
    const banners = editorChanges(before, after).find((c) => c.kind === 'banners');
    expect(banners).toEqual({ kind: 'banners', from: before.look.banners.length, to: 1 });
  });

  it('ignores the seconds per banner when only one banner is left', () => {
    const before = contentOf(kanto);
    const after = structuredClone(before);
    after.look.banners = before.look.banners.slice(0, 1);
    after.look.bannerSeconds = 9;
    expect(editorChanges(before, after).some((c) => c.kind === 'bannerSeconds')).toBe(false);
  });
});

describe('preview messages (E13)', () => {
  it('only takes tagged, well formed messages', () => {
    expect(
      EditorToPreviewSchema.safeParse({
        channel: EDITOR_CHANNEL,
        type: 'select',
        section: 'banners',
      }).success,
    ).toBe(true);
    expect(EditorToPreviewSchema.safeParse({ type: 'select', section: 'banners' }).success).toBe(
      false,
    );
    expect(
      EditorToPreviewSchema.safeParse({ channel: EDITOR_CHANNEL, type: 'banner', index: 5 })
        .success,
    ).toBe(false);
    expect(
      PreviewToEditorSchema.safeParse({ channel: EDITOR_CHANNEL, type: 'select', section: 'x' })
        .success,
    ).toBe(false);
  });
});

describe('pictures added in mock mode', () => {
  const data = 'data:image/webp;base64,AAAA,BBBB';

  it('show from a data address, with no AVIF copy', () => {
    expect(isLocalPicture(data)).toBe(true);
    expect(isLocalPicture('javascript:alert(1)')).toBe(false);
    expect(imageSources(data)).toEqual({ avif: '', webp: `${data} 1600w`, widths: [1600] });
  });

  it('reads a srcset even when an address has a comma inside', () => {
    expect(srcsetUrls(`${data} 1600w`)).toEqual([data]);
    expect(srcsetUrls('/a-320.webp 320w, /a-640.webp 640w')).toEqual([
      '/a-320.webp',
      '/a-640.webp',
    ]);
  });
});

describe('colour names', () => {
  it('names the demo shops and presets plainly', () => {
    expect(colourFamily('#D7372F')).toBe('red');
    expect(colourFamily('#0E7AC4')).toBe('blue');
    expect(colourFamily('#6F4E37')).toBe('brown');
    expect(colourFamily('#C27C2C')).toBe('orange');
    expect(colourFamily('#B83280')).toBe('pink');
    expect(colourFamily('#1F9D55')).toBe('green');
    expect(colourFamily('#FFFFFF')).toBe('white');
    expect(colourFamily('#111111')).toBe('black');
  });
});

describe('colours from a logo (T73)', () => {
  const pixels = (...runs: [number, [number, number, number, number]][]) =>
    runs.flatMap(([n, px]) => Array.from({ length: n }, () => px)).flat();

  it('finds the main colours, most used first, and skips white and see-through pixels', () => {
    const rgba = pixels(
      [700, [215, 55, 47, 255]],
      [200, [255, 255, 255, 255]],
      [100, [14, 122, 196, 255]],
      [300, [0, 200, 0, 0]],
    );
    const colours = logoColours(rgba);
    expect(colours.map((c) => colourFamily(c.hex))).toEqual(['red', 'blue']);
    expect(colours[0]?.share).toBeCloseTo(0.875, 2);
  });

  it('gives nothing for a black and white logo, so the owner picks a colour instead', () => {
    expect(logoColours(pixels([500, [0, 0, 0, 255]], [500, [250, 250, 250, 255]]))).toEqual([]);
    expect(logoPalettes([])).toEqual([]);
  });

  it('suggests plain, tinted, then the second colour', () => {
    const looks = logoPalettes([
      { hex: '#D7372F', share: 0.8 },
      { hex: '#0E7AC4', share: 0.2 },
    ]);
    expect(looks).toEqual([
      { brandColor: '#D7372F', pageColor: null },
      { brandColor: '#D7372F', pageColor: '#D7372F' },
      { brandColor: '#0E7AC4', pageColor: null },
    ]);
  });
});
