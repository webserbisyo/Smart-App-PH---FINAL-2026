import { describe, expect, it } from 'vitest';
import { phoneSearchText } from '../src/rules/phone.js';

const SAVED = '+639171234567';

describe('phoneSearchText', () => {
  it.each([
    '09171234567',
    '0917 123 4567',
    '0917-123-4567',
    '+63 917 123 4567',
    '639171234567',
    '9171234567',
    '(0917) 123.4567',
    '4567',
  ])('%s finds the saved number', (typed) => {
    const text = phoneSearchText(typed);
    expect(text).not.toBeNull();
    expect(SAVED.includes(text ?? '')).toBe(true);
  });

  it('ignores names, short numbers and order numbers', () => {
    expect(phoneSearchText('Ana')).toBeNull();
    expect(phoneSearchText('#012')).toBeNull();
    expect(phoneSearchText('012')).toBeNull();
    expect(phoneSearchText('0')).toBeNull();
    expect(phoneSearchText('')).toBeNull();
  });
});
