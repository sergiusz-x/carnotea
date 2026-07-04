import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Observable, finalize } from 'rxjs';

interface AuditRequest {
  method: string;
  url: string;
  body?: unknown;
  user?: { id?: unknown };
}

interface AuditResponse {
  statusCode?: number;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordConfirm',
  'oldPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'ssn',
  'creditCard',
  'cvv',
  'pin',
]);

function sanitize(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      continue;
    }
    sanitized[key] = sanitize(value);
  }
  return sanitized;
}

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();
    const { method, url } = request;

    // Only log mutating requests
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const start = Date.now();
    const userId = request.user?.id ?? null;

    // Sanitize request body (avoid logging sensitive data)
    const rawBody = request.body ?? {};
    const sanitizedBody = sanitize(rawBody);

    return next.handle().pipe(
      finalize(() => {
        const response = context.switchToHttp().getResponse<AuditResponse>();
        const statusCode = response.statusCode ?? 200; // fallback
        const duration = Date.now() - start;

        const logEntry = {
          timestamp: new Date().toISOString(),
          method,
          url,
          userId,
          body: sanitizedBody,
          statusCode,
          durationMs: duration,
        };

        this.logger.log(JSON.stringify(logEntry));
      }),
    );
  }
}
