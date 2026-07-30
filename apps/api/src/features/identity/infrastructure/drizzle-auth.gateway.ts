import { and, eq, or } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  membershipsTable,
  sessionsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import {
  DuplicateIdentityError,
  type AuthIdentityGateway,
} from '../domain/auth';

const isUniqueViolation = (error: unknown) => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
};

export const createDrizzleAuthIdentityGateway = (
  db: AppDb,
): AuthIdentityGateway => ({
  findUserByIdentifier: async (identifier) => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, identifier.toLowerCase()),
          eq(usersTable.username, identifier.toLowerCase()),
        ),
      )
      .limit(1);

    return user ?? null;
  },
  findUserById: async (userId) => {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    return user ?? null;
  },
  createUser: async (user) => {
    try {
      await db.insert(usersTable).values(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateIdentityError();
      }

      throw error;
    }
  },
  createUserWithSession: async (user, session) => {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(usersTable).values(user);
        await tx.insert(sessionsTable).values(session);
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateIdentityError();
      }

      throw error;
    }
  },
  createSession: async (session) => {
    await db.insert(sessionsTable).values(session);
  },
  findSession: async (token) => {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.token, token))
      .limit(1);

    return session ?? null;
  },
  deleteSession: async (token) => {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  },
  listMemberships: async (userId) => {
    return db
      .select({
        companyId: membershipsTable.companyId,
        role: membershipsTable.role,
      })
      .from(membershipsTable)
      .where(and(eq(membershipsTable.userId, userId)));
  },
});
