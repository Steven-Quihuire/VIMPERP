import {
  EmployeeNotFoundError,
  type HrEmployeesGateway,
} from '../domain/employees';
import type { ReportingLineRecord } from '../domain/reporting-line';

export const createResolveDirectReportsUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: {
    companyId: string;
    employeeId: string;
  }): Promise<ReportingLineRecord[]> => {
    const employee = await gateway.getEmployeeById(input.companyId, input.employeeId);

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    const managerAssignment = await gateway.getActivePrimaryAssignmentByEmployeeId(
      input.companyId,
      input.employeeId,
    );

    if (!managerAssignment) {
      return [];
    }

    const directReports = await gateway.listDirectReportAssignments(
      input.companyId,
      managerAssignment.positionId,
    );

    return directReports.map((assignment) => ({
      employeeId: assignment.employeeId,
      positionId: assignment.positionId,
      assignmentId: assignment.id,
    }));
  };
};
