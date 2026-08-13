import {
  EmployeeNotFoundError,
  type HrEmployeesGateway,
} from '../domain/employees';
import type { ReportingLineRecord } from '../domain/reporting-line';

export const createResolveReportingLineUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: {
    companyId: string;
    employeeId: string;
  }): Promise<ReportingLineRecord | null> => {
    const employee = await gateway.getEmployeeById(input.companyId, input.employeeId);

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    const activeAssignment = await gateway.getActivePrimaryAssignmentByEmployeeId(
      input.companyId,
      input.employeeId,
    );

    if (!activeAssignment) {
      return null;
    }

    const employeePosition = await gateway.getPositionById(
      input.companyId,
      activeAssignment.positionId,
    );

    if (!employeePosition?.reportsToPositionId) {
      return null;
    }

    const managerAssignment = await gateway.getActivePrimaryAssignmentByPositionId(
      input.companyId,
      employeePosition.reportsToPositionId,
    );

    if (!managerAssignment) {
      return null;
    }

    return {
      employeeId: managerAssignment.employeeId,
      positionId: managerAssignment.positionId,
      assignmentId: managerAssignment.id,
    };
  };
};
