import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { DEMO_MEDIA } from '../packages/core/src/demo/media.js';
import { DEMO_SHOP_SLUGS } from '../packages/core/src/demo/slugs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const DEMO_ROOT = path.join(projectRoot, 'apps/storefront/public/demo');

describe('Demo Assets Integrity and Budgets', () => {
  it('covers all 5 demo shop slugs in DEMO_MEDIA', () => {
    expect(Object.keys(DEMO_MEDIA).sort()).toEqual([...DEMO_SHOP_SLUGS].sort());
  });

  it('contains no "halo" folder or file anywhere under apps/', () => {
    const appsDir = path.join(projectRoot, 'apps');
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        expect(
          entry.name.toLowerCase().includes('halo'),
          `Found forbidden halo asset in apps: ${path.join(dir, entry.name)}`,
        ).toBe(false);
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name));
        }
      }
    };
    walk(appsDir);
  });

  it('verifies all files in DEMO_MEDIA exist, have correct dimensions, and meet budgets', async () => {
    for (const [slug, media] of Object.entries(DEMO_MEDIA)) {
      const shopDir = path.join(DEMO_ROOT, slug);
      expect(fs.existsSync(shopDir), `Missing shop folder: ${shopDir}`).toBe(true);

      // 1. Items
      for (const itemKey of media.items) {
        const item640Webp = path.join(shopDir, `items/${itemKey}-640.webp`);
        const item640Avif = path.join(shopDir, `items/${itemKey}-640.avif`);
        const item320Webp = path.join(shopDir, `items/${itemKey}-320.webp`);
        const item320Avif = path.join(shopDir, `items/${itemKey}-320.avif`);

        for (const f of [item640Webp, item640Avif, item320Webp, item320Avif]) {
          expect(fs.existsSync(f), `Missing item file: ${f}`).toBe(true);
        }

        // Budget check: product 640 WebP <= 45 KB
        const size640Webp = fs.statSync(item640Webp).size;
        const size640Avif = fs.statSync(item640Avif).size;
        const size320Webp = fs.statSync(item320Webp).size;
        const size320Avif = fs.statSync(item320Avif).size;

        expect(size640Webp).toBeLessThanOrEqual(45 * 1024);
        expect(size640Avif).toBeLessThan(size640Webp);
        expect(size320Avif).toBeLessThan(size320Webp);

        // Dimensions
        const meta640 = await sharp(item640Webp).metadata();
        expect(meta640.width).toBe(640);
        expect(meta640.height).toBe(640);

        const meta320 = await sharp(item320Webp).metadata();
        expect(meta320.width).toBe(320);
        expect(meta320.height).toBe(320);
      }

      // 2. Prize
      if (media.prize) {
        const prize640Webp = path.join(shopDir, 'items/prize-640.webp');
        const prize640Avif = path.join(shopDir, 'items/prize-640.avif');
        const prize320Webp = path.join(shopDir, 'items/prize-320.webp');
        const prize320Avif = path.join(shopDir, 'items/prize-320.avif');

        for (const f of [prize640Webp, prize640Avif, prize320Webp, prize320Avif]) {
          expect(fs.existsSync(f), `Missing prize file: ${f}`).toBe(true);
        }

        const size640Webp = fs.statSync(prize640Webp).size;
        const size640Avif = fs.statSync(prize640Avif).size;
        const size320Webp = fs.statSync(prize320Webp).size;
        const size320Avif = fs.statSync(prize320Avif).size;

        expect(size640Webp).toBeLessThanOrEqual(45 * 1024);
        expect(size640Avif).toBeLessThan(size640Webp);
        expect(size320Avif).toBeLessThan(size320Webp);
      }

      // 3. Banners (21:9)
      for (let b = 1; b <= media.banners; b++) {
        const banner1600Webp = path.join(shopDir, `banners/banner-${b}-1600.webp`);
        const banner1600Avif = path.join(shopDir, `banners/banner-${b}-1600.avif`);
        const banner800Webp = path.join(shopDir, `banners/banner-${b}-800.webp`);
        const banner800Avif = path.join(shopDir, `banners/banner-${b}-800.avif`);

        for (const f of [banner1600Webp, banner1600Avif, banner800Webp, banner800Avif]) {
          expect(fs.existsSync(f), `Missing banner file: ${f}`).toBe(true);
        }

        // Budget check: banner 1600 WebP <= 130 KB
        const size1600Webp = fs.statSync(banner1600Webp).size;
        const size1600Avif = fs.statSync(banner1600Avif).size;
        const size800Webp = fs.statSync(banner800Webp).size;
        const size800Avif = fs.statSync(banner800Avif).size;

        expect(size1600Webp).toBeLessThanOrEqual(130 * 1024);
        expect(size1600Avif).toBeLessThan(size1600Webp);
        expect(size800Avif).toBeLessThan(size800Webp);

        // Dimensions (21:9 crop: 1600x686, 800x343)
        const meta1600 = await sharp(banner1600Webp).metadata();
        expect(meta1600.width).toBe(1600);
        expect(meta1600.height).toBe(686);

        const meta800 = await sharp(banner800Webp).metadata();
        expect(meta800.width).toBe(800);
        expect(meta800.height).toBe(343);
      }

      // 4. Brand assets
      if (media.logo) {
        const logo256Webp = path.join(shopDir, 'brand/logo-256.webp');
        const logo256Avif = path.join(shopDir, 'brand/logo-256.avif');
        const logo128Webp = path.join(shopDir, 'brand/logo-128.webp');
        const logo128Avif = path.join(shopDir, 'brand/logo-128.avif');
        const icon512 = path.join(shopDir, 'brand/icon-512.png');
        const iconMaskable512 = path.join(shopDir, 'brand/icon-maskable-512.png');
        const icon192 = path.join(shopDir, 'brand/icon-192.png');
        const appleIcon = path.join(shopDir, 'brand/apple-touch-icon.png');
        const ogJpg = path.join(shopDir, 'brand/og.jpg');

        for (const f of [
          logo256Webp,
          logo256Avif,
          logo128Webp,
          logo128Avif,
          icon512,
          iconMaskable512,
          icon192,
          appleIcon,
          ogJpg,
        ]) {
          expect(fs.existsSync(f), `Missing brand file: ${f}`).toBe(true);
        }

        // Budget check: og.jpg <= 150 KB
        const ogSize = fs.statSync(ogJpg).size;
        expect(ogSize).toBeLessThanOrEqual(150 * 1024);

        // AVIF < WebP for logo
        expect(fs.statSync(logo256Avif).size).toBeLessThan(fs.statSync(logo256Webp).size);
        expect(fs.statSync(logo128Avif).size).toBeLessThan(fs.statSync(logo128Webp).size);

        // PWA icon dimensions
        const meta512 = await sharp(icon512).metadata();
        expect(meta512.width).toBe(512);
        expect(meta512.height).toBe(512);

        const metaMaskable = await sharp(iconMaskable512).metadata();
        expect(metaMaskable.width).toBe(512);
        expect(metaMaskable.height).toBe(512);

        const meta192 = await sharp(icon192).metadata();
        expect(meta192.width).toBe(192);
        expect(meta192.height).toBe(192);

        const metaApple = await sharp(appleIcon).metadata();
        expect(metaApple.width).toBe(180);
        expect(metaApple.height).toBe(180);

        const metaOg = await sharp(ogJpg).metadata();
        expect(metaOg.width).toBe(1200);
        expect(metaOg.height).toBe(630);
      }
    }
  });

  it('ensures no file on disk in public/demo is missing from DEMO_MEDIA', () => {
    const expectedFiles = new Set<string>();

    for (const [slug, media] of Object.entries(DEMO_MEDIA)) {
      // Items
      for (const itemKey of media.items) {
        expectedFiles.add(`${slug}/items/${itemKey}-640.webp`);
        expectedFiles.add(`${slug}/items/${itemKey}-640.avif`);
        expectedFiles.add(`${slug}/items/${itemKey}-320.webp`);
        expectedFiles.add(`${slug}/items/${itemKey}-320.avif`);
      }
      // Prize
      if (media.prize) {
        expectedFiles.add(`${slug}/items/prize-640.webp`);
        expectedFiles.add(`${slug}/items/prize-640.avif`);
        expectedFiles.add(`${slug}/items/prize-320.webp`);
        expectedFiles.add(`${slug}/items/prize-320.avif`);
      }
      // Banners
      for (let b = 1; b <= media.banners; b++) {
        expectedFiles.add(`${slug}/banners/banner-${b}-1600.webp`);
        expectedFiles.add(`${slug}/banners/banner-${b}-1600.avif`);
        expectedFiles.add(`${slug}/banners/banner-${b}-800.webp`);
        expectedFiles.add(`${slug}/banners/banner-${b}-800.avif`);
      }
      // Brand
      if (media.logo) {
        expectedFiles.add(`${slug}/brand/logo-256.webp`);
        expectedFiles.add(`${slug}/brand/logo-256.avif`);
        expectedFiles.add(`${slug}/brand/logo-128.webp`);
        expectedFiles.add(`${slug}/brand/logo-128.avif`);
        expectedFiles.add(`${slug}/brand/icon-512.png`);
        expectedFiles.add(`${slug}/brand/icon-maskable-512.png`);
        expectedFiles.add(`${slug}/brand/icon-192.png`);
        expectedFiles.add(`${slug}/brand/apple-touch-icon.png`);
        expectedFiles.add(`${slug}/brand/og.jpg`);
      }
    }

    // Walk disk
    const diskFiles: string[] = [];
    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else {
          diskFiles.push(path.relative(DEMO_ROOT, full));
        }
      }
    };
    walk(DEMO_ROOT);

    expect(diskFiles.length).toBe(expectedFiles.size);
    for (const df of diskFiles) {
      expect(expectedFiles.has(df), `Unexpected extra file in public/demo: ${df}`).toBe(true);
    }
  });
});
