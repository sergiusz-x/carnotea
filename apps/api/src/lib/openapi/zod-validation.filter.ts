import { type ArgumentsHost, Catch, type ExceptionFilter } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { ZodValidationException } from './zod-validation.exception.js';

@Catch(ZodValidationException)
export class ZodValidationFilter implements ExceptionFilter {
  catch(exception: ZodValidationException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();

    void reply.status(400).send({
      code: 'VALIDATION_ERROR',
      message: exception.zodError.message,
      issues: exception.zodError.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        message: issue.message,
      })),
    });
  }
}
