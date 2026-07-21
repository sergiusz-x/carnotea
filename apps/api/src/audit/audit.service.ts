import { type Db, auditLogs } from '@carnotea/db';
import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { DB } from '../db/db.constants.js';

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditPayload {
  tableName: string;
  recordId: string;
  actorId: string;
  operation: AuditOperation;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuditService.name);
  }

  async log(payload: AuditPayload): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        tableName: payload.tableName,
        recordId: payload.recordId,
        actorId: payload.actorId,
        operation: payload.operation,
        oldData: payload.oldData ?? null,
        newData: payload.newData ?? null,
      });
    } catch (error) {
      this.logger.error({ err: error, payload }, 'Failed to insert audit log');
    }
  }
}
