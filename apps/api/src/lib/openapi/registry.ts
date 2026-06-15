import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { ApiErrorSchema } from '@carnotea/shared';
import { type z } from 'zod';

import { ZodValidationException } from './zod-validation.exception.js';

const registry = new OpenAPIRegistry();

type MaybeInfer<T> = T extends z.ZodType ? z.infer<T> : never;

type ResponseConfig = {
  description: string;
  content: { 'application/json': { schema: z.ZodType } };
};

export function zodRoute<
  // params/query are always object schemas (a bag of named values), so constrain
  // them to ZodObject — this is what registerPath needs and removes the unsafe cast.
  P extends z.ZodObject | undefined = undefined,
  Q extends z.ZodObject | undefined = undefined,
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
  /** Extra non-2xx responses keyed by status code, each documented with ApiErrorSchema. */
  errors?: Record<number, string>;
}) {
  const responses: Record<string, ResponseConfig> = {
    200: {
      description: 'Success',
      content: { 'application/json': { schema: config.response } },
    },
  };

  // Only routes that validate input can ever return a 400 validation error, so
  // don't advertise one on input-less routes (e.g. health checks).
  if (config.params !== undefined || config.query !== undefined || config.body !== undefined) {
    responses[400] = {
      description: 'Validation error',
      content: { 'application/json': { schema: ApiErrorSchema } },
    };
  }

  for (const [status, description] of Object.entries(config.errors ?? {})) {
    responses[status] = {
      description,
      content: { 'application/json': { schema: ApiErrorSchema } },
    };
  }

  registry.registerPath({
    method: config.method,
    path: config.path,
    operationId: config.operationId,
    tags: config.tags,
    summary: config.summary,
    request: {
      params: config.params,
      query: config.query,
      body: config.body ? { content: { 'application/json': { schema: config.body } } } : undefined,
    },
    responses,
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
