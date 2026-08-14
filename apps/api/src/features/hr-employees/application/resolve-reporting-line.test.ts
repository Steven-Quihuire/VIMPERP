import { describe, expect, it } from 'vitest';

import type { HrEmployeesGateway } from '../domain/employees';
import { createResolveReportingLineUseCase } from './resolve-reporting-line';

const createGateway = (): HrEmployeesGateway => ({
  createEmployee: async () => ({
    id: 'employee-1',
    companyId: 'company-1',
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  }),
  updateEmployee: async () => null,
  getEmployeeById: async (companyId, employeeId) =>
    employeeId === 'employee-1'
      ? {
          id: employeeId,
          companyId,
          createdAt: new Date('2026-08-13T10:00:00.000Z'),
        }
      : null,
  listEmployees: async () => [],
  createPosition: async () => ({
    id: 'position-1',
    companyId: 'company-1',
    name: 'People Lead',
    reportsToPositionId: null,
    headcount: 1,
    occupiedHeadcount: 0,
    remainingVacancies: 1,
    isActive: true,
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  }),
  getPositionById: async (_companyId, positionId) => {
    if (positionId === 'position-employee') {
      return {
        id: 'position-employee',
        companyId: 'company-1',
        name: 'HR Analyst',
        reportsToPositionId: 'position-manager',
    headcount: 1,
    occupiedHeadcount: 0,
    remainingVacancies: 1,
        isActive: true,
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      };
    }

    if (positionId === 'position-manager') {
      return {
        id: 'position-manager',
        companyId: 'company-1',
        name: 'People Lead',
        reportsToPositionId: null,
        headcount: 1,
        occupiedHeadcount: 0,
        remainingVacancies: 1,
        isActive: true,
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      };
    }

    return null;
  },
  listPositions: async () => [],
  countActivePrimaryAssignmentsForPosition: async () => 0,
  findScopeNode: async () => null,
  createAssignment: async () => ({
    id: 'assignment-1',
    companyId: 'company-1',
    employeeId: 'employee-1',
    scopeNodeId: 'company:company-1',
    positionId: 'position-employee',
    startedAt: new Date('2026-08-13T10:00:00.000Z'),
    endedAt: null,
    isPrimary: true,
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  }),
  listAssignmentHistory: async () => [],
  getActivePrimaryAssignmentByEmployeeId: async (_companyId, employeeId) => {
    if (employeeId === 'employee-1') {
      return {
        id: 'assignment-employee',
        companyId: 'company-1',
        employeeId: 'employee-1',
        scopeNodeId: 'area:area-1',
        positionId: 'position-employee',
        startedAt: new Date('2026-08-13T10:00:00.000Z'),
        endedAt: null,
        isPrimary: true,
        createdAt: new Date('2026-08-13T10:00:00.000Z'),
      };
    }

    return null;
  },
  getActivePrimaryAssignmentByPositionId: async () => null,
  listDirectReportAssignments: async () => [],
});

describe('createResolveReportingLineUseCase', () => {
  it('returns null when the parent position is vacant instead of treating org-node responsibility as the direct manager', async () => {
    const gateway = createGateway();
    const resolveReportingLine = createResolveReportingLineUseCase({ gateway });

    await expect(
      resolveReportingLine({ companyId: 'company-1', employeeId: 'employee-1' }),
    ).resolves.toBeNull();
  });
});
