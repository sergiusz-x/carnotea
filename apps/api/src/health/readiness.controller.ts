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
});

@Controller()
export class ReadinessController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('readyz')
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
