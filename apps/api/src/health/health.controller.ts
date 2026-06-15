import { Controller, Get } from '@nestjs/common';
import { z } from 'zod';

import { zodRoute } from '../lib/openapi/index.js';

zodRoute({
  method: 'get',
  path: '/healthz',
  operationId: 'getHealth',
  tags: ['health'],
  response: z.object({ status: z.literal('ok') }),
});

@Controller()
export class HealthController {
  @Get('healthz')
  healthz(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
