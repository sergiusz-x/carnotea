import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { CostSyncService } from './cost-sync.service.js';
import { ExpensesController } from './expenses.controller.js';
import { ExpensesService } from './expenses.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ExpensesController],
  providers: [ExpensesService, CostSyncService],
  exports: [CostSyncService],
})
export class ExpensesModule {}
