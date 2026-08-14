import type { HrEmployeesGateway } from '../../hr-employees/domain/employees';
import type { ErpAccessGateway } from '../../hr-erp-access/domain/erp-access-invitations';
import type { EvaluateReportingLineScopes } from '../domain/assignments';

const uniqueEmployeeIds = (employeeIds: string[]) => [...new Set(employeeIds)];

export const createEvaluateReportingLineScopes = ({
  hrEmployeesGateway,
  erpAccessGateway,
}: {
  hrEmployeesGateway: HrEmployeesGateway;
  erpAccessGateway: ErpAccessGateway;
}): EvaluateReportingLineScopes => {
  return async ({ companyId, userId, currentContext }) => {
    const activeLink = await erpAccessGateway.getActiveLinkByUserId(companyId, userId);

    if (!activeLink) {
      return { employeeIds: [], permissionKeys: [] };
    }

    if (currentContext.kind === 'self') {
      return {
        employeeIds: [activeLink.employeeId],
        permissionKeys: ['hr.employees.read'],
      };
    }

    const actorAssignment = await hrEmployeesGateway.getActivePrimaryAssignmentByEmployeeId(
      companyId,
      activeLink.employeeId,
    );

    if (!actorAssignment) {
      return { employeeIds: [], permissionKeys: [] };
    }

    const directReports = await hrEmployeesGateway.listDirectReportAssignments(
      companyId,
      actorAssignment.positionId,
    );

    return {
      employeeIds: uniqueEmployeeIds(
        directReports.map((assignment) => assignment.employeeId),
      ),
      permissionKeys: ['hr.employees.read'],
    };
  };
};
