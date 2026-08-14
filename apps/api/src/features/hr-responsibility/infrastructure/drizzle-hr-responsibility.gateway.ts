import { randomUUID } from 'node:crypto';

import { and, asc, eq, gt, isNull, or } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  membershipsTable,
  companiesTable,
  hrResponsibilityInvitationsTable,
  permissionsTable,
  roleAssignmentsTable,
  rolePermissionsTable,
  rolesTable,
  sessionsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import { hrPermissionKeys } from '../../roles-management/domain/permissions';
import {
  hrResponsibleRoleKey,
  HrResponsibleUserNotFoundError,
  type HrResponsibilityInvitation,
  type PendingHrResponsibilityInvitation,
  type HrResponsibilityGateway,
} from '../domain/hr-responsibility';

const toUser = (row: { id: string; email: string; username: string }) => ({
  userId: row.id,
  email: row.email,
  username: row.username,
});

const toInvitation = (
  row: typeof hrResponsibilityInvitationsTable.$inferSelect,
): HrResponsibilityInvitation => ({
  id: row.id,
  companyId: row.companyId,
  inviteeEmail: row.inviteeEmail,
  tokenHash: row.tokenHash,
  purpose: 'hr-responsible',
  roleKey: 'hr-responsible',
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  acceptedAt: row.acceptedAt,
  acceptedByUserId: row.acceptedByUserId,
});

const toPendingInvitation = (
  row: typeof hrResponsibilityInvitationsTable.$inferSelect,
): PendingHrResponsibilityInvitation => ({
  id: row.id,
  companyId: row.companyId,
  inviteeEmail: row.inviteeEmail,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
});

