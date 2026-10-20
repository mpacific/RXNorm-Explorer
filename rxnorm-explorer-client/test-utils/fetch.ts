import { vi } from 'vitest';

// A fetch response the test settles when it chooses, for checking what
// happens when responses arrive late or out of order.
export function deferredResponse() {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    respond: (body: unknown) => resolve(jsonResponse(body)),
    fail: (error: Error) => reject(error),
  };
}

export const jsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

export const stubFetch = () => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal('fetch', fetch);
  return fetch;
};

// The URL a fetch call was made with, parsed
export const requestedUrl = (
  fetch: ReturnType<typeof stubFetch>,
  call = 0
): URL => new URL(String(fetch.mock.calls[call][0]));
