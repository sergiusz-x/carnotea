import { ErrorResponseSchema, type ApiIssue } from '@carnotea/shared';

import { enqueueMutation } from '@/offline';

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

function resolvePath(template: string, params?: Record<string, string>): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (url, [key, value]) => url.replace(`{${key}}`, encodeURIComponent(value)),
    template,
  );
}

function withQueryString(
  url: string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!query) return url;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${url}?${qs}` : url;
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
    query?: Record<string, string | number | boolean | undefined | null>,
  ): Promise<{
    data: SuccessResponse<paths[Path]['get']>;
    response: Response;
  }> {
    const url = withQueryString(resolvePath(path, params), query);
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

    if (!navigator.onLine) {
      const queued = await enqueueMutation({ method: 'POST', url, body });
      // Return a mock response so the UI updates optimistically
      return {
        data: { id: queued.id, ...body } as unknown as SuccessResponse<paths[Path]['post']>,
        response: new Response(null, { status: 202 }),
      };
    }

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

    if (!navigator.onLine) {
      const queued = await enqueueMutation({ method: 'PATCH', url, body });
      return {
        data: { id: queued.id, ...body } as unknown as SuccessResponse<paths[Path]['patch']>,
        response: new Response(null, { status: 202 }),
      };
    }

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

    if (!navigator.onLine) {
      await enqueueMutation({ method: 'DELETE', url });
      return {
        data: undefined as unknown as SuccessResponse<paths[Path]['delete']>,
        response: new Response(null, { status: 202 }),
      };
    }

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
