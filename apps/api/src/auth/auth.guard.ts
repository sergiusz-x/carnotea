import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type FastifyRequest } from 'fastify';

import { AUTH } from './auth.constants.js';
import { type Auth } from './auth.js';
import { toWebHeaders } from './fastify-bridge.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const session = await this.auth.api.getSession({
      headers: toWebHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException();
    }

    request.user = { id: session.user.id, email: session.user.email };
    return true;
  }
}
