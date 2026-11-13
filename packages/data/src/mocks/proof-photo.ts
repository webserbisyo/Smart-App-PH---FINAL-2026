// The demo's payment photos (T87): a plain sample receipt drawn as an SVG, so the owner's chat shows a
// real picture with the order's own amount and reference. It never copies a payment app's look, and it
// says on its face that it is a sample.
import { formatManila, formatPeso, sampleReceiptWords } from '@smartapp/core';

const W = sampleReceiptWords;

export interface SampleReceipt {
  method: string;
  amount: number;
  reference: string;
  shopName: string;
  at: string;
}

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function row(y: number, label: string, value: string): string {
  return [
    `<text x="32" y="${y}" font-size="15" fill="#5b6478">${escape(label)}</text>`,
    `<text x="328" y="${y}" font-size="15" font-weight="600" fill="#1d2433" text-anchor="end">${escape(value)}</text>`,
    `<line x1="32" x2="328" y1="${y + 16}" y2="${y + 16}" stroke="#e3e6ec"/>`,
  ].join('');
}

/** A 360 × 640 sample receipt as a data URL (an <img> source). */
export function sampleReceiptUrl(receipt: SampleReceipt): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640" viewBox="0 0 360 640" font-family="system-ui, -apple-system, Segoe UI, sans-serif">',
    '<rect width="360" height="640" fill="#f4f5f8"/>',
    '<rect x="0" y="0" width="360" height="56" fill="#e3e6ec"/>',
    `<text x="180" y="35" font-size="15" font-weight="700" fill="#3a4152" text-anchor="middle" letter-spacing="1.5">${escape(W.title.toUpperCase())}</text>`,
    '<rect x="16" y="80" width="328" height="480" rx="16" fill="#ffffff" stroke="#e3e6ec"/>',
    '<circle cx="180" cy="148" r="34" fill="#e2f4ea"/>',
    '<path d="M164 149 l11 11 l22 -24" fill="none" stroke="#1f8a4c" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>',
    `<text x="180" y="218" font-size="17" fill="#5b6478" text-anchor="middle">${escape(W.transfer(receipt.method))}</text>`,
    `<text x="180" y="262" font-size="36" font-weight="800" fill="#1d2433" text-anchor="middle">${escape(formatPeso(receipt.amount))}</text>`,
    `<text x="180" y="290" font-size="13" fill="#5b6478" text-anchor="middle">${escape(W.amount)}</text>`,
    row(344, W.sentTo, receipt.shopName.slice(0, 26)),
    row(396, W.reference, receipt.reference),
    row(448, W.date, formatManila(receipt.at, 'long')),
    `<text x="180" y="604" font-size="13" fill="#5b6478" text-anchor="middle">${escape(W.note)}</text>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
