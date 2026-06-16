import { Controller, Get, Header } from '@nestjs/common';

import { buildOpenApiDocument } from './registry.js';

const SWAGGER_UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CarNotea API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
    });
  </script>
</body>
</html>`;

@Controller()
export class OpenApiController {
  private cachedDoc: object | null = null;

  @Get('openapi.json')
  openapiJson(): object {
    this.cachedDoc ??= buildOpenApiDocument();
    return this.cachedDoc;
  }

  @Get('docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  docs(): string {
    return SWAGGER_UI_HTML;
  }
}
