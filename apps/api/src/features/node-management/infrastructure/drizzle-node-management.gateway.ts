import { eq } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import { nodeResponsibilitiesTable } from '../../../shared/infrastructure/db/schema';
import type { NodeManagementGateway, NodeResponsibility } from '../domain/node-management';
import {
  nodeManagementAssignmentMode,
  nodeManagementBaseMembershipRole,
  nodeManagementRoleKey,
} from '../domain/node-management';

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

export const createDrizzleNodeManagementGateway = (
  db: AppDb,
): NodeManagementGateway => {
  return {
    listResponsibilitiesByCompany: async (companyId) => {
      const rows = await db
        .select()
        .from(nodeResponsibilitiesTable)
        .where(eq(nodeResponsibilitiesTable.companyId, companyId));

      return rows.map(toNodeResponsibility);
    },
  };
};
