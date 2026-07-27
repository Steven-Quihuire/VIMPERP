import { and, eq, or } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  membershipsTable,
  sessionsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import type { AuthIdentityGateway } from '../domain/auth';

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
