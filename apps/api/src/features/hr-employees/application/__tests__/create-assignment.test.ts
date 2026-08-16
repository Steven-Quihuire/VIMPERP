import { describe, expect, it } from 'vitest';

import type {
  Employee,
  HrEmployeesGateway,
  ScopeNodeRecord,
} from '../../domain/employees';
import { EmployeeAssignmentConflictError } from '../../domain/employee-assignments';
import type { EmployeeAssignment } from '../../domain/employee-assignments';
import { PositionHeadcountExceededError, type Position } from '../../domain/positions';
import { createCreateAssignmentUseCase } from '../create-assignment';

class InMemoryHrEmployeesGateway implements HrEmployeesGateway {
  employees: Employee[] = [
    { id: 'employee-1', companyId: 'company-1', createdAt: new Date('2026-08-13T10:00:00.000Z') },
    { id: 'employee-2', companyId: 'company-1', createdAt: new Date('2026-08-13T10:00:00.000Z') },
  ];

  positions: Position[] = [
    {
      id: 'position-1',
      companyId: 'company-1',
      name: 'People Lead',
      reportsToPositionId: null,
      headcount: 2,
      occupiedHeadcount: 1,
      remainingVacancies: 1,
      isActive: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
    {
      id: 'position-2',
      companyId: 'company-1',
      name: 'HR Analyst',
      reportsToPositionId: 'position-1',
      headcount: 2,
      occupiedHeadcount: 0,
      remainingVacancies: 2,
      isActive: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
  ];

  assignments: EmployeeAssignment[] = [
    {
      id: 'assignment-1',
      companyId: 'company-1',
      employeeId: 'employee-1',
      scopeNodeId: 'company:company-1',
      positionId: 'position-1',
      startedAt: new Date('2026-08-13T10:00:00.000Z'),
      endedAt: null,
      isPrimary: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
  ];

  scopeNodes: ScopeNodeRecord[] = [
    {
      id: 'company:company-1',
      companyId: 'company-1',
      nodeType: 'company',
      sourceId: 'company-1',
      parentScopeNodeId: null,
      name: 'Vimcore',
    },
  ];

  lastCreateAssignmentInput: Parameters<HrEmployeesGateway['createAssignment']>[0] | null = null;

  createEmployee(_input: { companyId: string }): Promise<Employee> {
    throw new Error('not implemented');
  }

  updateEmployee(_companyId: string, _employeeId: string): Promise<Employee | null> {
    throw new Error('not implemented');
  }

  getEmployeeById(companyId: string, employeeId: string) {
    return Promise.resolve(
      this.employees.find(
        (employee) => employee.companyId === companyId && employee.id === employeeId,
      ) ?? null
    );
  }

  listEmployees(companyId: string) {
    return Promise.resolve(this.employees.filter((employee) => employee.companyId === companyId));
  }

  createPosition(_input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }): Promise<Position> {
    throw new Error('not implemented');
  }

  getPositionById(companyId: string, positionId: string) {
    return Promise.resolve(
      this.positions.find(
        (position) => position.companyId === companyId && position.id === positionId,
      ) ?? null
    );
  }

  listPositions(companyId: string) {
    return Promise.resolve(this.positions.filter((position) => position.companyId === companyId));
  }

  countActivePrimaryAssignmentsForPosition(positionId: string) {
    return Promise.resolve(this.assignments.filter(
      (assignment) => assignment.positionId === positionId && assignment.isPrimary && assignment.endedAt === null,
    ).length);
  }

  findScopeNode(companyId: string, scopeNodeId: string) {
    return Promise.resolve(
      this.scopeNodes.find(
        (scopeNode) => scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null
    );
  }

  createAssignment(input: Parameters<HrEmployeesGateway['createAssignment']>[0]) {
    this.lastCreateAssignmentInput = input;

    const existingActivePrimary = this.assignments.find(
      (assignment) =>
        assignment.companyId === input.companyId &&
        assignment.employeeId === input.employeeId &&
        assignment.isPrimary &&
        assignment.endedAt === null,
    );

    if (
      existingActivePrimary &&
      existingActivePrimary.positionId === input.positionId &&
      existingActivePrimary.scopeNodeId === input.scopeNodeId
    ) {
      throw new EmployeeAssignmentConflictError();
    }

    if (existingActivePrimary) {
      existingActivePrimary.endedAt = input.startedAt;
    }

    const created: EmployeeAssignment = {
      id: 'assignment-2',
      companyId: input.companyId,
      employeeId: input.employeeId,
      scopeNodeId: input.scopeNodeId,
      positionId: input.positionId,
      startedAt: input.startedAt,
      endedAt: null,
      isPrimary: input.isPrimary,
      createdAt: input.createdAt,
    };

    this.assignments.push(created);
    return Promise.resolve(created);
  }

  listAssignmentHistory(companyId: string, employeeId: string) {
    return Promise.resolve(this.assignments
      .filter((assignment) => assignment.companyId === companyId && assignment.employeeId === employeeId)
      .map((assignment) => ({
        ...assignment,
        positionName: this.positions.find((position) => position.id === assignment.positionId)?.name ?? '',
        scopeNodeName: this.scopeNodes.find((node) => node.id === assignment.scopeNodeId)?.name ?? '',
      })));
  }

  getActivePrimaryAssignmentByEmployeeId(companyId: string, employeeId: string) {
    return Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.employeeId === employeeId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null
    );
  }

  getActivePrimaryAssignmentByPositionId(companyId: string, positionId: string) {
    return Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.positionId === positionId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null
    );
  }

  listDirectReportAssignments(companyId: string, managerPositionId: string) {
    const directReportPositionIds = this.positions
      .filter(
        (position) =>
          position.companyId === companyId && position.reportsToPositionId === managerPositionId,
      )
      .map((position) => position.id);

    return Promise.resolve(this.assignments.filter(
      (assignment) =>
        assignment.companyId === companyId &&
        assignment.isPrimary &&
        assignment.endedAt === null &&
        directReportPositionIds.includes(assignment.positionId),
    ));
  }
}

describe('createCreateAssignmentUseCase', () => {
  it('auto-closes the prior active primary assignment inside one write flow', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createAssignment = createCreateAssignmentUseCase({
      gateway,
      now: () => new Date('2026-08-13T11:00:00.000Z'),
      createId: () => 'assignment-2',
    });

    const created = await createAssignment({
      companyId: 'company-1',
      employeeId: 'employee-1',
      scopeNodeId: 'company:company-1',
      positionId: 'position-2',
      startedAt: new Date('2026-08-13T11:00:00.000Z'),
    });

    expect(created.id).toBe('assignment-2');
    expect(gateway.assignments[0]?.endedAt).toEqual(new Date('2026-08-13T11:00:00.000Z'));
    expect(gateway.lastCreateAssignmentInput).toMatchObject({
      employeeId: 'employee-1',
      positionId: 'position-2',
      scopeNodeId: 'company:company-1',
      isPrimary: true,
    });
  });

  it('returns conflict when the active primary assignment would be duplicated', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createAssignment = createCreateAssignmentUseCase({
      gateway,
      now: () => new Date('2026-08-13T11:00:00.000Z'),
      createId: () => 'assignment-2',
    });

    await expect(
      createAssignment({
        companyId: 'company-1',
        employeeId: 'employee-1',
        scopeNodeId: 'company:company-1',
        positionId: 'position-1',
        startedAt: new Date('2026-08-13T10:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(EmployeeAssignmentConflictError);
  });

  it('rejects a new assignment when the position has no remaining vacancy', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    gateway.positions[0]!.headcount = 1;
    const createAssignment = createCreateAssignmentUseCase({ gateway });

    await expect(
      createAssignment({
        companyId: 'company-1',
        employeeId: 'employee-2',
        scopeNodeId: 'company:company-1',
        positionId: 'position-1',
        startedAt: new Date('2026-08-13T11:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(PositionHeadcountExceededError);
  });

  it('rejects an assignment that starts before the current assignment', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createAssignment = createCreateAssignmentUseCase({ gateway });

    await expect(
      createAssignment({
        companyId: 'company-1',
        employeeId: 'employee-1',
        scopeNodeId: 'company:company-1',
        positionId: 'position-2',
        startedAt: new Date('2026-08-13T09:00:00.000Z'),
      }),
    ).rejects.toThrow('must start after');
  });

  it.each([
    ['missing employee', { employeeId: 'employee-missing', positionId: 'position-2', scopeNodeId: 'company:company-1' }],
    ['missing position', { employeeId: 'employee-2', positionId: 'position-missing', scopeNodeId: 'company:company-1' }],
    ['missing scope node', { employeeId: 'employee-2', positionId: 'position-2', scopeNodeId: 'scope-missing' }],
  ])('rejects a %s', async (_label, values) => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createAssignment = createCreateAssignmentUseCase({ gateway });

    await expect(
      createAssignment({
        companyId: 'company-1',
        ...values,
        startedAt: new Date('2026-08-13T12:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(Error);
  });
});
