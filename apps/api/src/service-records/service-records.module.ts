import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MileageSyncService } from '../mileage/mileage-sync.service.js';

import { ServiceRecordsController } from './service-records.controller.js';
import { ServiceRecordsService } from './service-records.service.js';

@Module({
  imports: [AuthModule],
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService, MileageSyncService],
})
export class ServiceRecordsModule {}