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
    const employee = await gateway.getEmployeeById(
      input.companyId,
      input.employeeId,
    );

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    const activeAssignment =
      await gateway.getActivePrimaryAssignmentByEmployeeId(
        input.companyId,
        input.employeeId,
      );

    if (
      !activeAssignment ||
      activeAssignment.companyId !== input.companyId ||
      activeAssignment.employeeId !== input.employeeId ||
      !activeAssignment.isPrimary ||
      activeAssignment.endedAt !== null
    ) {
      return null;
    }

    const employeePosition = await gateway.getPositionById(
      input.companyId,
      activeAssignment.positionId,
    );

    if (
      !employeePosition ||
      employeePosition.companyId !== input.companyId ||
      !employeePosition.reportsToPositionId
    ) {
      return null;
    }

    const managerAssignment =
      await gateway.getActivePrimaryAssignmentByPositionId(
        input.companyId,
        employeePosition.reportsToPositionId,
      );

    if (
      !managerAssignment ||
      managerAssignment.companyId !== input.companyId ||
      !managerAssignment.isPrimary ||
      managerAssignment.endedAt !== null
    ) {
      return null;
    }

    const manager = await gateway.getEmployeeById(
      input.companyId,
      managerAssignment.employeeId,
    );
    const managerPosition = await gateway.getPositionById(
      input.companyId,
      managerAssignment.positionId,
    );

    if (!manager || !managerPosition) {
      return null;
    }

    return {
      employeeId: managerAssignment.employeeId,
      positionId: managerAssignment.positionId,
      assignmentId: managerAssignment.id,
    };
  };
};
