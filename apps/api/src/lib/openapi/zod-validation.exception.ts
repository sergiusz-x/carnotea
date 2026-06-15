import { HttpException, HttpStatus } from '@nestjs/common';
import { type ZodError } from 'zod';

export class ZodValidationException extends HttpException {
  constructor(readonly zodError: ZodError) {
    super('Validation failed', HttpStatus.BAD_REQUEST);
  }
}
