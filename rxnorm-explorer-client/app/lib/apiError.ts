// Turns a failed API response into an Error worth showing. statusText is
// empty over HTTP/2, and hides the API's own explanation, which Nest sends as
// { message } -- a string, or a list of them for validation failures.
export async function apiError(
  prefix: string,
  response: Response
): Promise<Error> {
  let message = '';
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object' && 'message' in body) {
      const { message: raw } = body;
      message = Array.isArray(raw) ? raw.join('; ') : String(raw);
    }
  } catch {
    // Not JSON (a proxy's error page, say); fall back to the status text
  }

  const detail = message || response.statusText;
  return new Error(
    `${prefix}: ${response.status}${detail ? ` ${detail}` : ''}`
  );
}
