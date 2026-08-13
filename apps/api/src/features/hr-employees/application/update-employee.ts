import type { HrEmployeesGateway } from '../domain/employees';

export const createUpdateEmployeeUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string; employeeId: string }) => {
    return await gateway.updateEmployee(input.companyId, input.employeeId);
  };
};
