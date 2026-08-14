import type {
  EvaluateReportingLineScopes,
  PermissionScope,
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
  evaluateReportingLineScopes,
}: {
  rolesGateway: RolesGateway;
  assignmentsGateway: RoleAssignmentsGateway;
  scopeHierarchyGateway: ScopeHierarchyGateway;
  evaluateReportingLineScopes?: EvaluateReportingLineScopes;
}) => {
  return async (input: {
    companyId: string;
    userId: string;
    currentContext: ScopeRef;
    permissionScope?: PermissionScope;
  }) => {
    const [activeLineage, assignments] = await Promise.all([
      scopeHierarchyGateway.getScopeLineage(input.companyId, input.currentContext),
      assignmentsGateway.listAssignmentsForUser({
        companyId: input.companyId,
        userId: input.userId,
      }),
    ]);

    const requestedScope =
      input.permissionScope?.kind === 'node+descendants'
        ? input.permissionScope.scope
        : input.currentContext;
    const lineage =
      requestedScope === input.currentContext
        ? activeLineage
        : await scopeHierarchyGateway.getScopeLineage(
            input.companyId,
            requestedScope,
          );

    if (
      input.permissionScope?.kind === 'node+descendants' &&
      !scopeLineageContains(lineage, input.currentContext)
    ) {
      return [];
    }

    const inScopeAssignments = assignments.filter((assignment) => {
      if (assignment.companyId !== input.companyId) {
        return false;
      }

      const assignmentScope: ScopeRef = {
        scopeType: assignment.scopeType,
        scopeId: assignment.scopeId,
      };

      return assignment.mode === 'exact_node'
        ? isSameScopeRef(assignmentScope, requestedScope)
        : scopeLineageContains(lineage, assignmentScope);
    });

    if (inScopeAssignments.length === 0) {
      if (
        !input.permissionScope ||
        (input.permissionScope.kind !== 'direct_reports' &&
          input.permissionScope.kind !== 'self') ||
        !evaluateReportingLineScopes
      ) {
        return [];
      }
    }

    const rolePermissionRows = await rolesGateway.listRolePermissionRows(
      inScopeAssignments.map((assignment) => assignment.roleId),
    );

    const reportingLinePermissionKeys =
      input.permissionScope &&
      (input.permissionScope.kind === 'direct_reports' ||
        input.permissionScope.kind === 'self') &&
      evaluateReportingLineScopes
        ? (
            await evaluateReportingLineScopes({
              companyId: input.companyId,
              userId: input.userId,
              currentContext: input.permissionScope,
            })
          ).permissionKeys
        : [];

    return uniqueSorted([
      ...rolePermissionRows.map((row) => row.permissionKey),
      ...reportingLinePermissionKeys,
    ]);
  };
};
