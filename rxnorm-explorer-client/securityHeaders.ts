// Security headers for every page, set from next.config.ts.
//
// The CSP is the "without nonces" form from Next's CSP guide: nonces would
// force every page to render dynamically, and this app renders no
// user-supplied HTML (React escapes everything from the API). Scripts and
// styles are limited to this origin plus inline ones, which Next's hydration
// and Emotion's styles need; network requests only to this origin and the API.
export function securityHeaders(options: {
  apiUrl: string | undefined;
  isDev: boolean;
}): { key: string; value: string }[] {
  const apiOrigin = options.apiUrl ? new URL(options.apiUrl).origin : '';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${options.isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // ws: is Next's hot reload in development
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}${options.isDev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // For browsers that predate CSP's frame-ancestors
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}
