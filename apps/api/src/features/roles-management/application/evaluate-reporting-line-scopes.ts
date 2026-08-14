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
    const activeLink = await erpAccessGateway.getActiveLinkByUserId(
      companyId,
      userId,
    );

    if (!activeLink) {
      return { employeeIds: [], permissionKeys: [] };
    }

    if (currentContext.kind === 'self') {
      return {
        employeeIds: [activeLink.employeeId],
        permissionKeys: ['hr.employees.read'],
      };
    }

    const actorAssignment =
      await hrEmployeesGateway.getActivePrimaryAssignmentByEmployeeId(
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

    const validDirectReports = await Promise.all(
      directReports.map(async (assignment) => {
        if (
          assignment.companyId !== companyId ||
          !assignment.isPrimary ||
          assignment.endedAt !== null
        ) {
          return null;
        }

        return (await hrEmployeesGateway.getEmployeeById(
          companyId,
          assignment.employeeId,
        ))
          ? assignment.employeeId
          : null;
      }),
    );

    return {
      employeeIds: uniqueEmployeeIds(
        validDirectReports.filter(
          (employeeId): employeeId is string => employeeId !== null,
        ),
      ),
      permissionKeys: ['hr.employees.read'],
    };
  };
};
