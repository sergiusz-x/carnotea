import {
  type ResponseConfig,
  type RouteConfig,
  type ZodRequestBody,
} from '@asteasolutions/zod-to-openapi';
import { type ZodType } from 'zod';

import { registry } from './registry.js';

export interface ZodRouteResponseSpec {
  description: string;
  schema?: ZodType;
}

export interface ZodRouteSpec {
  method: RouteConfig['method'];
  path: string;
  operationId?: string;
  summary?: string;
  tags?: string[];
  request?: {
    params?: ZodType;
    query?: ZodType;
    body?: ZodType;
  };
  responses: Record<string, ZodRouteResponseSpec>;
}

type RouteParam = NonNullable<NonNullable<RouteConfig['request']>['params']>;

export function zodRoute(spec: ZodRouteSpec): ZodRouteSpec {
  const responses: RouteConfig['responses'] = {};
  for (const [status, respSpec] of Object.entries(spec.responses)) {
    const cfg: ResponseConfig = {
      description: respSpec.description,
      content: respSpec.schema ? { 'application/json': { schema: respSpec.schema } } : undefined,
    };
    responses[status] = cfg;
  }

  const body: ZodRequestBody | undefined = spec.request?.body
    ? { content: { 'application/json': { schema: spec.request.body } } }
    : undefined;

  registry.registerPath({
    method: spec.method,
    path: spec.path,
    operationId: spec.operationId,
    summary: spec.summary,
    tags: spec.tags,
    request: spec.request
      ? {
          // RouteParameter requires ZodObject; callers supply z.object({...}) at call sites
          params: spec.request.params as unknown as RouteParam,
          query: spec.request.query as unknown as RouteParam,
          body,
        }
      : undefined,
    responses,
  });

  return spec;
}
