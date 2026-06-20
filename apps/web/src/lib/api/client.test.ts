import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, apiClient } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('apiClient', () => {
  it('infers and returns the health response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    );

    const { data } = await apiClient.GET('/healthz');

    expect(data).toEqual({ status: 'ok' });
  });

  it('normalizes the API error envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          issues: [{ code: 'invalid_type', path: ['name'], message: 'Required' }],
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 },
      ),
    );

    const request = apiClient.GET('/healthz');

    await expect(request).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        issues: [{ code: 'invalid_type', path: ['name'], message: 'Required' }],
      }),
    );
  });

  it('normalizes a malformed error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('upstream failure', { status: 502, statusText: 'Bad Gateway' }),
    );

    const request = apiClient.GET('/healthz');

    await expect(request).rejects.toEqual(
      new ApiError({ code: 'HTTP_502', message: 'Bad Gateway' }),
    );
  });
});
