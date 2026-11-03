import { describe, expect, it } from 'vitest';
import { normalizeFindCode, ordersWords, parseFindInput } from '@smartapp/core';

describe('O5 Find order: reading what the owner typed or scanned', () => {
  it('ignores spaces, a leading # and lower case', () => {
    expect(normalizeFindCode(' k7 qp ')).toBe('K7QP');
    expect(normalizeFindCode('#012')).toBe('012');
  });

  it('reads a pickup code', () => {
    expect(parseFindInput('k7qp')).toEqual({ kind: 'typed', orderNo: null, code: 'K7QP' });
  });

  it('reads an order number with or without # and zeros', () => {
    expect(parseFindInput('#012')).toEqual({ kind: 'typed', orderNo: 12, code: null });
    expect(parseFindInput('7')).toEqual({ kind: 'typed', orderNo: 7, code: null });
  });

  it('keeps both readings when four digits could be either', () => {
    expect(parseFindInput('2345')).toEqual({ kind: 'typed', orderNo: 2345, code: '2345' });
  });

  it('reads the shop and token from a scanned receipt link', () => {
    expect(parseFindInput('https://shop.webserbisyo.com/kanto-smash/o/tok_abc12345')).toEqual({
      kind: 'receipt',
      slug: 'kanto-smash',
      token: 'tok_abc12345',
    });
  });

  it('turns anything else away', () => {
    expect(parseFindInput('')).toBeNull();
    expect(parseFindInput('0')).toBeNull();
    expect(parseFindInput('hello world')).toBeNull();
    expect(parseFindInput('K0QP')).toBeNull(); // 0 is never in a pickup code
  });

  it('words the no-match and other-shop cases', () => {
    expect(ordersWords.find.none).toBe(
      'No order with that code today. Check the code on the customer’s receipt.',
    );
    expect(ordersWords.find.notFound).toMatch(/^Not found/);
  });
});
