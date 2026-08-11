import { randomUUID } from 'node:crypto';

import { count, eq, inArray } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  permissionsTable,
  roleAssignmentsTable,
  rolePermissionsTable,
  rolesTable,
} from '../../../shared/infrastructure/db/schema';
import {
  RoleConflictError,
  RoleNotFoundError,
  type Role,
  type RolePermissionRow,
  type RoleWithPermissions,
  type RolesGateway,
} from '../domain/roles';

type RoleRow = typeof rolesTable.$inferSelect;

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

const toRole = (row: RoleRow): Role => ({
  id: row.id,
  companyId: row.companyId,
  key: row.key,
  name: row.name,
  isSystem: row.isSystem,
  createdAt: row.createdAt,
});

export const createDrizzleRolesGateway = (
  db: AppDb,
  {
    createId,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): RolesGateway => {
  const generateId = createId ?? randomUUID;

  const listRolePermissionRows = async (roleIds: string[]): Promise<RolePermissionRow[]> => {
    if (roleIds.length === 0) {
      return [];
    }

    const rows = await db
      .select({
        roleId: rolePermissionsTable.roleId,
        permissionKey: permissionsTable.key,
      })
      .from(rolePermissionsTable)
      .innerJoin(
        permissionsTable,
        eq(rolePermissionsTable.permissionId, permissionsTable.id),
      )
      .where(inArray(rolePermissionsTable.roleId, roleIds));

    return rows.map((row) => ({ roleId: row.roleId, permissionKey: row.permissionKey }));
  };

  return {
    createRole: async (input) => {
      const id = generateId();
      const createdAt = now();

      try {
        await db.transaction(async (tx) => {
          await tx.insert(rolesTable).values({
            id,
            companyId: input.companyId,
            key: input.key,
            name: input.name,
            isSystem: input.isSystem,
            createdAt,
          });

          if (input.permissionIds.length > 0) {
            await tx.insert(rolePermissionsTable).values(
              input.permissionIds.map((permissionId) => ({
                roleId: id,
                permissionId,
              })),
            );
          }
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new RoleConflictError();
        }

        throw error;
      }

      return {
        id,
        companyId: input.companyId,
        key: input.key,
        name: input.name,
        isSystem: input.isSystem,
        createdAt,
      };
    },
    updateRole: async (input) => {
      try {
        const [updated] = await db
          .update(rolesTable)
          .set({
            ...(input.key !== undefined ? { key: input.key } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
          })
          .where(eq(rolesTable.id, input.roleId))
          .returning();

        if (!updated) {
          throw new RoleNotFoundError();
        }

        return toRole(updated);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new RoleConflictError();
        }

        throw error;
      }
    },
    deleteRole: async (roleId) => {
      await db.delete(rolesTable).where(eq(rolesTable.id, roleId));
    },
    listRoles: async (companyId) => {
      const rows = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.companyId, companyId));

      return rows.map(toRole);
    },
    findRoleById: async (roleId) => {
      const [row] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, roleId))
        .limit(1);

      return row ? toRole(row) : null;
    },
    findRoleWithPermissions: async (roleId) => {
      const [row] = await db
        .select()
        .from(rolesTable)
        .where(eq(rolesTable.id, roleId))
        .limit(1);

      if (!row) {
        return null;
      }

      const permissionRows = await listRolePermissionRows([roleId]);

      const role: RoleWithPermissions = {
        ...toRole(row),
        permissionKeys: permissionRows.map((permission) => permission.permissionKey).sort(),
      };

      return role;
    },
    listRolePermissionRows,
    replaceRolePermissions: async ({ roleId, permissionIds }) => {
      await db.transaction(async (tx) => {
        await tx.delete(rolePermissionsTable).where(eq(rolePermissionsTable.roleId, roleId));

        if (permissionIds.length > 0) {
          await tx.insert(rolePermissionsTable).values(
            permissionIds.map((permissionId) => ({ roleId, permissionId })),
          );
        }
      });
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
