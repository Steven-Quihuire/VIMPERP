import { describe, expect, it } from 'vitest';

import type {
  Employee,
  HrEmployeesGateway,
  ScopeNodeRecord,
} from '../../domain/employees';
import { HrEmployeesScopeNotFoundError } from '../../domain/employees';
import type { EmployeeAssignment } from '../../domain/employee-assignments';
import { PositionNotFoundError, type Position } from '../../domain/positions';
import { createCreateEmployeeUseCase } from '../create-employee';

class InMemoryHrEmployeesGateway implements HrEmployeesGateway {
  employees: Employee[] = [
    {
      id: 'employee-1',
      companyId: 'company-1',
      fullName: 'People Lead',
      documentType: null,
      documentNumber: null,
      email: null,
      employmentStatus: 'active',
      hiredAt: null,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
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
      reportsToPositionId: null,
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

  lastCreateAssignmentInput: Parameters<
    HrEmployeesGateway['createAssignment']
  >[0] | null = null;
  lastUpdatePositionReportsToInput: {
    companyId: string;
    positionId: string;
    reportsToPositionId: string;
  } | null = null;

  createEmployee(input: {
    companyId: string;
    fullName?: string;
    documentType?: string | null;
    documentNumber?: string | null;
    email?: string | null;
    employmentStatus?: Employee['employmentStatus'];
    hiredAt?: string | null;
  }) {
    const employee: Employee = {
      id: 'employee-new',
      companyId: input.companyId,
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      documentType: input.documentType ?? null,
      documentNumber: input.documentNumber ?? null,
      email: input.email ?? null,
      employmentStatus: input.employmentStatus ?? 'active',
      hiredAt: input.hiredAt ?? null,
      createdAt: new Date('2026-08-13T11:00:00.000Z'),
    };
    this.employees.push(employee);
    return Promise.resolve(employee);
  }

  updateEmployee(): Promise<Employee | null> {
    throw new Error('not implemented');
  }

  getEmployeeById(companyId: string, employeeId: string) {
    return Promise.resolve(
      this.employees.find(
        (employee) =>
          employee.companyId === companyId && employee.id === employeeId,
      ) ?? null,
    );
  }

  deleteEmployee(): Promise<null> {
    return Promise.resolve(null);
  }

  listEmployees(companyId: string) {
    return Promise.resolve(
      this.employees.filter((employee) => employee.companyId === companyId),
    );
  }

  createPosition(): Promise<Position> {
    throw new Error('not implemented');
  }

  getPositionById(companyId: string, positionId: string) {
    return Promise.resolve(
      this.positions.find(
        (position) =>
          position.companyId === companyId && position.id === positionId,
      ) ?? null,
    );
  }

  listPositions(companyId: string) {
    return Promise.resolve(
      this.positions.filter((position) => position.companyId === companyId),
    );
  }

  async updatePositionReportsTo(
    companyId: string,
    positionId: string,
    reportsToPositionId: string,
  ) {
    this.lastUpdatePositionReportsToInput = {
      companyId,
      positionId,
      reportsToPositionId,
    };
    const position = await this.getPositionById(companyId, positionId);
    if (position) {
      position.reportsToPositionId = reportsToPositionId;
    }
    return position;
  }

  countActivePrimaryAssignmentsForPosition(positionId: string) {
    return Promise.resolve(
      this.assignments.filter(
        (assignment) =>
          assignment.positionId === positionId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ).length,
    );
  }

  findScopeNode(companyId: string, scopeNodeId: string) {
    return Promise.resolve(
      this.scopeNodes.find(
        (scopeNode) =>
          scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null,
    );
  }

  createAssignment(input: Parameters<HrEmployeesGateway['createAssignment']>[0]) {
    this.lastCreateAssignmentInput = input;
    return Promise.resolve({
      id: 'assignment-2',
      companyId: input.companyId,
      employeeId: input.employeeId,
      scopeNodeId: input.scopeNodeId,
      positionId: input.positionId,
      startedAt: input.startedAt,
      endedAt: null,
      isPrimary: input.isPrimary,
      createdAt: input.createdAt,
    } satisfies EmployeeAssignment);
  }

  listAssignmentHistory(companyId: string, employeeId: string) {
    return Promise.resolve(
      this.assignments
        .filter(
          (assignment) =>
            assignment.companyId === companyId &&
            assignment.employeeId === employeeId,
        )
        .map((assignment) => ({
          ...assignment,
          positionName:
            this.positions.find((position) => position.id === assignment.positionId)
              ?.name ?? '',
          scopeNodeName:
            this.scopeNodes.find((node) => node.id === assignment.scopeNodeId)
              ?.name ?? '',
        })),
    );
  }

  getActivePrimaryAssignmentByEmployeeId(
    companyId: string,
    employeeId: string,
  ) {
    return Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.employeeId === employeeId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null,
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
      ) ?? null,
    );
  }

  listDirectReportAssignments(companyId: string, managerPositionId: string) {
    const directReportPositionIds = this.positions
      .filter(
        (position) =>
          position.companyId === companyId &&
          position.reportsToPositionId === managerPositionId,
      )
      .map((position) => position.id);

    return Promise.resolve(
      this.assignments.filter(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.isPrimary &&
          assignment.endedAt === null &&
          directReportPositionIds.includes(assignment.positionId),
      ),
    );
  }
}

describe('createCreateEmployeeUseCase', () => {
  it('creates the employee and the initial primary assignment with the company scope by default', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createEmployee = createCreateEmployeeUseCase({
      gateway,
      now: () => new Date('2026-08-13T11:00:00.000Z'),
      createId: () => 'employee-new',
    });

    const employee = await createEmployee({
      companyId: 'company-1',
      fullName: 'Ana Nuevo Ingreso',
      documentType: null,
      documentNumber: null,
      email: 'ana@example.com',
      employmentStatus: 'active',
      hiredAt: '2026-08-13',
      positionId: 'position-2',
      scopeNodeId: null,
      managerId: null,
    });

    expect(employee).toMatchObject({ id: 'employee-new', companyId: 'company-1' });
    expect(gateway.lastCreateAssignmentInput).toMatchObject({
      employeeId: 'employee-new',
      positionId: 'position-2',
      scopeNodeId: 'company:company-1',
      startedAt: new Date('2026-08-13T00:00:00.000Z'),
      isPrimary: true,
    });
  });

  it('derives reportsToPositionId from the manager when the position has none', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createEmployee = createCreateEmployeeUseCase({
      gateway,
      now: () => new Date('2026-08-13T11:00:00.000Z'),
      createId: () => 'employee-new',
    });

    await createEmployee({
      companyId: 'company-1',
      fullName: 'Ana Nuevo Ingreso',
      documentType: null,
      documentNumber: null,
      email: null,
      employmentStatus: 'active',
      hiredAt: null,
      positionId: 'position-2',
      scopeNodeId: 'company:company-1',
      managerId: 'employee-1',
    });

    expect(gateway.lastUpdatePositionReportsToInput).toEqual({
      companyId: 'company-1',
      positionId: 'position-2',
      reportsToPositionId: 'position-1',
    });
    expect(gateway.positions.find((position) => position.id === 'position-2')?.reportsToPositionId).toBe(
      'position-1',
    );
  });

