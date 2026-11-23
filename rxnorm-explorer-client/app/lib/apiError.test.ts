import { describe, expect, it } from 'vitest';
import { apiError } from './apiError';

const json = (body: unknown, init: ResponseInit) =>
  new Response(JSON.stringify(body), init);

describe('apiError', () => {
  it("shows the status and the API's own message", async () => {
    const error = await apiError(
      'Search results error',
      json(
        { statusCode: 400, message: 'Search term is required' },
        {
          status: 400,
        }
      )
    );

    expect(error.message).toBe(
      'Search results error: 400 Search term is required'
    );
  });

  it('joins a list of validation messages', async () => {
    const error = await apiError(
      'Search results error',
      json(
        { message: ['sortField must be one of …', 'cursorId must be …'] },
        {
          status: 400,
        }
      )
    );

    expect(error.message).toBe(
      'Search results error: 400 sortField must be one of …; cursorId must be …'
    );
  });

  it('falls back to the status text when the body has no message', async () => {
    const error = await apiError(
      'Load drug error',
      new Response('<html>Bad gateway</html>', {
        status: 502,
        statusText: 'Bad Gateway',
      })
    );

    expect(error.message).toBe('Load drug error: 502 Bad Gateway');
  });

  it('still shows the status when there is no text at all (HTTP/2)', async () => {
    const error = await apiError(
      'Load drug error',
      new Response('', { status: 500 })
    );

    expect(error.message).toBe('Load drug error: 500');
  });
});
