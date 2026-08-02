import { randomUUID } from 'node:crypto';

import { and, count, eq, gte, or } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  auditEventsTable,
  companiesTable,
  membershipsTable,
  sessionsTable,
  userPreferencesTable,
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
  findActiveCompanyId: async (userId) => {
    const [preference] = await db
      .select({ activeCompanyId: userPreferencesTable.activeCompanyId })
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, userId))
      .limit(1);

    return preference?.activeCompanyId ?? null;
  },
  findCompanyStatus: async (companyId) => {
    const [company] = await db
      .select({ status: companiesTable.status })
      .from(companiesTable)
      .where(eq(companiesTable.id, companyId))
      .limit(1);

    return company?.status ?? 'active';
  },
  setActiveCompanyId: async (userId, companyId) => {
    const [existingPreference] = await db
      .select({ userId: userPreferencesTable.userId })
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, userId))
      .limit(1);

    if (existingPreference) {
      await db
        .update(userPreferencesTable)
        .set({ activeCompanyId: companyId })
        .where(eq(userPreferencesTable.userId, userId));

      return;
    }

    await db.insert(userPreferencesTable).values({
      userId,
      activeCompanyId: companyId,
    });
  },
  countRecentActiveCompanySwitches: async (userId, since) => {
    const [result] = await db
      .select({ total: count(auditEventsTable.id) })
      .from(auditEventsTable)
      .where(
        and(
          eq(auditEventsTable.actorUserId, userId),
          eq(auditEventsTable.type, 'auth.active_company_switched'),
          gte(auditEventsTable.createdAt, since),
        ),
      );

    return Number(result?.total ?? 0);
  },
  recordActiveCompanySwitch: async ({ userId, companyId, correlationId }) => {
    await db.insert(auditEventsTable).values({
      id: randomUUID(),
      actorUserId: userId,
      companyId,
      type: 'auth.active_company_switched',
      correlationId,
      entityType: 'user_preference',
      entityId: userId,
      details: { activeCompanyId: companyId },
      oldValues: null,
      newValues: { activeCompanyId: companyId },
      createdAt: new Date(),
    });
  },
});
