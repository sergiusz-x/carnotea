import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MileageSyncService } from '../mileage/mileage-sync.service.js';

import { FuelLogsController } from './fuel-logs.controller.js';
import { FuelLogsService } from './fuel-logs.service.js';

@Module({
  imports: [AuthModule],
  controllers: [FuelLogsController],
  providers: [FuelLogsService, MileageSyncService],
})
export class FuelLogsModule {}
