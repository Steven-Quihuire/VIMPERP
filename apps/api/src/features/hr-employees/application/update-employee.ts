import {
  assertValidEmployeeIdentity,
  EmployeeNotFoundError,
  type EmployeeIdentityInput,
  type HrEmployeesGateway,
} from '../domain/employees';

export const createUpdateEmployeeUseCase = ({
  gateway,
}: {
  gateway: HrEmployeesGateway;
}) => {
  return async (
    input: { companyId: string; employeeId: string } & Partial<EmployeeIdentityInput>,
  ) => {
    const current = await gateway.getEmployeeById(input.companyId, input.employeeId);

    if (!current) {
      throw new EmployeeNotFoundError();
    }

    const identity: EmployeeIdentityInput = {
      fullName: input.fullName ?? current.fullName ?? '',
      documentType: input.documentType ?? current.documentType ?? null,
      documentNumber: input.documentNumber ?? current.documentNumber ?? null,
      email: input.email ?? current.email ?? null,
      employmentStatus: input.employmentStatus ?? current.employmentStatus ?? 'active',
      hiredAt: input.hiredAt ?? current.hiredAt ?? null,
    };

    assertValidEmployeeIdentity(identity);

    return await gateway.updateEmployee(input.companyId, input.employeeId, identity);
  };
};
