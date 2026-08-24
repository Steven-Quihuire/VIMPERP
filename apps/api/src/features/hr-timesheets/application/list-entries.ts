import {
  TimesheetPeriodNotFoundError,
  type TimesheetGateway,
} from '../domain/timesheets';

export const createListEntriesUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    visibleEmployeeIds: string[];
  }) => {
    const period = await gateway.getPeriod(input.companyId, input.periodId);

    if (!period) {
      throw new TimesheetPeriodNotFoundError();
    }

    const assignment = await gateway.findActiveAssignment(
      input.companyId,
      period.employeeAssignmentId,
    );

    if (!assignment || !input.visibleEmployeeIds.includes(assignment.employeeId)) {
      throw new TimesheetPeriodNotFoundError();
    }

    return await gateway.listEntries(input.companyId, input.periodId);
  };
};
