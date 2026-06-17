import { type Db } from '@carnotea/db';
import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import { type Env } from '../config/env.js';
import { DB } from '../db/db.constants.js';

import { AUTH } from './auth.constants.js';
import { AuthGuard } from './auth.guard.js';
import { createAuth, type Auth } from './auth.js';
import { toWebHeaders } from './fastify-bridge.js';

@Module({
  providers: [
    {
      provide: AUTH,
      inject: [DB, ConfigService],
      useFactory: (db: Db, config: ConfigService<Env, true>): Auth =>
        createAuth(db, {
          secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
          baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
        }),
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

    // Mount better-auth inside an encapsulated plugin so its raw-body content-type
    // parser only applies to /api/auth/*, leaving the rest of the API on Fastify's
    // default JSON parsing.
    fastify.register((instance, _opts, done) => {
      // This encapsulated context inherits Fastify's JSON parser; replace it with a
      // raw-string parser so better-auth receives the untouched body (and empty
      // bodies don't 400). The parent context keeps its default JSON parsing.
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
        const setCookies = response.headers.getSetCookie();
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() !== 'set-cookie') {
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
