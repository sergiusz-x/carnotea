import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MileageSyncService } from '../mileage/mileage-sync.service.js';

import { MileageReadingsController } from './mileage-readings.controller.js';
import { MileageReadingsService } from './mileage-readings.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MileageReadingsController],
  providers: [MileageReadingsService, MileageSyncService],
})
export class MileageReadingsModule {}