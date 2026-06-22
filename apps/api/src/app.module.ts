import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module.js';
import { ChargingSessionsModule } from './charging-sessions/charging-sessions.module.js';
import { validateEnv } from './config/env.js';
import { DbModule } from './db/db.module.js';
import { FuelLogsModule } from './fuel-logs/fuel-logs.module.js';
import { HealthController } from './health/health.controller.js';
import { ReadinessController } from './health/readiness.controller.js';
import { IssuesModule } from './issues/issues.module.js';
import { OpenApiModule } from './lib/openapi/index.js';
import { MileageReadingsModule } from './mileage-readings/mileage-readings.module.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { MeController } from './users/me.controller.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
      },
    }),
    DbModule,
    OpenApiModule,
    AuthModule,
    VehiclesModule,
    FuelLogsModule,
    ChargingSessionsModule,
    MileageReadingsModule,
    RemindersModule,
    IssuesModule,
  ],
  controllers: [HealthController, ReadinessController, MeController],
})
export class AppModule {}