export const createDrizzleHrResponsibilityGateway = (
  db: AppDb,
  {
    createId = randomUUID,
    now = () => new Date(),
  }: { createId?: () => string; now?: () => Date } = {},
): HrResponsibilityGateway => ({
  listCompanyUsers: async (companyId) => {
    const rows = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        username: usersTable.username,
      })
      .from(usersTable)
      .innerJoin(membershipsTable, eq(membershipsTable.userId, usersTable.id))
      .where(eq(membershipsTable.companyId, companyId));

    return [...new Map(rows.map((row) => [row.id, toUser(row)])).values()].sort(
      (a, b) => a.username.localeCompare(b.username),
    );
  },
  listResponsibilities: async (companyId) => {
    const rows = await db
      .select({
        user: {
          id: usersTable.id,
          email: usersTable.email,
          username: usersTable.username,
        },
      })
      .from(roleAssignmentsTable)
      .innerJoin(rolesTable, eq(rolesTable.id, roleAssignmentsTable.roleId))
      .innerJoin(usersTable, eq(usersTable.id, roleAssignmentsTable.userId))
      .where(
        and(
          eq(roleAssignmentsTable.companyId, companyId),
          eq(rolesTable.companyId, companyId),
          eq(rolesTable.key, hrResponsibleRoleKey),
          eq(roleAssignmentsTable.scopeType, 'company'),
          eq(roleAssignmentsTable.scopeId, companyId),
        ),
      );

    return rows.map((row) => toUser(row.user));
  },
  assignResponsibility: async ({ companyId, userId }) => {
    const [membership] = await db
      .select({ userId: membershipsTable.userId })
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.companyId, companyId),
          eq(membershipsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new HrResponsibleUserNotFoundError();
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        username: usersTable.username,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      throw new HrResponsibleUserNotFoundError();
    }

    const createdAt = now();
    await db.transaction(async (tx) => {
      const [existingRole] = await tx
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(
          and(
            eq(rolesTable.companyId, companyId),
            eq(rolesTable.key, hrResponsibleRoleKey),
          ),
        )
        .limit(1);

      const resolvedRoleId = existingRole?.id ?? createId();
      if (!existingRole) {
        await tx.insert(rolesTable).values({
          id: resolvedRoleId,
          companyId,
          key: hrResponsibleRoleKey,
          name: 'Responsable de RRHH',
          isSystem: true,
          createdAt,
        });
      }

      const permissionRows = await tx
        .select({ id: permissionsTable.id, key: permissionsTable.key })
        .from(permissionsTable);
      const permissionIds = permissionRows
        .filter((permission) =>
          (hrPermissionKeys as readonly string[]).includes(permission.key),
        )
        .map((permission) => permission.id);

      if (permissionIds.length !== hrPermissionKeys.length) {
        throw new Error('HR permissions are not seeded.');
      }

      await tx
        .insert(rolePermissionsTable)
        .values(
          permissionIds.map((permissionId) => ({
            roleId: resolvedRoleId,
            permissionId,
          })),
        )
        .onConflictDoNothing();

      await tx
        .insert(roleAssignmentsTable)
        .values({
          id: createId(),
          companyId,
          userId,
          roleId: resolvedRoleId,
          scopeNodeId: `company:${companyId}`,
          mode: 'subtree_inclusive',
          scopeType: 'company',
          scopeId: companyId,
          createdAt,
        })
        .onConflictDoNothing();
    });
    return toUser(user);
  },
  findCompany: async (companyId) => {
    const [company] = await db
      .select({ id: companiesTable.id, name: companiesTable.name })
      .from(companiesTable)
      .where(eq(companiesTable.id, companyId))
      .limit(1);
    return company ?? null;
  },
  findActiveInvitation: async ({ companyId, inviteeEmail, now }) => {
    const [row] = await db
      .select()
      .from(hrResponsibilityInvitationsTable)
      .where(
        and(
          eq(hrResponsibilityInvitationsTable.companyId, companyId),
          eq(hrResponsibilityInvitationsTable.inviteeEmail, inviteeEmail),
          isNull(hrResponsibilityInvitationsTable.acceptedAt),
          gt(hrResponsibilityInvitationsTable.expiresAt, now),
        ),
      )
      .orderBy(asc(hrResponsibilityInvitationsTable.createdAt))
      .limit(1);
    return row ? toInvitation(row) : null;
  },
  createInvitation: async (input) => {
    await db.insert(hrResponsibilityInvitationsTable).values(input);
    const [row] = await db
      .select()
      .from(hrResponsibilityInvitationsTable)
      .where(eq(hrResponsibilityInvitationsTable.id, input.id))
      .limit(1);
    if (!row) throw new Error('HR responsibility invitation insert failed');
    return toInvitation(row);
  },
  listPendingInvitations: async (companyId, now) => {
    const rows = await db
      .select()
      .from(hrResponsibilityInvitationsTable)
      .where(
        and(
          eq(hrResponsibilityInvitationsTable.companyId, companyId),
          isNull(hrResponsibilityInvitationsTable.acceptedAt),
        ),
      )
      .orderBy(asc(hrResponsibilityInvitationsTable.createdAt));
    return rows.filter((row) => row.expiresAt > now).map(toPendingInvitation);
  },
  findInvitationByTokenHash: async (tokenHash) => {
    const [row] = await db
      .select()
      .from(hrResponsibilityInvitationsTable)
      .where(eq(hrResponsibilityInvitationsTable.tokenHash, tokenHash))
      .limit(1);
    return row ? toInvitation(row) : null;
  },
  getInvitationDetailsByTokenHash: async (tokenHash, now) => {
    const [row] = await db
      .select({
        invitation: hrResponsibilityInvitationsTable,
        companyName: companiesTable.name,
      })
      .from(hrResponsibilityInvitationsTable)
      .innerJoin(
        companiesTable,
        eq(companiesTable.id, hrResponsibilityInvitationsTable.companyId),
      )
      .where(eq(hrResponsibilityInvitationsTable.tokenHash, tokenHash))
      .limit(1);
    if (!row) return null;
    const invitation = toInvitation(row.invitation);
    return {
      id: invitation.id,
      companyId: invitation.companyId,
      companyName: row.companyName,
      inviteeEmail: invitation.inviteeEmail,
      purpose: invitation.purpose,
      roleKey: invitation.roleKey,
      expiresAt: invitation.expiresAt,
      status: invitation.acceptedAt
        ? 'accepted'
        : invitation.expiresAt <= now
          ? 'expired'
          : 'pending',
    };
  },
  findUserByEmail: async (email) => {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);
    return row ?? null;
  },
  findUserByIdentifier: async (identifier) => {
    const normalizedIdentifier = identifier.toLowerCase();
    const [row] = await db
      .select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.email, normalizedIdentifier),
          eq(usersTable.username, normalizedIdentifier),
        ),
      )
      .limit(1);
    return row ?? null;
  },
  findUserMemberships: async (userId) =>
    await db
      .select({
        companyId: membershipsTable.companyId,
        role: membershipsTable.role,
        divisionId: membershipsTable.divisionId,
        localId: membershipsTable.localId,
      })
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, userId)),
  acceptInvitation: async ({
    invitationId,
    acceptedAt,
    acceptedByUserId,
    user,
    session,
    ensureCompanyUserMembership,
    companyId,
  }) => {
    await db.transaction(async (tx) => {
      const [invitation] = await tx
        .select()
        .from(hrResponsibilityInvitationsTable)
        .where(eq(hrResponsibilityInvitationsTable.id, invitationId))
        .limit(1);
      if (!invitation || invitation.companyId !== companyId) return;

      if (user) await tx.insert(usersTable).values(user);
      if (ensureCompanyUserMembership) {
        await tx
          .insert(membershipsTable)
          .values({
            userId: acceptedByUserId,
            companyId,
            divisionId: null,
            localId: null,
            role: 'company-user',
          })
          .onConflictDoNothing();
      }

      const [existingRole] = await tx
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(
          and(
            eq(rolesTable.companyId, companyId),
            eq(rolesTable.key, hrResponsibleRoleKey),
          ),
        )
        .limit(1);
      const roleId = existingRole?.id ?? createId();
      if (!existingRole) {
        await tx.insert(rolesTable).values({
          id: roleId,
          companyId,
          key: hrResponsibleRoleKey,
          name: 'Responsable de RRHH',
          isSystem: true,
          createdAt: acceptedAt,
        });
      }
      const permissionRows = await tx
        .select({ id: permissionsTable.id, key: permissionsTable.key })
        .from(permissionsTable);
      const permissionIds = permissionRows
        .filter((permission) =>
          (hrPermissionKeys as readonly string[]).includes(permission.key),
        )
        .map((permission) => permission.id);
      if (permissionIds.length !== hrPermissionKeys.length) {
        throw new Error('HR permissions are not seeded.');
      }
      await tx
        .insert(rolePermissionsTable)
        .values(permissionIds.map((permissionId) => ({ roleId, permissionId })))
        .onConflictDoNothing();
      await tx
        .insert(roleAssignmentsTable)
        .values({
          id: createId(),
          companyId,
          userId: acceptedByUserId,
          roleId,
          scopeNodeId: `company:${companyId}`,
          mode: 'subtree_inclusive',
          scopeType: 'company',
          scopeId: companyId,
          createdAt: acceptedAt,
        })
        .onConflictDoNothing();
      await tx.insert(sessionsTable).values(session);
      await tx
        .update(hrResponsibilityInvitationsTable)
        .set({ acceptedAt, acceptedByUserId })
        .where(
          and(
            eq(hrResponsibilityInvitationsTable.id, invitationId),
            isNull(hrResponsibilityInvitationsTable.acceptedAt),
          ),
        );
    });
  },
});
