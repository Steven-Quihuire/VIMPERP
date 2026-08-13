import type { HrEmployeesGateway } from '../domain/employees';

export const createCreateEmployeeUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string }) => {
    return await gateway.createEmployee({ companyId: input.companyId });
  };
};
