import { randomUUID } from 'node:crypto';

import { and, asc, eq, isNull } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  employeesTable,
  erpAccessInvitationsTable,
  erpAccessLinksTable,
  membershipsTable,
  sessionsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import type {
  ErpAccessGateway,
  ErpAccessInvitation,
  ErpAccessMembership,
  ErpAccessUserAccount,
  PendingErpAccessInvitation,
} from '../domain/erp-access-invitations';
import type { ErpAccessLink } from '../domain/erp-access-links';

const toEmployee = (row: typeof employeesTable.$inferSelect) => ({
  id: row.id,
  companyId: row.companyId,
  createdAt: row.createdAt,
});

const toErpAccessInvitation = (
  row: typeof erpAccessInvitationsTable.$inferSelect,
): ErpAccessInvitation => ({
  id: row.id,
  companyId: row.companyId,
  employeeId: row.employeeId,
  inviteeEmail: row.inviteeEmail,
  tokenHash: row.tokenHash,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  acceptedAt: row.acceptedAt,
  acceptedByUserId: row.acceptedByUserId,
});

const toPendingErpAccessInvitation = (
  row: typeof erpAccessInvitationsTable.$inferSelect,
): PendingErpAccessInvitation => ({
  id: row.id,
  companyId: row.companyId,
  employeeId: row.employeeId,
  inviteeEmail: row.inviteeEmail,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
});

const toErpAccessUser = (row: typeof usersTable.$inferSelect): ErpAccessUserAccount => ({
  id: row.id,
  email: row.email,
  username: row.username,
  passwordHash: row.passwordHash,
});

const toErpAccessMembership = (
  row: typeof membershipsTable.$inferSelect,
): ErpAccessMembership => ({
  userId: row.userId,
  companyId: row.companyId,
  role: row.role,
  divisionId: row.divisionId,
  localId: row.localId,
});

const toErpAccessLink = (row: typeof erpAccessLinksTable.$inferSelect): ErpAccessLink => ({
  id: row.id,
  companyId: row.companyId,
  employeeId: row.employeeId,
  userId: row.userId,
  isActive: row.isActive,
  createdAt: row.createdAt,
  revokedAt: row.revokedAt,
});

export const createDrizzleErpAccessGateway = (
  db: AppDb,
  {
    createId = randomUUID,
  }: {
    createId?: () => string;
  } = {},
): ErpAccessGateway => ({
  getEmployeeById: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(employeesTable)
      .where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.id, employeeId)))
      .limit(1);

    return row ? toEmployee(row) : null;
  },
  createInvitation: async (input) => {
    await db.insert(erpAccessInvitationsTable).values(input);

    const [row] = await db
      .select()
      .from(erpAccessInvitationsTable)
      .where(eq(erpAccessInvitationsTable.id, input.id))
      .limit(1);

    if (!row) {
      throw new Error('ERP access invitation insert failed');
    }

    return toErpAccessInvitation(row);
  },
  listPendingInvitationsByCompany: async (companyId, now) => {
    const rows = await db
      .select()
      .from(erpAccessInvitationsTable)
      .where(
        and(
          eq(erpAccessInvitationsTable.companyId, companyId),
          isNull(erpAccessInvitationsTable.acceptedAt),
        ),
      )
      .orderBy(asc(erpAccessInvitationsTable.createdAt));

    return rows
      .filter((row) => row.expiresAt > now)
      .map(toPendingErpAccessInvitation);
  },
  findInvitationByTokenHash: async (tokenHash) => {
    const [row] = await db
      .select()
      .from(erpAccessInvitationsTable)
      .where(eq(erpAccessInvitationsTable.tokenHash, tokenHash))
      .limit(1);

    return row ? toErpAccessInvitation(row) : null;
  },
  findUserByEmail: async (email) => {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    return row ? toErpAccessUser(row) : null;
  },
  findUserByIdentifier: async (identifier) => {
    const normalizedIdentifier = identifier.toLowerCase();
    const [row] = await db
      .select()
      .from(usersTable)
      .where(
        eq(usersTable.email, normalizedIdentifier),
      )
      .limit(1);

    if (row) {
      return toErpAccessUser(row);
    }

    const [userByUsername] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.username, normalizedIdentifier))
      .limit(1);

    return userByUsername ? toErpAccessUser(userByUsername) : null;
  },
  findUserMemberships: async (userId) => {
    const rows = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId));
    return rows.map(toErpAccessMembership);
  },
  getActiveLinkByEmployeeId: async (companyId, employeeId) => {
    const [row] = await db
      .select()
      .from(erpAccessLinksTable)
      .where(
        and(
          eq(erpAccessLinksTable.companyId, companyId),
          eq(erpAccessLinksTable.employeeId, employeeId),
          eq(erpAccessLinksTable.isActive, true),
        ),
      )
      .limit(1);

    return row ? toErpAccessLink(row) : null;
  },
  getActiveLinkByUserId: async (companyId, userId) => {
    const [row] = await db
      .select()
      .from(erpAccessLinksTable)
      .where(
        and(
          eq(erpAccessLinksTable.companyId, companyId),
          eq(erpAccessLinksTable.userId, userId),
          eq(erpAccessLinksTable.isActive, true),
        ),
      )
      .limit(1);

    return row ? toErpAccessLink(row) : null;
  },
  acceptInvitation: async ({
    invitationId,
    acceptedAt,
    acceptedByUserId,
    employeeId,
    companyId,
    user,
    session,
    ensureCompanyUserMembership,
  }) => {
    await db.transaction(async (tx) => {
      if (user) {
        await tx.insert(usersTable).values(user);
      }

      if (ensureCompanyUserMembership) {
        const [existingMembership] = await tx
          .select({ userId: membershipsTable.userId })
          .from(membershipsTable)
          .where(
            and(
              eq(membershipsTable.userId, acceptedByUserId),
              eq(membershipsTable.companyId, companyId),
              eq(membershipsTable.role, 'company-user'),
            ),
          )
          .limit(1);

        if (!existingMembership) {
          await tx.insert(membershipsTable).values({
            userId: acceptedByUserId,
            companyId,
            divisionId: null,
            localId: null,
            role: 'company-user',
          });
        }
      }

      const [existingActiveLink] = await tx
        .select()
        .from(erpAccessLinksTable)
        .where(
          and(
            eq(erpAccessLinksTable.companyId, companyId),
            eq(erpAccessLinksTable.employeeId, employeeId),
            eq(erpAccessLinksTable.userId, acceptedByUserId),
            eq(erpAccessLinksTable.isActive, true),
          ),
        )
        .limit(1);

      if (!existingActiveLink) {
        await tx.insert(erpAccessLinksTable).values({
          id: createId(),
          companyId,
          employeeId,
          userId: acceptedByUserId,
          isActive: true,
          createdAt: acceptedAt,
          revokedAt: null,
        });
      }

      await tx.insert(sessionsTable).values(session);
      await tx
        .update(erpAccessInvitationsTable)
        .set({ acceptedAt, acceptedByUserId })
        .where(eq(erpAccessInvitationsTable.id, invitationId));
    });
  },
  revokeAccess: async ({ companyId, employeeId, revokedAt }) => {
    await db
      .update(erpAccessLinksTable)
      .set({ isActive: false, revokedAt })
      .where(
        and(
          eq(erpAccessLinksTable.companyId, companyId),
          eq(erpAccessLinksTable.employeeId, employeeId),
          eq(erpAccessLinksTable.isActive, true),
        ),
      );
  },
});
