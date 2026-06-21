import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import { IssuesController } from './issues.controller.js';
import { IssuesService } from './issues.service.js';

@Module({
  imports: [AuthModule],
  controllers: [IssuesController],
  providers: [IssuesService],
})
export class IssuesModule {}
