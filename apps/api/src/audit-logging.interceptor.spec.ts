import { Test, TestingModule } from '@nestjs/testing';
import { AuditLoggingInterceptor } from './audit-logging.interceptor';
import { Logger } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/core';
import { of } from 'rxjs';

describe('AuditLoggingInterceptor', () => {
  let interceptor: AuditLoggingInterceptor;
  let logger: Partial<Logger>;

  beforeEach(async () => {
    logger = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLoggingInterceptor,
        { provide: Logger, useValue: logger },
      ],
    }).compile();

    interceptor = module.get<AuditLoggingInterceptor>(AuditLoggingInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should log for mutating methods', (done) => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/test',
          body: { foo: 'bar' },
          user: { id: 1 },
        }),
        getResponse: () => ({
          statusCode: 201,
        }),
      }),
      getHandler: () => ({
        name: 'testHandler',
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({}),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(logger.log).toHaveBeenCalled();
        const logArg = logger.log.mock.calls[0][0];
        const parsed = JSON.parse(logArg);
        expect(parsed.method).toBe('POST');
        expect(parsed.url).toBe('/test');
        expect(parsed.userId).toBe(1);
        expect(parsed.body).toEqual({ foo: 'bar' });
        expect(parsed.statusCode).toBe(201);
        expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
        done();
      },
      error: done.fail,
    });
  });

  it('should not log for non-mutating methods', (done) => {
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          url: '/test',
          body: {},
          user: { id: 1 },
        }),
        getResponse: () => ({
          statusCode: 200,
        }),
      }),
      getHandler: () => ({
        name: 'testHandler',
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: () => of({}),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (val) => {
        expect(logger.log).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });
});