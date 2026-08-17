import {
  TimesheetEntryNotFoundError,
  TimesheetPeriodNotFoundError,
  assertEntryInPeriod,
  assertTimesheetIsDraft,
  assertValidEntryHours,
  type TimesheetGateway,
} from '../../domain/timesheets';

export const createUpdateEntryUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    entryId: string;
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

    const entry = await gateway.getEntry(input.companyId, input.entryId);

    if (!entry || entry.periodId !== input.periodId) {
      throw new TimesheetEntryNotFoundError();
    }

    assertValidEntryHours(input.hours);
    assertEntryInPeriod({
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      entryDate: input.entryDate,
    });

    return await gateway.updateEntry({
      companyId: input.companyId,
      entryId: input.entryId,
      entryDate: input.entryDate,
      hours: input.hours,
      projectId: input.projectId,
      taskLabel: input.taskLabel,
      note: input.note,
    });
  };
};
