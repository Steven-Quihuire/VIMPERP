import {
  TimesheetPeriodNotFoundError,
  assertTimesheetIsDraft,
  assertValidPeriodRange,
  type TimesheetGateway,
} from '../domain/timesheets';

export const createPatchPeriodUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    periodStart: string;
    periodEnd: string;
  }) => {
    assertValidPeriodRange(input);

    const period = await gateway.getPeriod(input.companyId, input.periodId);

    if (!period) {
      throw new TimesheetPeriodNotFoundError();
    }

    assertTimesheetIsDraft(period);

    return await gateway.patchPeriod(input);
  };
};
