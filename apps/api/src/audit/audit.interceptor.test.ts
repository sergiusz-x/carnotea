import { type ExecutionContext, type CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { AuditInterceptor } from './audit.interceptor.js';
import type { AuditService } from './audit.service.js';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let reflector: Reflector;
  let mockLog: Mock;

  beforeEach(() => {
    reflector = new Reflector();
    mockLog = vi.fn().mockResolvedValue(undefined);
    const auditService = { log: mockLog } as unknown as AuditService;
    interceptor = new AuditInterceptor(reflector, auditService);
  });

  const createMockContext = (
    method: string,
    user: unknown,
    params: unknown = {},
    body: unknown = {},
  ): ExecutionContext => {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          user,
          params,
          body,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should ignore routes without @Audited decorator', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext('POST', { id: 'u1' });
    const next: CallHandler = { handle: vi.fn().mockReturnValue(of({ id: 'r1' })) };

    await new Promise((resolve) => interceptor.intercept(context, next).subscribe(resolve));
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('should ignore GET requests', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('test_table');
    const context = createMockContext('GET', { id: 'u1' });
    const next: CallHandler = { handle: vi.fn().mockReturnValue(of({ id: 'r1' })) };

    await new Promise((resolve) => interceptor.intercept(context, next).subscribe(resolve));
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('should not audit if handler throws', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('test_table');
    const context = createMockContext('POST', { id: 'u1' });
    const next: CallHandler = {
      handle: vi.fn().mockReturnValue(throwError(() => new Error('Failed'))),
    };

    try {
      await new Promise((resolve, reject) =>
        interceptor.intercept(context, next).subscribe({ next: resolve, error: reject }),
      );
    } catch {
      // ignored
    }
    expect(mockLog).not.toHaveBeenCalled();
  });

  it('should log INSERT for POST', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('test_table');
    const context = createMockContext('POST', { id: 'u1' });
    const next: CallHandler = { handle: vi.fn().mockReturnValue(of({ id: 'r1', name: 'Test' })) };

    await new Promise((resolve) => interceptor.intercept(context, next).subscribe(resolve));

    expect(mockLog).toHaveBeenCalledWith({
      tableName: 'test_table',
      recordId: 'r1',
      actorId: 'u1',
      operation: 'INSERT',
      oldData: null,
      newData: { id: 'r1', name: 'Test' },
    });
  });

  it('should log UPDATE for PATCH', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('test_table');
    const context = createMockContext('PATCH', { id: 'u1' }, { id: 'r1' }, { name: 'New' });
    const next: CallHandler = { handle: vi.fn().mockReturnValue(of({ id: 'r1', name: 'New' })) };

    await new Promise((resolve) => interceptor.intercept(context, next).subscribe(resolve));

    expect(mockLog).toHaveBeenCalledWith({
      tableName: 'test_table',
      recordId: 'r1',
      actorId: 'u1',
      operation: 'UPDATE',
      oldData: { name: 'New' }, // fallback from request.body
      newData: { id: 'r1', name: 'New' },
    });
  });

  it('should log DELETE for DELETE', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('test_table');
    const context = createMockContext('DELETE', { id: 'u1' }, { id: 'r1' });
    const next: CallHandler = { handle: vi.fn().mockReturnValue(of(undefined)) };

    await new Promise((resolve) => interceptor.intercept(context, next).subscribe(resolve));

    expect(mockLog).toHaveBeenCalledWith({
      tableName: 'test_table',
      recordId: 'r1',
      actorId: 'u1',
      operation: 'DELETE',
      oldData: undefined,
      newData: null,
    });
  });

  it('should redact secrets in payload', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue('test_table');
    const context = createMockContext('POST', { id: 'u1' });
    const next: CallHandler = {
      handle: vi
        .fn()
        .mockReturnValue(of({ id: 'r1', token: 'secret', inner: { password: 'pass' } })),
    };

    await new Promise((resolve) => interceptor.intercept(context, next).subscribe(resolve));

    expect(mockLog).toHaveBeenCalledWith({
      tableName: 'test_table',
      recordId: 'r1',
      actorId: 'u1',
      operation: 'INSERT',
      oldData: null,
      newData: { id: 'r1', inner: {} },
    });
  });
});
