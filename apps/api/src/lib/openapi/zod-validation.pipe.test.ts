import { type ErrorResponse } from '@carnotea/shared';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodValidationPipe } from './zod-validation.pipe.js';

const ThingSchema = z.object({ name: z.string(), count: z.number().int() });

describe('ZodValidationPipe', () => {
  it('passes through a valid value after parsing', () => {
    const pipe = new ZodValidationPipe(ThingSchema);
    expect(pipe.transform({ name: 'widget', count: 3 })).toEqual({ name: 'widget', count: 3 });
  });

  it('throws BadRequestException for an invalid body', () => {
    const pipe = new ZodValidationPipe(ThingSchema);
    expect(() => pipe.transform({ name: 42, count: 'bad' })).toThrow(BadRequestException);
  });

  it('error payload has code, message, and issues', () => {
    const pipe = new ZodValidationPipe(ThingSchema);
    let caught: unknown;
    try {
      pipe.transform({ name: 42 });
      expect.unreachable('transform should have thrown for an invalid value');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(BadRequestException);
    const body = (caught as BadRequestException).getResponse() as ErrorResponse;
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(typeof body.message).toBe('string');
    expect(Array.isArray(body.issues)).toBe(true);
    const issues = body.issues ?? [];
    const issue = issues[0];
    expect(issue).toBeDefined();
    if (issue) {
      expect(typeof issue.code).toBe('string');
      expect(Array.isArray(issue.path)).toBe(true);
      expect(typeof issue.message).toBe('string');
    }
  });
});
