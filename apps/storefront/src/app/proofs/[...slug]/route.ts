// Mock route serving 1x1 WebP image for payment proof uploads and previews
const WEBP_1X1_BASE64 =
  'UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAAFZQOCAYAAAAMAEAnQEqAQABAAFAJiWkAANwAP79NvgAAAA=';

export async function GET() {
  const buffer = Buffer.from(WEBP_1X1_BASE64, 'base64');
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
