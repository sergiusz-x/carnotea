import { type Db } from '@carnotea/db';
import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import { type Env } from '../config/env.js';
import { DB } from '../db/db.constants.js';
import { createEmailService } from '../emails/email.service.js';
import { createEmailTransport } from '../emails/email.transport.js';

import { AUTH } from './auth.constants.js';
import { AuthGuard } from './auth.guard.js';
import { createAuth, type Auth } from './auth.js';
import { toWebHeaders } from './fastify-bridge.js';

function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DB, ConfigService],
      useFactory: (db: Db, config: ConfigService<Env, true>): Auth => {
        const isDev = config.get('NODE_ENV', { infer: true }) !== 'production';
        const transport = createEmailTransport({
          smtpHost: config.get('SMTP_HOST', { infer: true }),
          smtpPort: config.get('SMTP_PORT', { infer: true }),
          smtpUser: config.get('SMTP_USER', { infer: true }),
          smtpPass: config.get('SMTP_PASS', { infer: true }),
          emailFrom: config.get('EMAIL_FROM', { infer: true }),
          emailReplyTo: config.get('EMAIL_REPLY_TO', { infer: true }),
          isDev,
        });
        const emailService = createEmailService({ transport });

        return createAuth(db, {
          secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
          baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
          trustedOrigins: parseOrigins(config.get('CORS_ORIGINS', { infer: true })),
          emailService,
        });
      },
    },
    AuthGuard,
  ],
  exports: [AUTH, AuthGuard],
})
export class AuthModule implements OnModuleInit {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    @Inject(AUTH) private readonly auth: Auth,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    const fastify = this.adapterHost.httpAdapter.getInstance<FastifyInstance>();
    const auth = this.auth;
    const baseURL = this.config.get('BETTER_AUTH_URL', { infer: true });

    fastify.register((instance, _opts, done) => {
      instance.removeContentTypeParser('application/json');
      instance.addContentTypeParser(
        'application/json',
        { parseAs: 'string' },
        (_req, body, parserDone) => {
          parserDone(null, body);
        },
      );

      instance.all('/api/auth/*', async (request: FastifyRequest, reply: FastifyReply) => {
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const webRequest = new Request(`${baseURL}${request.url}`, {
          method: request.method,
          headers: toWebHeaders(request.headers),
          body: hasBody ? (request.body as string | undefined) : undefined,
        });

        const response = await auth.handler(webRequest);

        reply.status(response.status);
        reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');
        const setCookies = response.headers.getSetCookie();
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'set-cookie' && key.toLowerCase() !== 'cache-control') {
            reply.header(key, value);
          }
        });
        if (setCookies.length > 0) {
          reply.header('set-cookie', setCookies);
        }

        await reply.send(response.body ? await response.text() : null);
      });

      done();
    });
  }
}
