import { users, type Db } from '@carnotea/db';
import {
  ErrorResponseSchema,
  UserProfileSchema,
  UserProfileUpdateSchema,
  ROUTES,
  type UserProfile,
  type UserProfileUpdate,
} from '@carnotea/shared';
import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { AuthGuard } from '../auth/auth.guard.js';
import { type AuthUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DB } from '../db/db.constants.js';
import { zodRoute, ZodValidationPipe } from '../lib/openapi/index.js';

import { deriveProfileNames } from './profile-name.js';

const meNestPath = ROUTES.me.slice(1);

zodRoute({
  method: 'get',
  path: ROUTES.me,
  operationId: 'getMe',
  summary: 'Get the authenticated user profile',
  tags: ['Users'],
  responses: {
    '200': { description: 'The authenticated user profile', schema: UserProfileSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

zodRoute({
  method: 'patch',
  path: ROUTES.me,
  operationId: 'updateMe',
  summary: 'Update the authenticated user profile',
  tags: ['Users'],
  request: { body: UserProfileUpdateSchema },
  responses: {
    '200': { description: 'The updated user profile', schema: UserProfileSchema },
    '400': { description: 'Invalid request body', schema: ErrorResponseSchema },
    '401': { description: 'Not authenticated', schema: ErrorResponseSchema },
  },
});

@Controller()
export class MeController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get(meNestPath)
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthUser): Promise<UserProfile> {
    const profile = await this.db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!profile) {
      const { firstName, lastName } = deriveProfileNames({ email: user.email });

      // Provision a domain profile from the auth identity (edge case: no users row).
      const [inserted] = await this.db
        .insert(users)
        .values({
          id: user.id,
          firstName,
          lastName,
          email: user.email,
        })
        .returning();

      if (!inserted) {
        throw new InternalServerErrorException('Failed to provision user profile');
      }

      return this.toContract(inserted);
    }

    return this.toContract(profile);
  }

  @Patch(meNestPath)
  @UseGuards(AuthGuard)
  async updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(UserProfileUpdateSchema)) body: UserProfileUpdate,
  ): Promise<UserProfile> {
    // Build the update object from the body.
    const updates: Partial<typeof users.$inferInsert> = {};
    if (body.firstName !== undefined) updates.firstName = body.firstName;
    if (body.lastName !== undefined) updates.lastName = body.lastName;
    if (body.localePref !== undefined) updates.localePref = body.localePref;
    if (body.unitsPref !== undefined) updates.unitsPref = body.unitsPref;
    if (body.currencyPref !== undefined) updates.currencyPref = body.currencyPref;
    updates.updatedAt = new Date();

    const [updated] = await this.db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();

    if (!updated) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'User profile not found' });
    }

    return this.toContract(updated);
  }

  private toContract(row: typeof users.$inferSelect): UserProfile {
    const { firstName, lastName } = deriveProfileNames({
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
    });

    return {
      id: row.id,
      firstName,
      lastName,
      email: row.email,
      localePref: row.localePref as 'pl' | 'en',
      unitsPref: row.unitsPref as 'metric' | 'imperial',
      currencyPref: row.currencyPref,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

