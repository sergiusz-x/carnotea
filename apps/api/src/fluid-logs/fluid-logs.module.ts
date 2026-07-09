import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CostSyncService } from '../expenses/cost-sync.service.js';

import { FluidLogsController } from './fluid-logs.controller.js';
import { FluidLogsService } from './fluid-logs.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FluidLogsController],
  providers: [FluidLogsService, CostSyncService],
})
export class FluidLogsModule {}
