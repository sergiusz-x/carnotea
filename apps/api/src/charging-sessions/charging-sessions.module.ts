import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CostSyncService } from '../expenses/cost-sync.service.js';
import { MileageSyncService } from '../mileage/mileage-sync.service.js';

import { ChargingSessionsController } from './charging-sessions.controller.js';
import { ChargingSessionsService } from './charging-sessions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ChargingSessionsController],
  providers: [ChargingSessionsService, MileageSyncService, CostSyncService],
})
export class ChargingSessionsModule {}
