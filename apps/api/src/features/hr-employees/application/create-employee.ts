import {
  assertValidEmployeeIdentity,
  type EmployeeIdentityInput,
  type HrEmployeesGateway,
} from '../domain/employees';

export const createCreateEmployeeUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (input: { companyId: string } & EmployeeIdentityInput) => {
    assertValidEmployeeIdentity(input);
    return await gateway.createEmployee(input);
  };
};
