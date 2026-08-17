import {
  TimesheetEntryNotFoundError,
  TimesheetPeriodNotFoundError,
  assertTimesheetIsDraft,
  type TimesheetGateway,
} from '../../domain/timesheets';

export const createRemoveEntryUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    entryId: string;
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

    const deleted = await gateway.deleteEntry(input.companyId, input.entryId);

    if (!deleted) {
      throw new TimesheetEntryNotFoundError();
    }
  };
};
