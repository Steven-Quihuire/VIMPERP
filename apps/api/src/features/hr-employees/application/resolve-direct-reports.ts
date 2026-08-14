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
    const employee = await gateway.getEmployeeById(
      input.companyId,
      input.employeeId,
    );

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    const managerAssignment =
      await gateway.getActivePrimaryAssignmentByEmployeeId(
        input.companyId,
        input.employeeId,
      );

    if (
      !managerAssignment ||
      managerAssignment.companyId !== input.companyId ||
      managerAssignment.employeeId !== input.employeeId ||
      !managerAssignment.isPrimary ||
      managerAssignment.endedAt !== null
    ) {
      return [];
    }

    const directReports = await gateway.listDirectReportAssignments(
      input.companyId,
      managerAssignment.positionId,
    );

    const validDirectReports = await Promise.all(
      directReports.map(async (assignment) => {
        if (
          assignment.companyId !== input.companyId ||
          !assignment.isPrimary ||
          assignment.endedAt !== null
        ) {
          return null;
        }

        const [employee, position] = await Promise.all([
          gateway.getEmployeeById(input.companyId, assignment.employeeId),
          gateway.getPositionById(input.companyId, assignment.positionId),
        ]);

        return employee && position
          ? {
              employeeId: assignment.employeeId,
              positionId: assignment.positionId,
              assignmentId: assignment.id,
            }
          : null;
      }),
    );

    return validDirectReports.filter(
      (report): report is NonNullable<typeof report> => report !== null,
    );
  };
};
