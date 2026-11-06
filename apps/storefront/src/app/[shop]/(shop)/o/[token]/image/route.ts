import { createElement, type CSSProperties, type ReactNode } from 'react';
import { ImageResponse } from 'next/og';
import { formatPeso, oklchToHex, parseOklch, shopPalette, words } from '@smartapp/core';
import { getOrderReceiptForServer, getStorefrontForServer } from '@smartapp/data/server';
import { formatManilaDateTime, formatOrderNumber } from '@/features/receipt/receipt-rules';
import { paymentChip } from '@/features/receipt/receipt-look';

interface RouteProps {
  params: Promise<{ shop: string; token: string }>;
}

// The image renderer takes plain colours; the palette is OKLCH (as the manifest route does).
function hex(value: string): string {
  const color = parseOklch(value);
  return color ? oklchToHex(color) : value;
}

function el(type: string, style: CSSProperties, ...children: ReactNode[]) {
  return createElement(type, { style }, ...children);
}

/**
 * The receipt as a picture to save or share (T10). Words come from words.ts and colours from the shop's own
 * palette on paper (always the light surface, so it prints), never fixed greys (decision R44).
 */
export async function GET(_request: Request, { params }: RouteProps): Promise<Response> {
  const { shop: slug, token } = await params;
  const storefront = getStorefrontForServer(slug);
  const order = await getOrderReceiptForServer(slug, token);

  if (!storefront || !order) {
    return new Response(null, { status: 404 });
  }

  const { info, look } = storefront.storefront;
  const p = shopPalette(look.brandColor, 'light');
  const paper = hex(p.shop30);
  const ink = hex(p.foreground);
  const brand = hex(p.shop10);
  const onBrand = hex(p.shop10Foreground);
  const brandText = hex(p.shop10Text);
  const rule = hex(p.shop10Soft);
  const T = words.checkout.totals;

  const row = (label: string, value: string, style: CSSProperties = {}) =>
    el(
      'div',
      { display: 'flex', justifyContent: 'space-between', fontSize: 24, marginBottom: 8, ...style },
      el('span', {}, label),
      el('span', {}, value),
    );

  const lines = order.lines.map((line) =>
    el(
      'div',
      {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingTop: 10,
        paddingBottom: 10,
        borderBottom: `1px solid ${rule}`,
        fontSize: 24,
      },
      el(
        'div',
        { display: 'flex', flexDirection: 'column', flex: 1 },
        el('span', { fontWeight: 700 }, `${line.qty}× ${line.name}`),
        line.variantLabel ? el('span', { fontSize: 18, opacity: 0.7 }, line.variantLabel) : null,
      ),
      el('span', { fontWeight: 700, marginLeft: 16 }, formatPeso(line.lineTotal)),
    ),
  );

  const receipt = el(
    'div',
    {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: paper,
      color: ink,
      fontFamily: 'sans-serif',
    },
    // The shop's band: its brand colour, name and address.
    el(
      'div',
      {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: brand,
        color: onBrand,
        padding: '48px 64px 40px',
      },
      el('span', { fontSize: 48, fontWeight: 700 }, info.name),
      info.contact.address
        ? el('span', { fontSize: 20, marginTop: 8, opacity: 0.85 }, info.contact.address)
        : null,
    ),
    el(
      'div',
      { display: 'flex', flexDirection: 'column', flex: 1, padding: '40px 64px 48px' },
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          paddingBottom: 24,
          marginBottom: 16,
          borderBottom: `2px solid ${ink}`,
        },
        el(
          'div',
          { display: 'flex', flexDirection: 'column' },
          el('span', { fontSize: 20, opacity: 0.7 }, words.receipt.orderLabel),
          el('span', { fontSize: 56, fontWeight: 800 }, formatOrderNumber(order.orderNo)),
          el(
            'span',
            { fontSize: 20, opacity: 0.7 },
            `${words.shop.orderType[order.type]} · ${words.shop.paymentMethod[order.paymentMethod]}`,
          ),
        ),
        el(
          'div',
          { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' },
          el('span', { fontSize: 20, opacity: 0.7 }, formatManilaDateTime(order.placedAt)),
          el(
            'span',
            { fontSize: 22, fontWeight: 700, color: brandText, marginTop: 4 },
            paymentChip(order).label,
          ),
        ),
      ),
      el('div', { display: 'flex', flexDirection: 'column', flex: 1 }, ...lines),
      el(
        'div',
        {
          display: 'flex',
          flexDirection: 'column',
          borderTop: `2px solid ${ink}`,
          paddingTop: 20,
          marginTop: 20,
        },
        row(T.subtotal, formatPeso(order.totals.subtotal), { opacity: 0.8 }),
        order.totals.discount > 0
          ? row(T.discount, `−${formatPeso(order.totals.discount)}`, { color: brandText })
          : null,
        order.totals.deliveryFee > 0
          ? row(T.deliveryFee, formatPeso(order.totals.deliveryFee), { opacity: 0.8 })
          : null,
        row(T.total, formatPeso(order.totals.total), {
          fontSize: 36,
          fontWeight: 800,
          color: brandText,
          borderTop: `1px solid ${rule}`,
          paddingTop: 12,
          marginTop: 8,
          marginBottom: 0,
        }),
      ),
      el(
        'div',
        {
          display: 'flex',
          justifyContent: 'center',
          marginTop: 32,
          paddingTop: 16,
          borderTop: `1px solid ${rule}`,
          fontSize: 18,
          fontWeight: 700,
          opacity: 0.7,
        },
        words.shop.orderSlip,
      ),
    ),
  );

  return new ImageResponse(receipt, {
    width: 1080,
    height: 1400,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  });
}
