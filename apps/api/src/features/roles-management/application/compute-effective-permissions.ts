import type {
  RoleAssignmentsGateway,
  ScopeHierarchyGateway,
  ScopeRef,
} from '../domain/assignments';
import type { RolesGateway } from '../domain/roles';
import { isSameScopeRef, scopeLineageContains } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

const uniqueSorted = (permissionKeys: Iterable<string>) => [...new Set(permissionKeys)].sort();

export const createComputeEffectivePermissionsUseCase = ({
  rolesGateway,
  assignmentsGateway,
  scopeHierarchyGateway,
}: {
  rolesGateway: RolesGateway;
  assignmentsGateway: RoleAssignmentsGateway;
  scopeHierarchyGateway: ScopeHierarchyGateway;
}) => {
  return async (input: {
    companyId: string;
    userId: string;
    currentContext: ScopeRef;
  }) => {
    const [lineage, assignments] = await Promise.all([
      scopeHierarchyGateway.getScopeLineage(input.companyId, input.currentContext),
      assignmentsGateway.listAssignmentsForUser({
        companyId: input.companyId,
        userId: input.userId,
      }),
    ]);

    const inScopeAssignments = assignments.filter((assignment) => {
      if (assignment.companyId !== input.companyId) {
        return false;
      }

      const assignmentScope: ScopeRef = {
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
      };

      return assignment.mode === 'exact_node'
        ? isSameScopeRef(assignmentScope, input.currentContext)
        : scopeLineageContains(lineage, assignmentScope);
    });

    if (inScopeAssignments.length === 0) {
      return [];
    }

    const rolePermissionRows = await rolesGateway.listRolePermissionRows(
      inScopeAssignments.map((assignment) => assignment.roleId),
    );

    return uniqueSorted(rolePermissionRows.map((row) => row.permissionKey));
  };
};
