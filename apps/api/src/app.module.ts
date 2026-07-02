import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

import { AccountModule } from './account/account.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ChargingSessionsModule } from './charging-sessions/charging-sessions.module.js';
import { validateEnv } from './config/env.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DbModule } from './db/db.module.js';
import { ExpensesModule } from './expenses/expenses.module.js';
import { FuelLogsModule } from './fuel-logs/fuel-logs.module.js';
import { HealthController } from './health/health.controller.js';
import { IssuesModule } from './issues/issues.module.js';
import { MileageReadingsModule } from './mileage-readings/mileage-readings.module.js';
import { OpenApiModule } from './lib/openapi/index.js';
import { ReadinessController } from './health/readiness.controller.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { ServiceRecordsModule } from './service-records/service-records.module.js';
import { MeController } from './users/me.controller.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { AuditLoggingInterceptor } from './audit-logging.interceptor.js';
import { APP_INTERCEPTOR } from '@nestjs/core';

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
    AccountModule,
    AuthModule,
    VehiclesModule,
    FuelLogsModule,
    ChargingSessionsModule,
    MileageReadingsModule,
    RemindersModule,
    IssuesModule,
    ServiceRecordsModule,
    ExpensesModule,
    DashboardModule,
    ActivityModule,
  ],
  controllers: [HealthController, ReadinessController, MeController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
  ],
})
export class AppModule {}