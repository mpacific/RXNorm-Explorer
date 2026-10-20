import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import RootLayout, { metadata } from './layout';

// The MUI cache provider hooks into Next's server rendering
vi.mock('next/navigation', () => ({ useServerInsertedHTML: vi.fn() }));

// The layout renders the <html> element itself, so it's rendered to markup
// rather than mounted inside the test document.
const renderLayout = () =>
  new DOMParser().parseFromString(
    renderToStaticMarkup(
      <RootLayout>
        <p>page content</p>
      </RootLayout>
    ),
    'text/html'
  );

describe('RootLayout', () => {
  it('is an English document', () => {
    expect(renderLayout().documentElement.lang).toBe('en');
  });

  it('has a header that links home', () => {
    const header = renderLayout().querySelector('header');

    expect(header?.textContent).toBe('RXNorm Explorer');
    expect(header?.querySelector('a')?.getAttribute('href')).toBe('/');
  });

  it('puts the page inside the content area', () => {
    const content = renderLayout().querySelector('body > .content-root');

    expect(content?.innerHTML).toBe('<p>page content</p>');
  });

  it('describes the site', () => {
    expect(metadata).toEqual({
      title: 'RXNorm Explorer',
      description:
        'RXNorm Explorer allows you to look up prescribable drugs and view the relationships between them',
    });
  });
});
