import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';

import { type AuthUser } from './auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without AuthGuard');
    }
    return request.user;
  },
);