  it('skips the initial assignment when no position is provided', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createEmployee = createCreateEmployeeUseCase({
      gateway,
      now: () => new Date('2026-08-13T11:00:00.000Z'),
      createId: () => 'employee-new',
    });

    const employee = await createEmployee({
      companyId: 'company-1',
      fullName: 'Ana Nuevo Ingreso',
      documentType: null,
      documentNumber: null,
      email: null,
      employmentStatus: 'active',
      hiredAt: null,
      positionId: null,
      scopeNodeId: null,
      managerId: null,
    });

    expect(employee.id).toBe('employee-new');
    expect(gateway.lastCreateAssignmentInput).toBeNull();
  });

  it('rejects when the initial position does not exist', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createEmployee = createCreateEmployeeUseCase({ gateway });

    await expect(
      createEmployee({
        companyId: 'company-1',
        fullName: 'Ana Nuevo Ingreso',
        documentType: null,
        documentNumber: null,
        email: null,
        employmentStatus: 'active',
        hiredAt: null,
        positionId: 'position-missing',
        scopeNodeId: 'company:company-1',
        managerId: null,
      }),
    ).rejects.toBeInstanceOf(PositionNotFoundError);
  });

  it('rejects when the initial scope node does not exist', async () => {
    const gateway = new InMemoryHrEmployeesGateway();
    const createEmployee = createCreateEmployeeUseCase({ gateway });

    await expect(
      createEmployee({
        companyId: 'company-1',
        fullName: 'Ana Nuevo Ingreso',
        documentType: null,
        documentNumber: null,
        email: null,
        employmentStatus: 'active',
        hiredAt: null,
        positionId: 'position-2',
        scopeNodeId: 'scope-missing',
        managerId: null,
      }),
    ).rejects.toBeInstanceOf(HrEmployeesScopeNotFoundError);
  });
});