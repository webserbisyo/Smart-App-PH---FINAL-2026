// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CategoryIcon } from '../src/compositions/category-icon';

describe('CategoryIcon', () => {
  afterEach(cleanup);

  it('draws emoji as text without an img tag', () => {
    const { container } = render(<CategoryIcon icon={{ kind: 'emoji', char: '🍔' }} />);
    expect(screen.getByText('🍔')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('draws a Fluent key as /icons/fluent/flat/<key>.svg', () => {
    const { container } = render(<CategoryIcon icon="burger" />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('/icons/fluent/flat/burger.svg');

    cleanup();
    const { container: c2 } = render(
      <CategoryIcon icon={{ kind: 'fluent', key: 'coffee', style: 'flat' }} />,
    );
    expect(c2.querySelector('img')?.getAttribute('src')).toBe('/icons/fluent/flat/coffee.svg');
  });

  it('draws an image ref through imageSources and never the raw ref', () => {
    // Valid demo image ref
    const { container } = render(
      <CategoryIcon icon={{ kind: 'image', ref: 'demo:kanto-smash/items/classic-smash' }} />,
    );
    const picture = container.querySelector('picture');
    expect(picture).toBeTruthy();
    const sources = container.querySelectorAll('source');
    expect(sources.length).toBe(2);
    expect(sources[0]?.getAttribute('srcSet')).toContain(
      '/demo/kanto-smash/items/classic-smash-320.avif',
    );
    expect(sources[1]?.getAttribute('srcSet')).toContain(
      '/demo/kanto-smash/items/classic-smash-320.webp',
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toContain('/demo/kanto-smash/items/classic-smash');
    expect(img?.getAttribute('src')).not.toBe('demo:kanto-smash/items/classic-smash');
  });

  it('draws Fluent flat other icon when image ref is invalid or fails to load', () => {
    // Unresolvable raw ref falls back to other.svg immediately (never uses raw ref as src)
    const { container } = render(
      <CategoryIcon icon={{ kind: 'image', ref: 'uploads/category/test-123.webp' }} />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/icons/fluent/flat/other.svg');
    expect(img?.getAttribute('src')).not.toBe('uploads/category/test-123.webp');

    // Image load error triggers fallback to other.svg
    cleanup();
    const { container: c2 } = render(
      <CategoryIcon icon={{ kind: 'image', ref: 'blob:http://localhost/test' }} />,
    );
    const blobImg = c2.querySelector('img');
    expect(blobImg?.getAttribute('src')).toBe('blob:http://localhost/test');
    if (blobImg) {
      fireEvent.error(blobImg);
    }
    expect(c2.querySelector('img')?.getAttribute('src')).toBe('/icons/fluent/flat/other.svg');
  });
});
