import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { ApiErrorSchema } from '@carnotea/shared';

import { ZodValidationException } from './zod-validation.exception.js';

const registry = new OpenAPIRegistry();

type MaybeInfer<T> = T extends z.ZodType ? z.infer<T> : never;

export function zodRoute<
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  R extends z.ZodType = z.ZodType,
>(config: {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  operationId: string;
  tags?: string[];
  summary?: string;
  params?: P;
  query?: Q;
  body?: B;
  response: R;
}) {
  registry.registerPath({
    method: config.method,
    path: config.path,
    operationId: config.operationId,
    tags: config.tags,
    summary: config.summary,
    request: {
      // registerPath expects ZodObject for params/query; callers must pass z.object({}).
      params: config.params as never,
      query: config.query as never,
      body: config.body ? { content: { 'application/json': { schema: config.body } } } : undefined,
    },
    responses: {
      200: {
        description: 'Success',
        content: { 'application/json': { schema: config.response } },
      },
      400: {
        description: 'Validation error',
        content: { 'application/json': { schema: ApiErrorSchema } },
      },
    },
  });

  function makeValidator<S extends z.ZodType | undefined>(schema: S, label: string) {
    return (input: unknown): MaybeInfer<S> => {
      if (!schema) throw new Error(`No ${label} schema defined for this route`);
      const result = schema.safeParse(input);
      if (!result.success) throw new ZodValidationException(result.error);
      return result.data as MaybeInfer<S>;
    };
  }

  return {
    validateParams: makeValidator(config.params, 'params'),
    validateQuery: makeValidator(config.query, 'query'),
    validateBody: makeValidator(config.body, 'body'),
    validateResponse: makeValidator(config.response, 'response'),
  };
}

export function generateOpenAPIDocument(): object {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'CarNotea API', version: '0.1.0' },
    servers: [{ url: '/' }],
  });
}
