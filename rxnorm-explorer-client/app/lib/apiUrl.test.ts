import { afterEach, describe, expect, it } from 'vitest';
import { apiUrl } from './apiUrl';

describe('apiUrl', () => {
  const original = process.env.NEXT_PUBLIC_API_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = original;
  });

  it.each(['http://api.test', 'http://api.test/', 'http://api.test//'])(
    'joins %p and a path with exactly one slash',
    (base) => {
      process.env.NEXT_PUBLIC_API_URL = base;
      expect(apiUrl('drug/1')).toBe('http://api.test/drug/1');
      expect(apiUrl('/drug/1')).toBe('http://api.test/drug/1');
    }
  );

  it('keeps a path prefix on the base', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://example.org/api/';
    expect(apiUrl('search')).toBe('https://example.org/api/search');
  });

  it('adds query parameters when there are any', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
    expect(apiUrl('search', new URLSearchParams({ searchTerm: 'a b' }))).toBe(
      'http://api.test/search?searchTerm=a+b'
    );
    expect(apiUrl('search', new URLSearchParams())).toBe(
      'http://api.test/search'
    );
  });
});
