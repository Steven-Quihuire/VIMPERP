import type { HrEmployeesGateway } from '../domain/employees';

export const createListEmployeesUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string }) => {
    return await gateway.listEmployees(input.companyId);
  };
};
