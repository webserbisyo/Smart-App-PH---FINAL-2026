import { createElement } from 'react';
import { ImageResponse } from 'next/og';
import { formatPeso, words } from '@smartapp/core';
import { getOrderReceiptForServer, getStorefrontForServer } from '@smartapp/data/server';
import { formatManilaDateTime, formatOrderNumber } from '@/features/receipt/receipt-rules';

interface RouteProps {
  params: Promise<{ shop: string; token: string }>;
}

export async function GET(_request: Request, { params }: RouteProps): Promise<Response> {
  const { shop: slug, token } = await params;
  const storefront = getStorefrontForServer(slug);
  const order = await getOrderReceiptForServer(slug, token);

  if (!storefront || !order) {
    return new Response('Order not found', { status: 404 });
  }

  const orderNumStr = formatOrderNumber(order.orderNo);
  const dateStr = formatManilaDateTime(order.placedAt);
  const shopName = storefront.storefront.info.name;

  const itemElements = order.lines.map((line, idx) =>
    createElement(
      'div',
      {
        key: `${line.itemId}-${idx}`,
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingTop: '8px',
          paddingBottom: '8px',
          borderBottomWidth: '1px',
          borderBottomColor: '#e5e7eb',
          fontSize: '24px',
        },
      },
      createElement(
        'div',
        { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
        createElement(
          'span',
          { style: { fontWeight: 'bold', color: '#111827' } },
          `${line.qty}x ${line.name}`,
        ),
        line.variantLabel
          ? createElement(
              'span',
              { style: { fontSize: '18px', color: '#6b7280' } },
              line.variantLabel,
            )
          : null,
      ),
      createElement(
        'span',
        { style: { fontWeight: 'bold', color: '#111827', marginLeft: '16px' } },
        formatPeso(line.lineTotal),
      ),
    ),
  );

  const receiptElement = createElement(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#ffffff',
        padding: '64px',
        fontFamily: 'sans-serif',
      },
    },
    // Header
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottomWidth: '2px',
          borderBottomColor: '#111827',
          paddingBottom: '24px',
          marginBottom: '24px',
        },
      },
      createElement(
        'h1',
        { style: { fontSize: '48px', fontWeight: 'bold', color: '#111827', margin: 0 } },
        shopName,
      ),
      createElement(
        'p',
        { style: { fontSize: '20px', color: '#4b5563', marginTop: '8px', margin: 0 } },
        storefront.storefront.info.contact.address || 'Smart App PH Storefront',
      ),
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: '32px',
          },
        },
        createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column' } },
          createElement(
            'span',
            { style: { fontSize: '42px', fontWeight: 'bold', color: '#111827' } },
            orderNumStr,
          ),
          createElement(
            'span',
            { style: { fontSize: '20px', color: '#6b7280' } },
            `${order.type.toUpperCase()} · ${order.paymentMethod.toUpperCase()}`,
          ),
        ),
        createElement(
          'div',
          { style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end' } },
          createElement('span', { style: { fontSize: '20px', color: '#6b7280' } }, dateStr),
          createElement(
            'span',
            {
              style: {
                fontSize: '20px',
                fontWeight: 'bold',
                color: order.paymentStatus === 'paid' ? '#16a34a' : '#d97706',
                marginTop: '4px',
              },
            },
            order.paymentStatus.toUpperCase(),
          ),
        ),
      ),
    ),
    // Items list
    createElement(
      'div',
      { style: { display: 'flex', flexDirection: 'column', flex: 1 } },
      ...itemElements,
    ),
    // Totals section
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          borderTopWidth: '2px',
          borderTopColor: '#111827',
          paddingTop: '20px',
          marginTop: '20px',
        },
      },
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '24px',
            color: '#4b5563',
            marginBottom: '8px',
          },
        },
        createElement('span', null, 'Subtotal'),
        createElement('span', null, formatPeso(order.totals.subtotal)),
      ),
      order.totals.discount > 0
        ? createElement(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '24px',
                color: '#16a34a',
                marginBottom: '8px',
              },
            },
            createElement('span', null, 'Discount'),
            createElement('span', null, `-${formatPeso(order.totals.discount)}`),
          )
        : null,
      order.totals.deliveryFee > 0
        ? createElement(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '24px',
                color: '#4b5563',
                marginBottom: '8px',
              },
            },
            createElement('span', null, 'Delivery fee'),
            createElement('span', null, formatPeso(order.totals.deliveryFee)),
          )
        : null,
      createElement(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#111827',
            borderTopWidth: '1px',
            borderTopColor: '#e5e7eb',
            paddingTop: '12px',
            marginTop: '8px',
          },
        },
        createElement('span', null, 'Total'),
        createElement('span', null, formatPeso(order.totals.total)),
      ),
    ),
    // Footer line
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: '32px',
          paddingTop: '16px',
          borderTopWidth: '1px',
          borderTopColor: '#e5e7eb',
        },
      },
      createElement(
        'span',
        { style: { fontSize: '18px', fontWeight: 'bold', color: '#6b7280' } },
        words.shop.orderSlip,
      ),
    ),
  );

  return new ImageResponse(receiptElement, {
    width: 1080,
    height: 1400,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  });
}
