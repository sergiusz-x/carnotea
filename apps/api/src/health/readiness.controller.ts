import { type Db } from '@carnotea/db';
import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { DB } from '../db/db.constants.js';
import { zodRoute } from '../lib/openapi/index.js';

zodRoute({
  method: 'get',
  path: '/readyz',
  operationId: 'getReadiness',
  tags: ['health'],
  response: z.object({ status: z.literal('ok'), db: z.literal('ok') }),
  errors: { 503: 'Service unavailable — the database is not reachable' },
});

@Controller()
export class ReadinessController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('readyz')
  async readyz(): Promise<{ status: 'ok'; db: 'ok' }> {
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      // Use the shared ApiErrorSchema envelope so every error response is consistent.
      throw new HttpException(
        { code: 'SERVICE_UNAVAILABLE', message: 'The database is not reachable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: 'ok', db: 'ok' };
  }
}
