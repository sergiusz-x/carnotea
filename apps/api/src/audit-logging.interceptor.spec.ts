import { type CallHandler, type ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuditLoggingInterceptor } from './audit-logging.interceptor.js';

function createHttpContext(input: {
  method: string;
  url: string;
  body?: unknown;
  user?: { id: string | number };
  statusCode?: number;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method: input.method,
        url: input.url,
        body: input.body ?? {},
        user: input.user,
      }),
      getResponse: () => ({
        statusCode: input.statusCode ?? 200,
      }),
      getNext: () => undefined,
    }),
    getClass: () => AuditLoggingInterceptor,
    getHandler: () => createHttpContext,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

const callHandler: CallHandler = {
  handle: () => of({ ok: true }),
};

describe('AuditLoggingInterceptor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs sanitized mutating requests', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const interceptor = new AuditLoggingInterceptor();

    await lastValueFrom(
      interceptor.intercept(
        createHttpContext({
          method: 'POST',
          url: '/test',
          body: { foo: 'bar', password: 'secret' },
          user: { id: 'user-1' },
          statusCode: 201,
        }),
        callHandler,
      ),
    );

    expect(logSpy).toHaveBeenCalledOnce();
    const [payload] = logSpy.mock.calls[0] ?? [];
    const parsed = JSON.parse(String(payload)) as {
      method: string;
      url: string;
      userId: string;
      body: Record<string, unknown>;
      statusCode: number;
      durationMs: number;
    };

    expect(parsed).toMatchObject({
      method: 'POST',
      url: '/test',
      userId: 'user-1',
      body: { foo: 'bar' },
      statusCode: 201,
    });
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('skips non-mutating requests', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const interceptor = new AuditLoggingInterceptor();

    await lastValueFrom(
      interceptor.intercept(
        createHttpContext({
          method: 'GET',
          url: '/test',
          user: { id: 'user-1' },
        }),
        callHandler,
      ),
    );

    expect(logSpy).not.toHaveBeenCalled();
  });
});
