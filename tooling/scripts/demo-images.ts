import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import sharp, { type Sharp } from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const MAP_PATH = path.join(projectRoot, 'tooling/assets/demo-image-map.json');
const OUTPUT_ROOT = path.join(projectRoot, 'apps/storefront/public/demo');
const CORE_MEDIA_PATH = path.join(projectRoot, 'packages/core/src/demo/media.ts');

const BRAND_COLORS: Record<string, string> = {
  'kanto-smash': '#D7372F',
  aqualinis: '#0E7AC4',
  'tala-apparel': '#2E3A87',
  'kape-juan': '#6F4E37',
  'lola-remy': '#C27C2C',
};

interface MapEntry {
  source: string;
  shop: string;
  kind: 'logo' | 'banner' | 'item' | 'prize' | 'wordmark';
  key: string;
  confidence: 'high' | 'low';
  note?: string;
}

interface ImageStats {
  shop: string;
  kind: string;
  key: string;
  formats: Record<string, number>;
}

async function encodeWebpAndAvif(
  pipeline: Sharp,
  destPathWithoutExt: string,
  maxWebpBytes: number,
  enforceAvifSmaller = true,
): Promise<{ webpBytes: number; avifBytes: number }> {
  // WebP encoding (budget check with quality down to minimum 50)
  let webpQuality = 80;
  let webpBuf = await pipeline.clone().webp({ quality: webpQuality, effort: 4 }).toBuffer();
  while (webpBuf.length > maxWebpBytes && webpQuality >= 50) {
    webpQuality -= 3;
    webpBuf = await pipeline.clone().webp({ quality: webpQuality, effort: 4 }).toBuffer();
  }

  if (webpBuf.length > maxWebpBytes) {
    throw new Error(
      `WebP exceeded budget even at quality 50: ${destPathWithoutExt}.webp (${(webpBuf.length / 1024).toFixed(1)} KB > ${(maxWebpBytes / 1024).toFixed(1)} KB)`,
    );
  }

  // AVIF encoding (must be smaller than WebP with quality down to minimum 50)
  let avifQuality = Math.min(60, webpQuality);
  let avifBuf = await pipeline.clone().avif({ quality: avifQuality, effort: 3 }).toBuffer();

  if (enforceAvifSmaller && avifBuf.length >= webpBuf.length) {
    while (avifBuf.length >= webpBuf.length && avifQuality >= 50) {
      avifQuality -= 3;
      avifBuf = await pipeline.clone().avif({ quality: avifQuality, effort: 3 }).toBuffer();
    }
    // If still >= webpBuf on tiny assets (< 5 KB), adjust WebP quality slightly higher (within budget)
    if (avifBuf.length >= webpBuf.length && webpBuf.length < 5 * 1024) {
      webpQuality = 85;
      webpBuf = await pipeline.clone().webp({ quality: webpQuality, effort: 4 }).toBuffer();
      avifQuality = 55;
      avifBuf = await pipeline.clone().avif({ quality: avifQuality, effort: 3 }).toBuffer();
      while (avifBuf.length >= webpBuf.length && avifQuality >= 50) {
        avifQuality -= 3;
        avifBuf = await pipeline.clone().avif({ quality: avifQuality, effort: 3 }).toBuffer();
      }
    }
    if (avifBuf.length >= webpBuf.length) {
      throw new Error(
        `AVIF must be strictly smaller than WebP for ${destPathWithoutExt}: AVIF=${avifBuf.length} WebP=${webpBuf.length} (at avifQuality=${avifQuality})`,
      );
    }
  }

  fs.writeFileSync(`${destPathWithoutExt}.webp`, webpBuf);
  fs.writeFileSync(`${destPathWithoutExt}.avif`, avifBuf);

  return { webpBytes: webpBuf.length, avifBytes: avifBuf.length };
}

async function generatePwaIcon(
  logoPipeline: Sharp,
  size: number,
  logoScale: number,
  brandColor: string,
  destPath: string,
  flatten = false,
) {
  const logoTargetSize = Math.round(size * logoScale);
  const logoBuf = await logoPipeline
    .clone()
    .resize(logoTargetSize, logoTargetSize, { fit: 'inside' })
    .png()
    .toBuffer();

  let compositePipeline = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: brandColor,
    },
  }).composite([{ input: logoBuf, gravity: 'center' }]);

  if (flatten) {
    compositePipeline = compositePipeline.flatten({ background: brandColor });
  }

  const outBuf = await compositePipeline.png().toBuffer();
  fs.writeFileSync(destPath, outBuf);
  return outBuf.length;
}

