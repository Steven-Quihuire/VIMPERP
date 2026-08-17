import {
  TimesheetPeriodNotFoundError,
  assertEntryInPeriod,
  assertTimesheetIsDraft,
  assertValidEntryHours,
  type TimesheetGateway,
} from '../../domain/timesheets';

export const createAddEntryUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    entryDate: string;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
  }) => {
    const period = await gateway.getPeriod(input.companyId, input.periodId);

    if (!period) {
      throw new TimesheetPeriodNotFoundError();
    }

    assertTimesheetIsDraft(period);
    assertValidEntryHours(input.hours);
    assertEntryInPeriod({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      entryDate: input.entryDate,
    });

    return await gateway.createEntry(input);
  };
};
