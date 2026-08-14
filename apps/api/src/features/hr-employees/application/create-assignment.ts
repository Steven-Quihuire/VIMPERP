import {
  EmployeeNotFoundError,
  HrEmployeesScopeNotFoundError,
  type HrEmployeesGateway,
} from '../domain/employees';
import {
  EmployeeAssignmentConflictError,
  EmployeeAssignmentValidationError,
} from '../domain/employee-assignments';
import {
  PositionHeadcountExceededError,
  PositionNotFoundError,
  calculatePositionVacancy,
} from '../domain/positions';

export const createCreateAssignmentUseCase = ({
  gateway,
  now = () => new Date(),
  createId,
}: {
  gateway: HrEmployeesGateway;
  now?: () => Date;
  createId?: () => string;
}) => {
  return async (input: {
    companyId: string;
    employeeId: string;
    scopeNodeId: string;
    positionId: string;
    startedAt: Date;
  }) => {
    const [employee, position, scopeNode, currentAssignment] = await Promise.all([
      gateway.getEmployeeById(input.companyId, input.employeeId),
      gateway.getPositionById(input.companyId, input.positionId),
      gateway.findScopeNode(input.companyId, input.scopeNodeId),
      gateway.getActivePrimaryAssignmentByEmployeeId(input.companyId, input.employeeId),
    ]);

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    if (!position) {
      throw new PositionNotFoundError();
    }

    if (!scopeNode) {
      throw new HrEmployeesScopeNotFoundError();
    }

    if (
      currentAssignment &&
      currentAssignment.positionId === input.positionId &&
      currentAssignment.scopeNodeId === input.scopeNodeId &&
      currentAssignment.startedAt.getTime() === input.startedAt.getTime()
    ) {
      throw new EmployeeAssignmentConflictError();
    }

    if (currentAssignment && input.startedAt.getTime() <= currentAssignment.startedAt.getTime()) {
      throw new EmployeeAssignmentValidationError(
        'An assignment must start after the current primary assignment.',
      );
    }

    const activePrimaryAssignments = await gateway.countActivePrimaryAssignmentsForPosition(
      input.positionId,
    );

    try {
      calculatePositionVacancy({
        headcount: position.headcount,
        activePrimaryAssignments:
          currentAssignment?.positionId === input.positionId
            ? activePrimaryAssignments
            : activePrimaryAssignments + 1,
      });
    } catch (error) {
      if (error instanceof PositionHeadcountExceededError) {
        throw error;
      }
      throw error;
    }

    return await gateway.createAssignment({
      companyId: input.companyId,
      employeeId: input.employeeId,
      scopeNodeId: input.scopeNodeId,
      positionId: input.positionId,
      startedAt: input.startedAt,
      isPrimary: true,
      createdAt: now(),
      ...(createId ? { id: createId() } : {}),
    });
  };
};
