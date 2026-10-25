import { describe, expect, it } from 'vitest';
import { calculateTargetDimensions, compressImage } from '../src/compress-image';

describe('calculateTargetDimensions (decision D7)', () => {
  it('scales down landscape image so longest side is 1600 px while preserving aspect ratio', () => {
    const result = calculateTargetDimensions(3200, 2400, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1200);
    expect(result.width / result.height).toBeCloseTo(3200 / 2400, 2);
  });

  it('scales down portrait image so longest side is 1600 px while preserving aspect ratio', () => {
    const result = calculateTargetDimensions(2400, 3200, 1600);
    expect(result.width).toBe(1200);
    expect(result.height).toBe(1600);
    expect(result.width / result.height).toBeCloseTo(2400 / 3200, 2);
  });

  it('leaves images smaller than maxSide untouched', () => {
    const result = calculateTargetDimensions(800, 600, 1600);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('scales down square images exactly to maxSide', () => {
    const result = calculateTargetDimensions(2500, 2500, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(1600);
  });

  it('handles minimum dimension boundaries without crashing or division by zero', () => {
    const result = calculateTargetDimensions(0, 0, 1600);
    expect(result.width).toBeGreaterThanOrEqual(1);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });
});

describe('compressImage in non-browser environment', () => {
  it('resolves blob safely when canvas DOM is unavailable', async () => {
    const blob = new Blob(['test image data'], { type: 'image/png' });
    const compressed = await compressImage(blob);
    expect(compressed).toBeDefined();
    expect(compressed.size).toBe(blob.size);
  });
});
