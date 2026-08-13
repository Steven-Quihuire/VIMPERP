import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  companiesTable,
  membershipsTable,
  nodeManagementInvitationsTable,
  nodeResponsibilitiesTable,
  roleAssignmentsTable,
  rolesTable,
  scopeNodesTable,
  sessionsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import type {
  NodeManagementGateway,
  NodeManagementInvitation,
  NodeManagementInvitationDetails,
  PendingNodeManagementInvitation,
  NodeResponsibility,
  NodeResponsibilityRecord,
  NodeResponsibilityState,
} from '../domain/node-management';
import {
  nodeManagementAssignmentMode,
  nodeManagementBaseMembershipRole,
  nodeManagementRoleKey,
  NodeResponsibilityConflictError,
} from '../domain/node-management';

type NodeManagementTx = Parameters<Parameters<AppDb['transaction']>[0]>[0];

const isUniqueViolation = (error: unknown) => {
  let candidate: unknown = error;

  while (typeof candidate === 'object' && candidate !== null && 'cause' in candidate) {
    const next = (candidate as { cause?: unknown }).cause;

    if (!next) {
      break;
    }

    candidate = next;
  }

  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'code' in candidate &&
    (candidate as { code?: unknown }).code === '23505'
  );
};

const toNodeResponsibility = (
  row: typeof nodeResponsibilitiesTable.$inferSelect,
): NodeResponsibility => ({
  id: row.id,
  companyId: row.companyId,
  scopeNodeId: row.scopeNodeId,
  scopeType: row.scopeType,
  scopeId: row.scopeId,
  responsibleUserId: row.responsibleUserId,
  managedRoleKey:
    row.managedRoleKey === nodeManagementRoleKey
      ? nodeManagementRoleKey
      : nodeManagementRoleKey,
  assignmentMode:
    row.assignmentMode === nodeManagementAssignmentMode
      ? nodeManagementAssignmentMode
      : nodeManagementAssignmentMode,
  baseMembershipRole:
    row.baseMembershipRole === nodeManagementBaseMembershipRole
      ? nodeManagementBaseMembershipRole
      : nodeManagementBaseMembershipRole,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  endedAt: row.endedAt,
});

const toNodeResponsibilityRecord = (row: {
  responsibility: typeof nodeResponsibilitiesTable.$inferSelect;
  scopeName: string;
  responsibleUserEmail: string;
  responsibleUserUsername: string;
}): NodeResponsibilityRecord => ({
  ...toNodeResponsibility(row.responsibility),
  scopeName: row.scopeName,
  responsibleUserEmail: row.responsibleUserEmail,
  responsibleUsername: row.responsibleUserUsername,
});

const ensureNodeManagerRole = async (
  tx: NodeManagementTx,
  {
    companyId,
    createdAt,
    createId,
  }: {
    companyId: string;
    createdAt: Date;
    createId: () => string;
  },
) => {
  const [existingRole] = await tx
    .select({ id: rolesTable.id })
    .from(rolesTable)
    .where(and(eq(rolesTable.companyId, companyId), eq(rolesTable.key, nodeManagementRoleKey)))
    .limit(1);

  if (existingRole) {
    return existingRole.id;
  }

  const roleId = createId();

  await tx.insert(rolesTable).values({
    id: roleId,
    companyId,
    key: nodeManagementRoleKey,
    name: 'Node Manager',
    isSystem: true,
    createdAt,
  });

  return roleId;
};

const toNodeManagementInvitation = (
  row: typeof nodeManagementInvitationsTable.$inferSelect,
): NodeManagementInvitation => ({
  id: row.id,
  companyId: row.companyId,
  scopeNodeId: row.scopeNodeId,
  scopeType: row.scopeType,
  scopeId: row.scopeId,
  inviteeEmail: row.inviteeEmail,
  tokenHash: row.tokenHash,
  managedRoleKey:
    row.managedRoleKey === nodeManagementRoleKey
      ? nodeManagementRoleKey
      : nodeManagementRoleKey,
  baseMembershipRole:
    row.baseMembershipRole === nodeManagementBaseMembershipRole
      ? nodeManagementBaseMembershipRole
      : nodeManagementBaseMembershipRole,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
  acceptedAt: row.acceptedAt,
  acceptedByUserId: row.acceptedByUserId,
});

