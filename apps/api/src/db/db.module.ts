import { createDb, type Db } from '@carnotea/db';
import { type FactoryProvider, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type Env } from '../config/env.js';

import { DB } from './db.constants.js';

const dbProvider: FactoryProvider<Db> = {
  provide: DB,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) =>
    createDb(config.get('DATABASE_URL', { infer: true })),
};

@Global()
@Module({
  providers: [dbProvider],
  exports: [DB],
})
export class DbModule {}
