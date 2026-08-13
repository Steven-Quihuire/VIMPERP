import type { HrEmployeesGateway } from '../domain/employees';

export const createGetEmployeeUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string; employeeId: string }) => {
    return await gateway.getEmployeeById(input.companyId, input.employeeId);
  };
};
