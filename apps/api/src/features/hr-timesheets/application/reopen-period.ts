import {
  TimesheetPeriodNotFoundError,
  assertCanReopenPeriod,
  type TimesheetGateway,
} from '../domain/timesheets';

export const createReopenPeriodUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: { companyId: string; periodId: string }) => {
    const period = await gateway.getPeriod(input.companyId, input.periodId);

    if (!period) {
      throw new TimesheetPeriodNotFoundError();
    }

    assertCanReopenPeriod(period);

    return await gateway.reopenPeriod(input);
  };
};
