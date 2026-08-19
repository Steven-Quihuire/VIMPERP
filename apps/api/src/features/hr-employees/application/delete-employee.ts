import {
  EmployeeNotFoundError,
  type HrEmployeesGateway,
} from '../domain/employees';

export const createDeleteEmployeeUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string; employeeId: string }) => {
    const existing = await gateway.getEmployeeById(
      input.companyId,
      input.employeeId,
    );

    if (!existing) {
      throw new EmployeeNotFoundError();
    }

    const deleted = await gateway.deleteEmployee(
      input.companyId,
      input.employeeId,
    );

    return deleted;
  };
};
