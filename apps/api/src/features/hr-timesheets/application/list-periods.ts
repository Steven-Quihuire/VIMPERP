import type { TimesheetGateway, TimesheetPeriodStatus } from '../domain/timesheets';

export const createListPeriodsUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    visibleEmployeeIds: string[];
    status?: TimesheetPeriodStatus;
  }) => {
    if (input.visibleEmployeeIds.length === 0) {
      return [];
    }

    return await gateway.listPeriods(input.companyId, {
      employeeIds: input.visibleEmployeeIds,
      ...(input.status ? { status: input.status } : {}),
    });
  };
};
