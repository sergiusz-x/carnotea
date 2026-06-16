import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';

export const registry = new OpenAPIRegistry();

export function buildOpenApiDocument(): object {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'CarNotea API',
      version: '1.0.0',
      description: 'Vehicle diary REST API — OpenAPI 3.1',
    },
    servers: [{ url: '/' }],
  });
}
