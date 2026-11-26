/* global __ENV, open */
// Load test for staging (T118 task 8.7): about 100 customers looking at one shop at once, and 30 orders a
// minute in that shop. k6 runs as a container (never a repo package):
//
//   docker run --rm -i -v "$PWD/tooling/load:/load" \
//     -e API_URL=https://api-staging.webserbisyo.com -e SHOP=<test shop slug> \
//     -e SERVER_READ_SECRET=<staging value> -e STOREFRONT_ORIGIN=https://<slug>.webserbisyo.com \
//     -e ORDER_FILE=/load/order.json grafana/k6:0.57.0 run /load/storefront.js
//
// Reads carry the storefront server's header (every customer page load comes from Vercel's few addresses, so
// the per-address limit skips it, as in real use). Orders come from one address at 30 a minute, under the
// limit of 120. ORDER_FILE is one order's `payload` copied from a test order on staging (the browser's
// Network tab, the `orders` request); without it only the reads run. Use a shop marked as a test, and close
// the test orders after.
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = (__ENV.API_URL || '').replace(/\/+$/, '');
const SHOP = __ENV.SHOP || '';
const ORDER = __ENV.ORDER_FILE ? JSON.parse(open(__ENV.ORDER_FILE)) : null;

if (!API.startsWith('https://') || !SHOP) {
  throw new Error('Set API_URL (https) and SHOP. Never run this against the live API.');
}
if (API.includes('api.webserbisyo.com') && !API.includes('staging')) {
  throw new Error('This is the live API. Load tests run against staging only.');
}

const readHeaders = { 'x-server-read': __ENV.SERVER_READ_SECRET || '' };
const writeHeaders = {
  'Content-Type': 'application/json',
  'x-smartapp': '1',
  Origin: __ENV.STOREFRONT_ORIGIN || '',
};

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      exec: 'browse',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
    ...(ORDER
      ? {
          order: {
            executor: 'constant-arrival-rate',
            exec: 'order',
            rate: 30,
            timeUnit: '1m',
            duration: '6m',
            preAllocatedVUs: 5,
          },
        }
      : {}),
  },
  // What "fast enough on a mid-range phone on mobile data" means for the API side.
  thresholds: {
    'http_req_failed{scenario:browse}': ['rate<0.01'],
    'http_req_duration{scenario:browse}': ['p(95)<800'],
    'http_req_failed{scenario:order}': ['rate<0.01'],
    'http_req_duration{scenario:order}': ['p(95)<1500'],
  },
};

/** One customer: the shop page, then a pause like a person reading the menu. */
export function browse() {
  const shop = http.get(`${API}/s/${encodeURIComponent(SHOP)}`, { headers: readHeaders });
  check(shop, { 'shop page 200': (r) => r.status === 200 });
  sleep(3 + Math.random() * 4);
}

/** One order, each with its own key so none counts as a repeat. */
export function order() {
  const clientKey = `k6-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  const placed = http.post(
    `${API}/s/${encodeURIComponent(SHOP)}/orders`,
    JSON.stringify({ payload: ORDER, clientKey }),
    { headers: writeHeaders },
  );
  check(placed, { 'order placed': (r) => r.status === 201 || r.status === 200 });
}
