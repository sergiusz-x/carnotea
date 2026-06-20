import { ErrorResponseSchema, type ApiIssue } from '@carnotea/shared';

import { type paths } from './schema';

type GetPath = Extract<
  {
    [Path in keyof paths]: paths[Path] extends { get: object } ? Path : never;
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
  ): Promise<{
    data: SuccessResponse<paths[Path]['get']>;
    response: Response;
  }> {
    const response = await fetch(path);

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    const data = (response.status === 204 ? undefined : await response.json()) as SuccessResponse<
      paths[Path]['get']
    >;

    return { data, response };
  },
};
