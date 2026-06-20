import { ROUTES } from '@carnotea/shared';
import { type Db } from '@carnotea/db';
import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { z } from 'zod';

import { DB } from '../db/db.constants.js';
import { zodRoute } from '../lib/openapi/index.js';

zodRoute({
  method: 'get',
  path: ROUTES.readyz,
  operationId: 'readyz',
  summary: 'Readiness probe',
  tags: ['Health'],
  responses: {
    '200': {
      description: 'Service and database are ready',
      schema: z.object({ status: z.literal('ok'), db: z.literal('ok') }),
    },
    '503': {
      description: 'Database is unreachable',
      schema: z.object({ status: z.literal('error'), db: z.literal('unreachable') }),
    },
  },
});

@Controller()
export class ReadinessController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get(ROUTES.readyz)
  async readyz(): Promise<{ status: 'ok'; db: 'ok' }> {
    try {
      await this.db.execute(sql`SELECT 1`);
    } catch {
      throw new HttpException(
        { status: 'error', db: 'unreachable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: 'ok', db: 'ok' };
  }
}
