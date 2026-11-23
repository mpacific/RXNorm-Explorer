import { describe, expect, it } from 'vitest';
import { securityHeaders } from './securityHeaders';

const header = (headers: { key: string; value: string }[], key: string) =>
  headers.find((h) => h.key === key)?.value;

const directives = (csp: string | undefined) =>
  Object.fromEntries(
    (csp ?? '').split('; ').map((d) => {
      const [name, ...values] = d.split(' ');
      return [name, values];
    })
  );

describe('securityHeaders', () => {
  const production = securityHeaders({
    apiUrl: 'https://api.example.org/v1/',
    isDev: false,
  });

  it('lets the page call this origin and the API origin only', () => {
    const csp = directives(header(production, 'Content-Security-Policy'));

    expect(csp['connect-src']).toEqual(["'self'", 'https://api.example.org']);
    expect(csp['default-src']).toEqual(["'self'"]);
  });

  it('cannot be framed, and leaves out eval and plugins in production', () => {
    const csp = directives(header(production, 'Content-Security-Policy'));

    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['script-src']).not.toContain("'unsafe-eval'");
    expect(header(production, 'X-Frame-Options')).toBe('DENY');
  });

  it('allows eval and hot reload in development', () => {
    const csp = directives(
      header(
        securityHeaders({ apiUrl: 'http://localhost:6109', isDev: true }),
        'Content-Security-Policy'
      )
    );

    expect(csp['script-src']).toContain("'unsafe-eval'");
    expect(csp['connect-src']).toEqual([
      "'self'",
      'http://localhost:6109',
      'ws:',
    ]);
  });

  it('sets nosniff and a strict referrer policy', () => {
    expect(header(production, 'X-Content-Type-Options')).toBe('nosniff');
    expect(header(production, 'Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    );
  });

  it('still works without an API URL', () => {
    const csp = directives(
      header(
        securityHeaders({ apiUrl: undefined, isDev: false }),
        'Content-Security-Policy'
      )
    );
    expect(csp['connect-src']).toEqual(["'self'"]);
  });
});
