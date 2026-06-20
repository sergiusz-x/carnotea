import { ROUTES } from '@carnotea/shared';
import { Controller, Get } from '@nestjs/common';
import { z } from 'zod';

import { zodRoute } from '../lib/openapi/index.js';

zodRoute({
  method: 'get',
  path: ROUTES.healthz,
  operationId: 'healthz',
  summary: 'Liveness probe',
  tags: ['Health'],
  responses: {
    '200': {
      description: 'Service is alive',
      schema: z.object({ status: z.literal('ok') }),
    },
  },
});

@Controller()
export class HealthController {
  @Get(ROUTES.healthz)
  healthz(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
