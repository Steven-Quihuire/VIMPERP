import type { HrEmployeesGateway } from '../domain/employees';

export const createListAssignmentHistoryUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string; employeeId: string }) =>
    await gateway.listAssignmentHistory(input.companyId, input.employeeId);
};
