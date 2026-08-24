import type { HrEmployeesGateway } from '../domain/employees';

export const createListAssignmentsUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string }) =>
    await gateway.listActivePrimaryAssignments(input.companyId);
};
