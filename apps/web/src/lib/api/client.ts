import { ErrorResponseSchema, type ApiIssue } from '@carnotea/shared';

import { type paths } from './schema';

type GetPath = Extract<
  {
    [Path in keyof paths]: paths[Path] extends { get: object } ? Path : never;
  }[keyof paths],
  string
>;

type PostPath = Extract<
  {
    [Path in keyof paths]: paths[Path] extends { post: object } ? Path : never;
  }[keyof paths],
  string
>;

type PatchPath = Extract<
  {
    [Path in keyof paths]: paths[Path] extends { patch: object } ? Path : never;
  }[keyof paths],
  string
>;

type DeletePath = Extract<
  {
    [Path in keyof paths]: paths[Path] extends { delete: object } ? Path : never;
  }[keyof paths],
  string
>;

type SuccessResponse<Operation> = Operation extends {
  responses: infer Responses;
}
  ? {
      [Status in keyof Responses]: Status extends 200 | 201 | 202 | 204
        ? Responses[Status] extends { content: { 'application/json': infer Data } }
          ? Data
          : undefined
        : never;
    }[keyof Responses]
  : never;

type RequestBody<Operation> = Operation extends {
  requestBody: { content: { 'application/json': infer Body } };
}
  ? Body
  : undefined;

/**
 * Interpolate a path template like `/api/vehicles/{id}` with actual params.
 * If no params are provided, the template string is returned as-is.
 */
function resolvePath(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (url, [key, value]) => url.replace(`{${key}}`, encodeURIComponent(value)),
    template,
  );
}

export class ApiError extends Error {
  readonly code: string;
  readonly issues: ApiIssue[] | undefined;

  constructor({ code, message, issues }: { code: string; message: string; issues?: ApiIssue[] }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.issues = issues;
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => undefined);
    const parsed = ErrorResponseSchema.safeParse(body);

    if (parsed.success) {
      return new ApiError(parsed.data);
    }

    return new ApiError({
      code: `HTTP_${String(response.status)}`,
      message: response.statusText || 'Request failed',
    });
  }
}

export const apiClient = {
  async GET<Path extends GetPath>(
    path: Path,
    params?: Record<string, string>,
  ): Promise<{
    data: SuccessResponse<paths[Path]['get']>;
    response: Response;
  }> {
    const url = resolvePath(path, params);
    const response = await fetch(url);

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const data = (response.status === 204 ? undefined : await response.json()) as SuccessResponse<
      paths[Path]['get']
    >;

    return { data, response };
  },

  async POST<Path extends PostPath>(
    path: Path,
    body: RequestBody<paths[Path]['post']>,
    params?: Record<string, string>,
  ): Promise<{
    data: SuccessResponse<paths[Path]['post']>;
    response: Response;
  }> {
    const url = resolvePath(path, params);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const data = (response.status === 204 ? undefined : await response.json()) as SuccessResponse<
      paths[Path]['post']
    >;

    return { data, response };
  },

  async PATCH<Path extends PatchPath>(
    path: Path,
    body: RequestBody<paths[Path]['patch']>,
    params?: Record<string, string>,
  ): Promise<{
    data: SuccessResponse<paths[Path]['patch']>;
    response: Response;
  }> {
    const url = resolvePath(path, params);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const data = (response.status === 204 ? undefined : await response.json()) as SuccessResponse<
      paths[Path]['patch']
    >;

    return { data, response };
  },

  async DELETE<Path extends DeletePath>(
    path: Path,
    params?: Record<string, string>,
  ): Promise<{
    data: SuccessResponse<paths[Path]['delete']>;
    response: Response;
  }> {
    const url = resolvePath(path, params);
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const data = (response.status === 204 ? undefined : await response.json()) as SuccessResponse<
      paths[Path]['delete']
    >;

    return { data, response };
  },
};
