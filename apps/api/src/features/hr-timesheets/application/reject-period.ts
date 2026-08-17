import {
  TimesheetPeriodNotFoundError,
  assertCanRejectPeriod,
  type TimesheetGateway,
} from '../domain/timesheets';

export const createRejectPeriodUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    rejectionReason: string;
  }) => {
    const period = await gateway.getPeriod(input.companyId, input.periodId);

    if (!period) {
      throw new TimesheetPeriodNotFoundError();
    }

    assertCanRejectPeriod(period, input.rejectionReason);

    return await gateway.rejectPeriod(input);
  };
};