async function run() {
  console.log('Reading image map from:', MAP_PATH);
  const mapData: MapEntry[] = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

  const validEntries = mapData.filter((e) => e.confidence === 'high' && e.kind !== 'wordmark');
  console.log(`Processing ${validEntries.length} approved images...`);

  const manifestData: Record<
    string,
    { logo: boolean; banners: number; items: string[]; prize: boolean }
  > = {
    'kanto-smash': { logo: false, banners: 0, items: [], prize: false },
    aqualinis: { logo: false, banners: 0, items: [], prize: false },
    'tala-apparel': { logo: false, banners: 0, items: [], prize: false },
    'kape-juan': { logo: false, banners: 0, items: [], prize: false },
    'lola-remy': { logo: false, banners: 0, items: [], prize: false },
  };

  const processedStats: ImageStats[] = [];

  for (const [index, entry] of validEntries.entries()) {
    const srcPath = path.join(projectRoot, entry.source);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Source file not found: ${srcPath}`);
    }

    const shopDir = path.join(OUTPUT_ROOT, entry.shop);
    const brandColor = BRAND_COLORS[entry.shop];
    if (!brandColor) {
      throw new Error(`Missing brand color for shop ${entry.shop}`);
    }

    const shopManifest = manifestData[entry.shop];
    if (!shopManifest) {
      throw new Error(`Missing manifest entry for shop ${entry.shop}`);
    }

    console.log(
      `[${index + 1}/${validEntries.length}] ${entry.shop} - ${entry.kind}: ${entry.key}`,
    );

    if (entry.kind === 'item' || entry.kind === 'prize') {
      const itemsDir = path.join(shopDir, 'items');
      fs.mkdirSync(itemsDir, { recursive: true });

      const baseName = entry.kind === 'prize' ? 'prize' : entry.key;
      const pipeline640 = sharp(srcPath).resize(640, 640, {
        fit: 'cover',
        position: 'center',
      });
      const pipeline320 = sharp(srcPath).resize(320, 320, {
        fit: 'cover',
        position: 'center',
      });

      // Budget for 640 WebP: <= 45 KB (45 * 1024)
      const res640 = await encodeWebpAndAvif(
        pipeline640,
        path.join(itemsDir, `${baseName}-640`),
        45 * 1024,
        true,
      );
      // 320 is smaller than 640
      const res320 = await encodeWebpAndAvif(
        pipeline320,
        path.join(itemsDir, `${baseName}-320`),
        30 * 1024,
        true,
      );

      if (entry.kind === 'prize') {
        shopManifest.prize = true;
      } else {
        shopManifest.items.push(entry.key);
      }

      processedStats.push({
        shop: entry.shop,
        kind: entry.kind,
        key: baseName,
        formats: {
          '640.webp': res640.webpBytes,
          '640.avif': res640.avifBytes,
          '320.webp': res320.webpBytes,
          '320.avif': res320.avifBytes,
        },
      });
    } else if (entry.kind === 'banner') {
      const bannersDir = path.join(shopDir, 'banners');
      const brandDir = path.join(shopDir, 'brand');
      fs.mkdirSync(bannersDir, { recursive: true });
      fs.mkdirSync(brandDir, { recursive: true });

      // 21:9 ratio: 1600x686, 800x343
      const pipeline1600 = sharp(srcPath).resize(1600, 686, {
        fit: 'cover',
        position: 'center',
      });
      const pipeline800 = sharp(srcPath).resize(800, 343, {
        fit: 'cover',
        position: 'center',
      });

      // Budget for banner 1600 WebP: <= 130 KB (130 * 1024)
      const res1600 = await encodeWebpAndAvif(
        pipeline1600,
        path.join(bannersDir, `${entry.key}-1600`),
        130 * 1024,
        true,
      );
      const res800 = await encodeWebpAndAvif(
        pipeline800,
        path.join(bannersDir, `${entry.key}-800`),
        65 * 1024,
        true,
      );

      shopManifest.banners += 1;

      const formats: Record<string, number> = {
        '1600.webp': res1600.webpBytes,
        '1600.avif': res1600.avifBytes,
        '800.webp': res800.webpBytes,
        '800.avif': res800.avifBytes,
      };

      // If banner 1, also generate og.jpg (1200 x 630, budget <= 150 KB)
      if (entry.key === 'banner-1') {
        const ogJpgPath = path.join(brandDir, 'og.jpg');
        let ogQuality = 82;
        let ogBuf = await sharp(srcPath)
          .resize(1200, 630, { fit: 'cover', position: 'center' })
          .jpeg({ quality: ogQuality, mozjpeg: true })
          .toBuffer();

        while (ogBuf.length > 150 * 1024 && ogQuality >= 50) {
          ogQuality -= 3;
          ogBuf = await sharp(srcPath)
            .resize(1200, 630, { fit: 'cover', position: 'center' })
            .jpeg({ quality: ogQuality, mozjpeg: true })
            .toBuffer();
        }

        if (ogBuf.length > 150 * 1024) {
          throw new Error(
            `og.jpg exceeded budget even at quality 50: ${ogJpgPath} (${(ogBuf.length / 1024).toFixed(1)} KB > 150 KB)`,
          );
        }
        fs.writeFileSync(ogJpgPath, ogBuf);
        formats['og.jpg'] = ogBuf.length;
      }

      processedStats.push({
        shop: entry.shop,
        kind: entry.kind,
        key: entry.key,
        formats,
      });
    } else if (entry.kind === 'logo') {
      const brandDir = path.join(shopDir, 'brand');
      fs.mkdirSync(brandDir, { recursive: true });

      const pipeline256 = sharp(srcPath).resize(256, 256, {
        fit: 'cover',
        position: 'center',
      });
      const pipeline128 = sharp(srcPath).resize(128, 128, {
        fit: 'cover',
        position: 'center',
      });

      const res256 = await encodeWebpAndAvif(
        pipeline256,
        path.join(brandDir, 'logo-256'),
        25 * 1024,
        true,
      );
      const res128 = await encodeWebpAndAvif(
        pipeline128,
        path.join(brandDir, 'logo-128'),
        15 * 1024,
        true,
      );

      // PWA icons
      // icon-512.png (512x512, 80% logo)
      const size512 = await generatePwaIcon(
        sharp(srcPath),
        512,
        0.8,
        brandColor,
        path.join(brandDir, 'icon-512.png'),
        false,
      );
      // icon-maskable-512.png (512x512, 80% logo, no transparency)
      const sizeMaskable512 = await generatePwaIcon(
        sharp(srcPath),
        512,
        0.8,
        brandColor,
        path.join(brandDir, 'icon-maskable-512.png'),
        true,
      );
      // icon-192.png (192x192, 80% logo)
      const size192 = await generatePwaIcon(
        sharp(srcPath),
        192,
        0.8,
        brandColor,
        path.join(brandDir, 'icon-192.png'),
        false,
      );
      // apple-touch-icon.png (180x180, 80% logo, no transparency)
      const sizeApple = await generatePwaIcon(
        sharp(srcPath),
        180,
        0.8,
        brandColor,
        path.join(brandDir, 'apple-touch-icon.png'),
        true,
      );

      shopManifest.logo = true;

      processedStats.push({
        shop: entry.shop,
        kind: entry.kind,
        key: 'logo',
        formats: {
          'logo-256.webp': res256.webpBytes,
          'logo-256.avif': res256.avifBytes,
          'logo-128.webp': res128.webpBytes,
          'logo-128.avif': res128.avifBytes,
          'icon-512.png': size512,
          'icon-maskable-512.png': sizeMaskable512,
          'icon-192.png': size192,
          'apple-touch-icon.png': sizeApple,
        },
      });
    }
  }

  // Sort items for determinism
  for (const shop of Object.keys(manifestData)) {
    const sm = manifestData[shop];
    if (sm) {
      sm.items.sort();
    }
  }

  // Generate packages/core/src/demo/media.ts
  const manifestFileContent = `import { z } from 'zod';
import type { DemoShopSlug } from './slugs.js';

export const DemoShopMediaSchema = z.object({
  logo: z.boolean(),
  banners: z.number().int().min(0).max(3),
  items: z.array(z.string()).readonly(),
  prize: z.boolean(),
});

export type DemoShopMedia = z.infer<typeof DemoShopMediaSchema>;

export const DEMO_MEDIA: Record<DemoShopSlug, DemoShopMedia> = ${JSON.stringify(
    manifestData,
    null,
    2,
  )} as const;
`;

  fs.mkdirSync(path.dirname(CORE_MEDIA_PATH), { recursive: true });
  fs.writeFileSync(CORE_MEDIA_PATH, manifestFileContent, 'utf8');
  console.log('Saved manifest to:', CORE_MEDIA_PATH);

  // Format with prettier
  try {
    execSync(`npx prettier --write "${CORE_MEDIA_PATH}"`, { cwd: projectRoot });
    console.log('Formatted manifest with Prettier');
  } catch (e) {
    console.warn('Prettier formatting warning:', e);
  }

  // Compute total sizes per shop
  console.log('\n--- SIZE TOTALS PER SHOP ---');
  let grandTotal = 0;
  for (const shop of Object.keys(manifestData)) {
    const shopDir = path.join(OUTPUT_ROOT, shop);
    let shopBytes = 0;
    const walk = (d: string) => {
      const files = fs.readdirSync(d, { withFileTypes: true });
      for (const f of files) {
        const full = path.join(d, f.name);
        if (f.isDirectory()) walk(full);
        else shopBytes += fs.statSync(full).size;
      }
    };
    if (fs.existsSync(shopDir)) walk(shopDir);
    console.log(
      `${shop}: ${(shopBytes / (1024 * 1024)).toFixed(2)} MB (${shopBytes.toLocaleString()} bytes)`,
    );
    grandTotal += shopBytes;
  }
  console.log(
    `Grand Total (apps/storefront/public/demo): ${(grandTotal / (1024 * 1024)).toFixed(2)} MB (${grandTotal.toLocaleString()} bytes)`,
  );
  console.log('Done!');
}

run().catch((err) => {
  console.error('Fatal conversion error:', err);
  process.exit(1);
});
