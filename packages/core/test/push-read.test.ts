import { describe, expect, it } from 'vitest';
import { pushPath, readPushMessage } from '../src/rules/push-read.js';

const fallback = { title: 'New update', body: 'Open the app for details.' };

describe('readPushMessage (X9)', () => {
  it('reads the declarative shape and keeps only the path', () => {
    const shown = readPushMessage(
      {
        web_push: 8030,
        notification: {
          title: 'Kanto Smash',
          body: 'Order #012 is ready.',
          navigate: 'https://kanto-smash.webserbisyo.com/kanto-smash/o/abc?x=1',
          tag: 'order-1',
        },
      },
      fallback,
    );
    expect(shown).toEqual({
      title: 'Kanto Smash',
      body: 'Order #012 is ready.',
      path: '/kanto-smash/o/abc?x=1',
      tag: 'order-1',
    });
  });

  it('reads the older flat shape', () => {
    expect(readPushMessage({ title: 'A', body: 'B', url: '/s/o/1' }, fallback).path).toBe('/s/o/1');
  });

  it('always shows something, even for a broken push', () => {
    expect(readPushMessage(null, fallback)).toEqual({ ...fallback, path: '/', tag: undefined });
    expect(readPushMessage({ notification: { title: '' } }, fallback).title).toBe('New update');
  });

  it('never opens another site', () => {
    expect(pushPath('//evil.example.com/x')).toBeNull();
    expect(pushPath('javascript:alert(1)')).toBeNull();
    expect(pushPath('https://evil.example.com/x')).toBe('/x');
  });
});
