import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { AuditService } from './audit.service.js';
import { AUDITED_KEY } from './audited.decorator.js';

function redactSecrets(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(redactSecrets);
  }

  const redacted = { ...(data as Record<string, unknown>) };
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password')
    ) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete redacted[key];
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSecrets(redacted[key]);
    }
  }
  return redacted;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const tableName = this.reflector.getAllAndOverride<string | undefined>(AUDITED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!tableName) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<FastifyRequest>();
    const method = request.method.toUpperCase();

    let operation: 'INSERT' | 'UPDATE' | 'DELETE' | null = null;
    if (method === 'POST') operation = 'INSERT';
    else if (method === 'PATCH' || method === 'PUT') operation = 'UPDATE';
    else if (method === 'DELETE') operation = 'DELETE';

    if (!operation) {
      return next.handle();
    }

    const actorId = request.user?.id;
    if (!actorId) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (responseBody: unknown) => {
          try {
            const resObj =
              typeof responseBody === 'object' && responseBody !== null
                ? (responseBody as Record<string, unknown>)
                : null;

            const recordId =
              (resObj?.id as string) || (request.params as Record<string, string>).id;

            if (!recordId) {
              return;
            }

            let oldData: unknown = null;
            let newData: unknown = null;

            if (operation === 'INSERT') {
              newData = redactSecrets(responseBody);
            } else if (operation === 'UPDATE') {
              oldData = redactSecrets(resObj?.oldData ?? request.body);
              newData = redactSecrets(resObj?.newData ?? responseBody);
            } else {
              oldData = redactSecrets(responseBody);
            }

            this.auditService
              .log({
                tableName,
                recordId,
                actorId,
                operation,
                oldData: oldData as Record<string, unknown>,
                newData: newData as Record<string, unknown>,
              })
              .catch(() => {});
          } catch (_err) {
            // ignore sync errors in tap so request succeeds
          }
        },
      }),
    );
  }
}
