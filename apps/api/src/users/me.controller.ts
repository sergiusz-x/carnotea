import { users, type Db } from '@carnotea/db';
import { ROUTES } from '@carnotea/shared';
import { Controller, Get, Inject, NotFoundException, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DB } from '../db/db.constants.js';
import { zodRoute } from '../lib/openapi/index.js';

// Local response schema until the shared user-profile schema (T-019) lands; the
// type is still inferred, never hand-written.
const MeResponseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type MeResponse = z.infer<typeof MeResponseSchema>;

zodRoute({
  method: 'get',
  path: ROUTES.me,
  operationId: 'getMe',
  summary: 'Get the authenticated user profile',
  tags: ['Users'],
  responses: {
    '200': { description: 'The authenticated user profile', schema: MeResponseSchema },
    '401': { description: 'Not authenticated' },
    '404': { description: 'Profile not found' },
  },
});

@Controller()
export class MeController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get(ROUTES.me)
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    const profile = await this.db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!profile) {
      throw new NotFoundException();
    }

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
