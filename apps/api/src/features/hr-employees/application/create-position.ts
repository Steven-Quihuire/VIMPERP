import type { HrEmployeesGateway } from '../domain/employees';
import {
  assertValidPositionHierarchy,
  calculatePositionVacancy,
  PositionParentNotFoundError,
} from '../domain/positions';

export const createCreatePositionUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) => {
    assertValidPositionHierarchy({
      positionId: 'new-position',
      reportsToPositionId: input.reportsToPositionId,
    });
    calculatePositionVacancy({ headcount: input.headcount, activePrimaryAssignments: 0 });

    if (
      input.reportsToPositionId !== null &&
      !(await gateway.getPositionById(input.companyId, input.reportsToPositionId))
    ) {
      throw new PositionParentNotFoundError();
    }

    return await gateway.createPosition(input);
  };
};
