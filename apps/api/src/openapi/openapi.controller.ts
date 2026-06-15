import { Controller, Get } from '@nestjs/common';

import { generateOpenAPIDocument } from '../lib/openapi/index.js';

@Controller()
export class OpenApiController {
  @Get('openapi.json')
  spec(): object {
    return generateOpenAPIDocument();
  }
}
