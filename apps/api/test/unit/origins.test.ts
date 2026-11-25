import { describe, expect, it } from 'vitest';
import { originAllowed } from '../../src/env.js';
import { isServerRead } from '../../src/auth/server-read.js';

const exact = new Set(['https://app.webserbisyo.com']);

describe('originAllowed (X8)', () => {
  it('takes the exact list and one shop label under the shop domain', () => {
    expect(originAllowed('https://app.webserbisyo.com', exact, undefined)).toBe(true);
    expect(originAllowed('https://kanto-smash.webserbisyo.com', exact, undefined)).toBe(false);
    expect(originAllowed('https://kanto-smash.webserbisyo.com', exact, 'webserbisyo.com')).toBe(
      true,
    );
  });

  it('refuses http, nested labels, look-alike domains and odd labels', () => {
    const domain = 'webserbisyo.com';
    expect(originAllowed('http://kanto.webserbisyo.com', exact, domain)).toBe(false);
    expect(originAllowed('https://a.b.webserbisyo.com', exact, domain)).toBe(false);
    expect(originAllowed('https://kanto.evilwebserbisyo.com', exact, domain)).toBe(false);
    expect(originAllowed('https://kanto.webserbisyo.com.evil.com', exact, domain)).toBe(false);
    expect(originAllowed('https://.webserbisyo.com', exact, domain)).toBe(false);
    expect(originAllowed('https://-kanto.webserbisyo.com', exact, domain)).toBe(false);
    expect(originAllowed('https://kanto.webserbisyo.com:8443', exact, domain)).toBe(false);
  });
});

describe('isServerRead', () => {
  const secret = 'x'.repeat(40);
  it('matches only the exact secret, and never without one', () => {
    expect(isServerRead(secret, secret)).toBe(true);
    expect(isServerRead(`${secret}y`, secret)).toBe(false);
    expect(isServerRead(undefined, secret)).toBe(false);
    expect(isServerRead(['a'], secret)).toBe(false);
    expect(isServerRead('', undefined)).toBe(false);
  });
});
