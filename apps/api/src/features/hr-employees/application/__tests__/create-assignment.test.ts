import { describe, expect, it } from 'vitest';

import type {
  Employee,
  HrEmployeesGateway,
  ScopeNodeRecord,
} from '../../domain/employees';
import { EmployeeAssignmentConflictError } from '../../domain/employee-assignments';
import type { EmployeeAssignment } from '../../domain/employee-assignments';
import type { Position } from '../../domain/positions';
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
      isActive: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
    {
      id: 'position-2',
      companyId: 'company-1',
      name: 'HR Analyst',
      reportsToPositionId: 'position-1',
      headcount: 2,
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

  async createEmployee(_input: { companyId: string }) {
    throw new Error('not implemented');
  }

  async updateEmployee(_companyId: string, _employeeId: string) {
    throw new Error('not implemented');
  }

  async getEmployeeById(companyId: string, employeeId: string) {
    return (
      this.employees.find(
        (employee) => employee.companyId === companyId && employee.id === employeeId,
      ) ?? null
    );
  }

  async listEmployees(companyId: string) {
    return this.employees.filter((employee) => employee.companyId === companyId);
  }

  async createPosition(_input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) {
    throw new Error('not implemented');
  }

  async getPositionById(companyId: string, positionId: string) {
    return (
      this.positions.find(
        (position) => position.companyId === companyId && position.id === positionId,
      ) ?? null
    );
  }

  async listPositions(companyId: string) {
    return this.positions.filter((position) => position.companyId === companyId);
  }

  async countActivePrimaryAssignmentsForPosition(positionId: string) {
    return this.assignments.filter(
      (assignment) => assignment.positionId === positionId && assignment.isPrimary && assignment.endedAt === null,
    ).length;
  }

  async findScopeNode(companyId: string, scopeNodeId: string) {
    return (
      this.scopeNodes.find(
        (scopeNode) => scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null
    );
  }

  async createAssignment(input: Parameters<HrEmployeesGateway['createAssignment']>[0]) {
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
    return created;
  }

  async getActivePrimaryAssignmentByEmployeeId(companyId: string, employeeId: string) {
    return (
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.employeeId === employeeId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null
    );
  }

  async getActivePrimaryAssignmentByPositionId(companyId: string, positionId: string) {
    return (
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.positionId === positionId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null
    );
  }

  async listDirectReportAssignments(companyId: string, managerPositionId: string) {
    const directReportPositionIds = this.positions
      .filter(
        (position) =>
          position.companyId === companyId && position.reportsToPositionId === managerPositionId,
      )
      .map((position) => position.id);

    return this.assignments.filter(
      (assignment) =>
        assignment.companyId === companyId &&
        assignment.isPrimary &&
        assignment.endedAt === null &&
        directReportPositionIds.includes(assignment.positionId),
    );
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
});
