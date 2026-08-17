import {
  TimesheetAssignmentNotFoundError,
  assertValidPeriodRange,
  type TimesheetGateway,
} from '../domain/timesheets';

export const createCreatePeriodUseCase = ({
  gateway,
}: {
  gateway: TimesheetGateway;
}) => {
  return async (input: {
    companyId: string;
    employeeAssignmentId: string;
    periodStart: string;
    periodEnd: string;
  }) => {
    assertValidPeriodRange(input);

    const assignment = await gateway.findActiveAssignment(
      input.companyId,
      input.employeeAssignmentId,
    );

    if (!assignment) {
      throw new TimesheetAssignmentNotFoundError();
    }

    return await gateway.createPeriod(input);
  };
};
