import {
  assertValidEmployeeDocument,
  assertValidEmployeeIdentity,
  HrEmployeesScopeNotFoundError,
  type EmployeeIdentityInput,
  type HrEmployeesGateway,
} from '../domain/employees';
import {
  assertValidPositionHierarchy,
  PositionNotFoundError,
} from '../domain/positions';

export type CreateEmployeeWithAssignmentInput = {
  companyId: string;
  positionId?: string | null;
  scopeNodeId?: string | null;
  managerId?: string | null;
} & EmployeeIdentityInput;

export const createCreateEmployeeUseCase = ({
  gateway,
  now = () => new Date(),
  createId,
}: {
  gateway: HrEmployeesGateway;
  now?: () => Date;
  createId?: () => string;
}) => {
  return async (input: CreateEmployeeWithAssignmentInput) => {
    assertValidEmployeeIdentity(input);
    assertValidEmployeeDocument(input.documentType, input.documentNumber);

    const employee = await gateway.createEmployee(input);

    if (!input.positionId) {
      return employee;
    }

    const position = await gateway.getPositionById(
      input.companyId,
      input.positionId,
    );
    if (!position) {
      throw new PositionNotFoundError();
    }

    const scopeNodeId = input.scopeNodeId ?? `company:${input.companyId}`;
    const scopeNode = await gateway.findScopeNode(input.companyId, scopeNodeId);
    if (!scopeNode) {
      throw new HrEmployeesScopeNotFoundError();
    }

    if (input.managerId && !position.reportsToPositionId) {
      const managerAssignment =
        await gateway.getActivePrimaryAssignmentByEmployeeId(
          input.companyId,
          input.managerId,
        );
      if (managerAssignment && managerAssignment.positionId !== position.id) {
        assertValidPositionHierarchy({
          positionId: position.id,
          reportsToPositionId: managerAssignment.positionId,
        });
        await gateway.updatePositionReportsTo(
          input.companyId,
          position.id,
          managerAssignment.positionId,
        );
      }
    }

    const startedAt = input.hiredAt
      ? new Date(`${input.hiredAt}T00:00:00.000Z`)
      : now();

    await gateway.createAssignment({
      companyId: input.companyId,
      employeeId: employee.id,
      scopeNodeId,
      positionId: position.id,
      startedAt,
      isPrimary: true,
      createdAt: now(),
      ...(createId ? { id: createId() } : {}),
    });

    return employee;
  };
};