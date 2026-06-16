import { type Db } from '@carnotea/db';
import { Controller, Get, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../db/db.constants.js';

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
