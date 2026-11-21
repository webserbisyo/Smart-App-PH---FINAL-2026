import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
// The five demo shops (packages/core/src/demo/slugs.ts; Node can't load that .ts file by its .js name).
const DEMO_SHOP_SLUGS = [
  'kanto-smash',
  'aqualinis',
  'tala-apparel',
  'kape-juan',
  'lola-remy',
] as const;

// Sample payment QRs for the demo shops (decision T107). Each one only holds the words below, so a
// customer who scans it in GCash or a bank app is told it is not a payment code. Dark modules on white
// with a 4-module quiet zone, because many scanners fail on a QR on a dark or coloured background.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_ROOT = path.resolve(__dirname, '../../apps/storefront/public/demo');
// The QR maker that packages/ui already installs (for the DiceUI QR code), so no new package here.
const fromUi = createRequire(path.resolve(__dirname, '../../packages/ui/package.json'));
const QRCode: {
  toString: (text: string, options: Record<string, unknown>) => Promise<string>;
} = fromUi('qrcode');
const SIZE = 640;
const BAND = 56;

async function main() {
  for (const slug of DEMO_SHOP_SLUGS) {
    const text = `SAMPLE ONLY - Smart App PH demo shop (${slug}). This is not a payment code. Do not pay.`;
    const qrSvg = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 4,
      color: { dark: '#111111', light: '#FFFFFF' },
      width: SIZE - BAND,
    });
    const qr = await sharp(Buffer.from(qrSvg))
      .resize(SIZE - BAND, SIZE - BAND)
      .png()
      .toBuffer();
    const label = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${BAND}">
        <rect width="100%" height="100%" fill="#FFFFFF"/>
        <text x="50%" y="34" text-anchor="middle" font-family="sans-serif" font-size="24"
          font-weight="700" letter-spacing="3" fill="#111111">SAMPLE · DO NOT PAY</text>
      </svg>`,
    );
    const base = sharp({
      create: { width: SIZE, height: SIZE, channels: 3, background: '#FFFFFF' },
    }).composite([
      { input: qr, left: BAND / 2, top: 0 },
      { input: label, left: 0, top: SIZE - BAND },
    ]);
    const full = await base.png().toBuffer();
    const dir = path.join(OUTPUT_ROOT, slug, 'brand');
    fs.mkdirSync(dir, { recursive: true });
    for (const width of [320, 640]) {
      const img = sharp(full).resize(width, width, { kernel: 'nearest' });
      // WebP only: lossless WebP keeps the squares sharp at about 3 KB, smaller than any AVIF.
      await img.webp({ lossless: true }).toFile(path.join(dir, `qr-${width}.webp`));
    }
    console.log(`qr: ${slug}`);
  }
}

await main();
