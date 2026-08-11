import { randomUUID } from 'node:crypto';

import { and, count, eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import { roleAssignmentsTable } from '../../../shared/infrastructure/db/schema';
import {
  RoleAssignmentConflictError,
  RoleAssignmentNotFoundError,
  type RoleAssignmentsGateway,
} from '../domain/assignments';
import { toScopeNodeId } from './scope-node-id';

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

export const createDrizzleAssignmentsGateway = (
  db: AppDb,
  {
    createId,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): RoleAssignmentsGateway => {
  const generateId = createId ?? randomUUID;

  return {
    createAssignment: async (input) => {
      const id = generateId();
      const createdAt = now();

      try {
        await db.insert(roleAssignmentsTable).values({
          id,
          companyId: input.companyId,
          userId: input.userId,
          roleId: input.roleId,
          scopeNodeId: toScopeNodeId({
            companyId: input.companyId,
            scopeType: input.scopeType,
            scopeId: input.scopeId,
          }),
          scopeType: input.scopeType,
          scopeId: input.scopeId,
          createdAt,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new RoleAssignmentConflictError();
        }

        throw error;
      }

      return {
        id,
        companyId: input.companyId,
        userId: input.userId,
        roleId: input.roleId,
        scopeType: input.scopeType,
        scopeId: input.scopeId,
        createdAt,
      };
    },
    deleteAssignment: async (assignmentId) => {
      const [deleted] = await db
        .delete(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.id, assignmentId))
        .returning();

      if (!deleted) {
        throw new RoleAssignmentNotFoundError();
      }
    },
    findAssignmentById: async (assignmentId) => {
      const [row] = await db
        .select()
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.id, assignmentId))
        .limit(1);

      return row ?? null;
    },
    listAssignmentsForUser: async ({ companyId, userId }) => {
      return await db
        .select()
        .from(roleAssignmentsTable)
        .where(
          and(
            eq(roleAssignmentsTable.companyId, companyId),
            eq(roleAssignmentsTable.userId, userId),
          ),
        );
    },
    countAssignmentsForRole: async (roleId) => {
      const [result] = await db
        .select({ total: count(roleAssignmentsTable.id) })
        .from(roleAssignmentsTable)
        .where(eq(roleAssignmentsTable.roleId, roleId));

      return Number(result?.total ?? 0);
    },
  };
};
