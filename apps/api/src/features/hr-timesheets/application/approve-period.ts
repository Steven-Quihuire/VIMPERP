import {
  TimesheetPeriodNotFoundError,
  assertCanApprovePeriod,
  type TimesheetGateway,
} from '../domain/timesheets';

export const createApprovePeriodUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: TimesheetGateway;
  now?: () => Date;
}) => {
  return async (input: {
    companyId: string;
    periodId: string;
    approvedByUserId: string;
  }) => {
    const period = await gateway.getPeriod(input.companyId, input.periodId);

    if (!period) {
      throw new TimesheetPeriodNotFoundError();
    }

    assertCanApprovePeriod(period, input.approvedByUserId);

    return await gateway.approvePeriod({
      companyId: input.companyId,
      periodId: input.periodId,
      approvedByUserId: input.approvedByUserId,
      at: now(),
    });
  };
};
