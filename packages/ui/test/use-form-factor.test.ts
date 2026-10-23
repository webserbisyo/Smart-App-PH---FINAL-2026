// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFormFactor } from '../src/hooks/use-form-factor';

describe('useFormFactor', () => {
  const originalInnerWidth = window.innerWidth;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    // Reset matchMedia so it falls back to innerWidth or handles queries
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width: 767px')
          ? window.innerWidth < 768
          : query.includes('min-width: 768px') && query.includes('max-width: 1023px')
            ? window.innerWidth >= 768 && window.innerWidth < 1024
            : window.innerWidth >= 1024,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('identifies phone breakpoint (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 390 });
    const { result } = renderHook(() => useFormFactor());
    expect(result.current).toBe('phone');
  });

  it('identifies tablet breakpoint (768px - 1023px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 820 });
    const { result } = renderHook(() => useFormFactor());
    expect(result.current).toBe('tablet');
  });

  it('identifies desktop breakpoint (>= 1024px)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1280 });
    const { result } = renderHook(() => useFormFactor());
    expect(result.current).toBe('desktop');
  });
});
