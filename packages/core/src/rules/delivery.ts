// Delivery fee by straight-line distance from the shop pin, plus named zones (S27, S28, N25).
// No map, no Maps API, no geocoding. The server always recomputes.
import type { LatLng } from '../schemas/common.js';
import type { DeliverySettings } from '../schemas/storefront.js';

const EARTH_RADIUS_M = 6_371_000;

/** Haversine distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** Rounded to 0.1 km, as shown to the customer. */
export function roundKm(metres: number): number {
  return Math.round(metres / 100) / 10;
}

export interface DeliveryTarget {
  spot: LatLng | null;
  zoneId: string | null;
}

export type DeliveryFeeResult =
  | { ok: true; fee: number; distanceM: number | null; etaText: string; via: 'distance' | 'zone' }
  | { ok: false; code: 'zone_required' }
  | { ok: false; code: 'out_of_range'; km: number | null; maxKm: number }
  | { ok: false; code: 'below_min_order'; minOrder: number };

type DeliveryInput = { delivery: DeliverySettings; info: { contact: { pin: LatLng | null } } };

export function maxDistanceKm(delivery: DeliverySettings): number {
  return delivery.distance.reduce((max, row) => Math.max(max, row.toKm), 0);
}

/**
 * A spot inside the distance rows pays that row's fee. Beyond the rows (or no spot), a named zone pays its flat fee;
 * with zones but none picked the customer must pick one. Nothing fits: out of range with the max km.
 * Free delivery from a subtotal makes the fee 0.
 */
export function deliveryFee(
  sf: DeliveryInput,
  target: DeliveryTarget,
  subtotal: number,
): DeliveryFeeResult {
  const { delivery } = sf;
  const pin = sf.info.contact.pin;
  const free = (fee: number) =>
    delivery.freeDeliveryFrom !== null && subtotal >= delivery.freeDeliveryFrom ? 0 : fee;

  let metres: number | null = null;
  if (target.spot && pin) {
    metres = distanceM(pin, target.spot);
    const km = roundKm(metres);
    const row =
      delivery.distance.find((r) => km >= r.fromKm && km < r.toKm) ??
      delivery.distance.find((r) => km === r.toKm);
    if (row) {
      if (subtotal < row.minOrder)
        return { ok: false, code: 'below_min_order', minOrder: row.minOrder };
      return {
        ok: true,
        fee: free(row.fee),
        distanceM: metres,
        etaText: row.etaText,
        via: 'distance',
      };
    }
  }

  if (target.zoneId) {
    const zone = delivery.zones.find((z) => z.id === target.zoneId);
    if (zone)
      return {
        ok: true,
        fee: free(zone.fee),
        distanceM: metres,
        etaText: zone.etaText,
        via: 'zone',
      };
  }

  if (delivery.zones.length > 0) return { ok: false, code: 'zone_required' };
  return {
    ok: false,
    code: 'out_of_range',
    km: metres === null ? null : roundKm(metres),
    maxKm: maxDistanceKm(delivery),
  };
}

function validLatLng(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

const NUM = '(-?\\d{1,3}(?:\\.\\d+)?)';

/**
 * Reads a full Google Maps link: "/@lat,lng,17z", "?q=lat,lng" (also query= and ll=) or "!3dlat!4dlng".
 * Short links (maps.app.goo.gl, goo.gl/maps) return null: the server follows them (resolveMapsLink).
 */
export function parseMapsLink(url: string): LatLng | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return null;
  if (!/(^|\.)google\.[a-z.]+$/.test(host) && !host.startsWith('maps.google.')) return null;

  const text = decodeURIComponent(parsed.href);
  const bang = new RegExp(`!3d${NUM}!4d${NUM}`).exec(text);
  if (bang?.[1] && bang[2]) return validLatLng(Number(bang[1]), Number(bang[2]));

  for (const key of ['q', 'query', 'll', 'destination']) {
    const value = parsed.searchParams.get(key);
    const m = value ? new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`).exec(value) : null;
    if (m?.[1] && m[2]) return validLatLng(Number(m[1]), Number(m[2]));
  }

  const at = new RegExp(`@${NUM},${NUM}`).exec(parsed.pathname);
  if (at?.[1] && at[2]) return validLatLng(Number(at[1]), Number(at[2]));
  return null;
}

/** A link that only the server can read (a short link). */
export function isShortMapsLink(url: string): boolean {
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    return host === 'maps.app.goo.gl' || (host === 'goo.gl' && url.includes('/maps'));
  } catch {
    return false;
  }
}

/** Opens Google Maps at a spot, so the customer can fix the pin and share the link back. */
export function mapsLinkFor(spot: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
}
