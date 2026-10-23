import { describe, expect, it } from 'vitest';
import { vocab } from '../src/words.js';

describe('vocab', () => {
  it('calls the catalog Menu for food shops and Products for retail shops', () => {
    expect(vocab('food').catalog).toBe('Menu');
    expect(vocab('food').catalogIcon).toBe('utensils');
    expect(vocab('retail').catalog).toBe('Products');
    expect(vocab('retail').catalogIcon).toBe('package');
  });
});
