import { describe, expect, it } from 'vitest';
import { isMapsUrl, MapsService, type Fetcher } from '../../src/public/maps.service.js';

const FULL = 'https://www.google.com/maps/place/Kanto/@14.5995,120.9842,17z';

function redirectTo(location: string): Response {
  return new Response(null, { status: 302, headers: { location } });
}

function service(answers: Record<string, Response>, called: string[] = []): MapsService {
  const maps = new MapsService();
  const fetcher: Fetcher = async (url) => {
    called.push(url);
    const answer = answers[url];
    if (!answer) throw new Error('offline');
    return answer;
  };
  maps.useFetcher(fetcher);
  return maps;
}

describe('resolveMapsLink (R18)', () => {
  it('reads a full link without calling anyone', async () => {
    const called: string[] = [];
    await expect(service({}, called).resolve(FULL)).resolves.toEqual({
      lat: 14.5995,
      lng: 120.9842,
    });
    expect(called).toEqual([]);
  });

  it('follows a short link to its pin', async () => {
    const short = 'https://maps.app.goo.gl/AbCdEf123';
    await expect(service({ [short]: redirectTo(FULL) }).resolve(short)).resolves.toEqual({
      lat: 14.5995,
      lng: 120.9842,
    });
  });

  it('never calls an address outside Google Maps', async () => {
    const short = 'https://maps.app.goo.gl/evil';
    const called: string[] = [];
    const maps = service(
      { [short]: redirectTo('http://169.254.169.254/latest/meta-data') },
      called,
    );
    await expect(maps.resolve(short)).rejects.toMatchObject({ code: 'invalid_input' });
    expect(called).toEqual([short]);
    await expect(maps.resolve('https://example.com/maps')).rejects.toMatchObject({
      code: 'invalid_input',
    });
  });

  it('stops after 3 redirects', async () => {
    const a = 'https://maps.app.goo.gl/a';
    const b = 'https://maps.app.goo.gl/b';
    const called: string[] = [];
    const maps = service({ [a]: redirectTo(b), [b]: redirectTo(a) }, called);
    await expect(maps.resolve(a)).rejects.toMatchObject({ code: 'invalid_input' });
    expect(called).toHaveLength(3);
  });

  it('takes https Google hosts only', () => {
    expect(isMapsUrl(new URL('https://maps.app.goo.gl/x'))).toBe(true);
    expect(isMapsUrl(new URL('https://www.google.com.ph/maps'))).toBe(true);
    expect(isMapsUrl(new URL('http://maps.app.goo.gl/x'))).toBe(false);
    expect(isMapsUrl(new URL('https://google.com.evil.io/maps'))).toBe(false);
    expect(isMapsUrl(new URL('https://user@www.google.com/maps'))).toBe(false);
    expect(isMapsUrl(new URL('https://www.google.com:8443/maps'))).toBe(false);
  });
});
