import { type ApiIssue } from '@carnotea/shared';
import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import { type ZodType } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const issues: ApiIssue[] = result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path as (string | number)[],
        message: issue.message,
      }));
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        issues,
      });
    }
    return result.data;
  }
}