const toPendingNodeManagementInvitation = (row: {
  invitation: typeof nodeManagementInvitationsTable.$inferSelect;
  scopeName: string;
}): PendingNodeManagementInvitation => ({
  id: row.invitation.id,
  companyId: row.invitation.companyId,
  scopeNodeId: row.invitation.scopeNodeId,
  scopeType: row.invitation.scopeType,
  scopeId: row.invitation.scopeId,
  scopeName: row.scopeName,
  inviteeEmail: row.invitation.inviteeEmail,
  createdAt: row.invitation.createdAt,
  expiresAt: row.invitation.expiresAt,
});

export const createDrizzleNodeManagementGateway = (
  db: AppDb,
  {
    createId = randomUUID,
  }: {
    createId?: () => string;
  } = {},
): NodeManagementGateway => {
  return {
    listResponsibilitiesByCompany: async (companyId) => {
      const rows = await db
        .select({
          responsibility: nodeResponsibilitiesTable,
          scopeName: scopeNodesTable.name,
          responsibleUserEmail: usersTable.email,
          responsibleUserUsername: usersTable.username,
        })
        .from(nodeResponsibilitiesTable)
        .innerJoin(scopeNodesTable, eq(scopeNodesTable.id, nodeResponsibilitiesTable.scopeNodeId))
        .innerJoin(usersTable, eq(usersTable.id, nodeResponsibilitiesTable.responsibleUserId))
        .where(eq(nodeResponsibilitiesTable.companyId, companyId))
        .orderBy(
          asc(nodeResponsibilitiesTable.scopeType),
          asc(nodeResponsibilitiesTable.scopeId),
          desc(nodeResponsibilitiesTable.isActive),
          desc(nodeResponsibilitiesTable.createdAt),
        );

      return rows.map(toNodeResponsibilityRecord);
    },
    listPendingInvitationsByCompany: async (companyId, now) => {
      const rows = await db
        .select({
          invitation: nodeManagementInvitationsTable,
          scopeName: scopeNodesTable.name,
        })
        .from(nodeManagementInvitationsTable)
        .innerJoin(
          scopeNodesTable,
          eq(scopeNodesTable.id, nodeManagementInvitationsTable.scopeNodeId),
        )
        .where(
          and(
            eq(nodeManagementInvitationsTable.companyId, companyId),
            isNull(nodeManagementInvitationsTable.acceptedAt),
          ),
        )
        .orderBy(
          asc(nodeManagementInvitationsTable.scopeType),
          asc(nodeManagementInvitationsTable.scopeId),
          desc(nodeManagementInvitationsTable.createdAt),
        );

      return rows
        .filter((row) => row.invitation.expiresAt > now)
        .map(toPendingNodeManagementInvitation);
    },
    getResponsibilityState: async ({ companyId, scopeType, scopeId }) => {
      const [scopeNode] = await db
        .select({
          scopeNodeId: scopeNodesTable.id,
          scopeName: scopeNodesTable.name,
          scopeType: scopeNodesTable.nodeType,
          scopeId: scopeNodesTable.sourceId,
        })
        .from(scopeNodesTable)
        .where(
          and(
            eq(scopeNodesTable.companyId, companyId),
            eq(scopeNodesTable.nodeType, scopeType),
            eq(scopeNodesTable.sourceId, scopeId),
          ),
        )
        .limit(1);

      if (!scopeNode) {
        return null;
      }

      const responsibilityRows = await db
        .select({
          responsibility: nodeResponsibilitiesTable,
          scopeName: scopeNodesTable.name,
          responsibleUserEmail: usersTable.email,
          responsibleUserUsername: usersTable.username,
        })
        .from(nodeResponsibilitiesTable)
        .innerJoin(scopeNodesTable, eq(scopeNodesTable.id, nodeResponsibilitiesTable.scopeNodeId))
        .innerJoin(usersTable, eq(usersTable.id, nodeResponsibilitiesTable.responsibleUserId))
        .where(eq(nodeResponsibilitiesTable.scopeNodeId, scopeNode.scopeNodeId))
        .orderBy(desc(nodeResponsibilitiesTable.isActive), desc(nodeResponsibilitiesTable.createdAt));

      const responsibilities = responsibilityRows.map(toNodeResponsibilityRecord);

      return {
        companyId,
        scopeNodeId: scopeNode.scopeNodeId,
        scopeType: scopeNode.scopeType,
        scopeId: scopeNode.scopeId,
        scopeName: scopeNode.scopeName,
        activeResponsibility:
          responsibilities.find((responsibility) => responsibility.isActive && responsibility.endedAt === null) ??
          null,
        responsibilities,
      } satisfies NodeResponsibilityState;
    },
    findScopeNode: async ({ companyId, scopeType, scopeId }) => {
      const [row] = await db
        .select({
          scopeNodeId: scopeNodesTable.id,
          scopeName: scopeNodesTable.name,
          companyName: companiesTable.name,
        })
        .from(scopeNodesTable)
        .innerJoin(companiesTable, eq(companiesTable.id, scopeNodesTable.companyId))
        .where(
          and(
            eq(scopeNodesTable.companyId, companyId),
            eq(scopeNodesTable.nodeType, scopeType),
            eq(scopeNodesTable.sourceId, scopeId),
          ),
        )
        .limit(1);

      return row ?? null;
    },
    createInvitation: async (input) => {
      await db.insert(nodeManagementInvitationsTable).values(input);

      const [row] = await db
        .select()
        .from(nodeManagementInvitationsTable)
        .where(eq(nodeManagementInvitationsTable.id, input.id))
        .limit(1);

      if (!row) {
        throw new Error('Invitation insert failed');
      }

      return toNodeManagementInvitation(row);
    },
    findInvitationByTokenHash: async (tokenHash) => {
      const [row] = await db
        .select()
        .from(nodeManagementInvitationsTable)
        .where(eq(nodeManagementInvitationsTable.tokenHash, tokenHash))
        .limit(1);

      return row ? toNodeManagementInvitation(row) : null;
    },
    getInvitationDetailsByTokenHash: async (tokenHash, now) => {
      const [row] = await db
        .select({
          id: nodeManagementInvitationsTable.id,
          companyId: nodeManagementInvitationsTable.companyId,
          companyName: companiesTable.name,
          scopeNodeId: nodeManagementInvitationsTable.scopeNodeId,
          scopeType: nodeManagementInvitationsTable.scopeType,
          scopeId: nodeManagementInvitationsTable.scopeId,
          scopeName: scopeNodesTable.name,
          inviteeEmail: nodeManagementInvitationsTable.inviteeEmail,
          managedRoleKey: nodeManagementInvitationsTable.managedRoleKey,
          baseMembershipRole: nodeManagementInvitationsTable.baseMembershipRole,
          expiresAt: nodeManagementInvitationsTable.expiresAt,
          acceptedAt: nodeManagementInvitationsTable.acceptedAt,
        })
        .from(nodeManagementInvitationsTable)
        .innerJoin(companiesTable, eq(companiesTable.id, nodeManagementInvitationsTable.companyId))
        .innerJoin(scopeNodesTable, eq(scopeNodesTable.id, nodeManagementInvitationsTable.scopeNodeId))
        .where(eq(nodeManagementInvitationsTable.tokenHash, tokenHash))
        .limit(1);

      if (!row) {
        return null;
      }

      const status: NodeManagementInvitationDetails['status'] = row.acceptedAt
        ? 'accepted'
        : row.expiresAt <= now
          ? 'expired'
          : 'pending';

      return {
        id: row.id,
        companyId: row.companyId,
        companyName: row.companyName,
        scopeNodeId: row.scopeNodeId,
        scopeType: row.scopeType,
        scopeId: row.scopeId,
        scopeName: row.scopeName,
        inviteeEmail: row.inviteeEmail,
        managedRoleKey:
          row.managedRoleKey === nodeManagementRoleKey
            ? nodeManagementRoleKey
            : nodeManagementRoleKey,
        baseMembershipRole:
          row.baseMembershipRole === nodeManagementBaseMembershipRole
            ? nodeManagementBaseMembershipRole
            : nodeManagementBaseMembershipRole,
        expiresAt: row.expiresAt,
        status,
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
    findUserMemberships: async (userId) => {
      return await db
        .select({
          companyId: membershipsTable.companyId,
          role: membershipsTable.role,
          divisionId: membershipsTable.divisionId,
          localId: membershipsTable.localId,
        })
        .from(membershipsTable)
        .where(eq(membershipsTable.userId, userId));
    },
    acceptInvitation: async ({
      invitationId,
      acceptedAt,
      acceptedByUserId,
      user,
      session,
      ensureCompanyUserMembership,
      companyId,
    }) => {
      try {
        await db.transaction(async (tx) => {
          const [invitation] = await tx
            .select()
            .from(nodeManagementInvitationsTable)
            .where(eq(nodeManagementInvitationsTable.id, invitationId))
            .limit(1);

          if (!invitation) {
            return;
          }

          if (user) {
            await tx.insert(usersTable).values(user);
          }

          if (ensureCompanyUserMembership) {
            const [existingMembership] = await tx
              .select({ userId: membershipsTable.userId })
              .from(membershipsTable)
              .where(
                and(
                  eq(membershipsTable.userId, session.userId),
                  eq(membershipsTable.companyId, companyId),
                  eq(membershipsTable.role, 'company-user'),
                ),
              )
              .limit(1);

            if (!existingMembership) {
              await tx.insert(membershipsTable).values({
                userId: session.userId,
                companyId,
                divisionId: null,
                localId: null,
                role: 'company-user',
              });
            }
          }

          const roleId = await ensureNodeManagerRole(tx, {
            companyId,
            createdAt: acceptedAt,
            createId,
          });
          const [activeResponsibility] = await tx
            .select()
            .from(nodeResponsibilitiesTable)
            .where(
              and(
                eq(nodeResponsibilitiesTable.scopeNodeId, invitation.scopeNodeId),
                eq(nodeResponsibilitiesTable.isActive, true),
              ),
            )
            .limit(1);

          if (
            activeResponsibility &&
            activeResponsibility.responsibleUserId !== acceptedByUserId
          ) {
            await tx
              .update(nodeResponsibilitiesTable)
              .set({
                isActive: false,
                updatedAt: acceptedAt,
                endedAt: acceptedAt,
              })
              .where(eq(nodeResponsibilitiesTable.id, activeResponsibility.id));

            await tx
              .delete(roleAssignmentsTable)
              .where(
                and(
                  eq(roleAssignmentsTable.companyId, companyId),
                  eq(roleAssignmentsTable.userId, activeResponsibility.responsibleUserId),
                  eq(roleAssignmentsTable.roleId, roleId),
                  eq(roleAssignmentsTable.scopeType, invitation.scopeType),
                  eq(roleAssignmentsTable.scopeId, invitation.scopeId),
                ),
              );
          }

          const [existingAssignment] = await tx
            .select({ id: roleAssignmentsTable.id })
            .from(roleAssignmentsTable)
            .where(
              and(
                eq(roleAssignmentsTable.companyId, companyId),
                eq(roleAssignmentsTable.userId, acceptedByUserId),
                eq(roleAssignmentsTable.roleId, roleId),
                eq(roleAssignmentsTable.scopeType, invitation.scopeType),
                eq(roleAssignmentsTable.scopeId, invitation.scopeId),
              ),
            )
            .limit(1);

          if (!existingAssignment) {
            await tx.insert(roleAssignmentsTable).values({
              id: createId(),
              companyId,
              userId: acceptedByUserId,
              roleId,
              scopeNodeId: invitation.scopeNodeId,
              mode: nodeManagementAssignmentMode,
              scopeType: invitation.scopeType,
              scopeId: invitation.scopeId,
              createdAt: acceptedAt,
            });
          }

          if (!activeResponsibility || activeResponsibility.responsibleUserId !== acceptedByUserId) {
            await tx.insert(nodeResponsibilitiesTable).values({
              id: createId(),
              companyId,
              scopeNodeId: invitation.scopeNodeId,
              scopeType: invitation.scopeType,
              scopeId: invitation.scopeId,
              responsibleUserId: acceptedByUserId,
              managedRoleKey: nodeManagementRoleKey,
              assignmentMode: nodeManagementAssignmentMode,
              baseMembershipRole: nodeManagementBaseMembershipRole,
              isActive: true,
              createdAt: acceptedAt,
              updatedAt: acceptedAt,
              endedAt: null,
            });
          } else {
            await tx
              .update(nodeResponsibilitiesTable)
              .set({ updatedAt: acceptedAt, endedAt: null, isActive: true })
              .where(eq(nodeResponsibilitiesTable.id, activeResponsibility.id));
          }

          await tx.insert(sessionsTable).values(session);
          await tx
            .update(nodeManagementInvitationsTable)
            .set({ acceptedAt, acceptedByUserId })
            .where(eq(nodeManagementInvitationsTable.id, invitationId));
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new NodeResponsibilityConflictError();
        }

        throw error;
      }
    },
  };
};
