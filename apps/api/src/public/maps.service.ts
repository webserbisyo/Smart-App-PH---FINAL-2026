import { Injectable } from '@nestjs/common';
import { parseMapsLink, words, type LatLng } from '@smartapp/core';
import { ApiFailure } from '../common/api-failure.js';

const MAX_HOPS = 3;
const TIMEOUT_MS = 3_000;

// Only Google Maps addresses are ever called (R18: a pasted link must never make the server call inside
// addresses). Short links and the pages they open.
const SHORT_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl']);
const MAPS_HOST = /^(www\.|maps\.)?google\.(com|com\.ph)$/;

/** The link did not lead to a pin: the customer pastes the full link instead. */
function notMaps(): ApiFailure {
  return new ApiFailure('invalid_input', 422, { url: [words.shop.mapsShortLink] });
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** True for an https Google Maps address we may call. */
export function isMapsUrl(url: URL): boolean {
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (SHORT_HOSTS.has(host)) return true;
  return MAPS_HOST.test(host);
}

/**
 * Follows a customer's Google Maps link to its pin (api.md `resolveMapsLink`, R18): full links are read
 * straight away; short links (maps.app.goo.gl) are followed for at most 3 redirects, only to Google Maps
 * hosts over https, 3 seconds in all, and only the coordinates come back.
 */
@Injectable()
export class MapsService {
  private fetcher: Fetcher = (url, init) => fetch(url, init);

  /** Tests swap the network for their own answers. */
  useFetcher(fetcher: Fetcher): void {
    this.fetcher = fetcher;
  }

  async resolve(link: string): Promise<LatLng> {
    const direct = parseMapsLink(link);
    if (direct) return direct;
    let url: URL;
    try {
      url = new URL(link.trim());
    } catch {
      throw notMaps();
    }
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      if (!isMapsUrl(url)) break;
      const found = parseMapsLink(url.href);
      if (found) return found;
      if (hop === MAX_HOPS) break;
      let res: Response;
      try {
        res = await this.fetcher(url.href, { method: 'GET', redirect: 'manual', signal });
      } catch {
        throw notMaps();
      }
      const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
      await res.body?.cancel().catch(() => undefined);
      if (!next) break;
      try {
        url = new URL(next, url);
      } catch {
        break;
      }
    }
    throw notMaps();
  }
}
