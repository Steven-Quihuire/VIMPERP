import { describe, expect, it } from 'vitest';

import type { HrEmployeesGateway } from '../../hr-employees/domain/employees';
import type { ErpAccessGateway } from '../../hr-erp-access/domain/erp-access-invitations';
import { createEvaluateReportingLineScopes } from './evaluate-reporting-line-scopes';

const createHrEmployeesGateway = (): HrEmployeesGateway => ({
  createEmployee: async () => ({
    id: 'employee-1',
    companyId: 'company-1',
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  }),
  updateEmployee: async () => null,
  getEmployeeById: async () => null,
  listEmployees: async () => [],
  createPosition: async () => ({
    id: 'position-1',
    companyId: 'company-1',
    name: 'Lead',
    reportsToPositionId: null,
    headcount: 1,
    occupiedHeadcount: 0,
    remainingVacancies: 1,
    isActive: true,
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  }),
  getPositionById: async () => null,
  listPositions: async () => [],
  countActivePrimaryAssignmentsForPosition: async () => 0,
  findScopeNode: async () => null,
  createAssignment: async () => ({
    id: 'assignment-1',
    companyId: 'company-1',
    employeeId: 'employee-1',
    scopeNodeId: 'company:company-1',
    positionId: 'position-1',
    startedAt: new Date('2026-08-13T10:00:00.000Z'),
    endedAt: null,
    isPrimary: true,
    createdAt: new Date('2026-08-13T10:00:00.000Z'),
  }),
  getActivePrimaryAssignmentByEmployeeId: async (_companyId, employeeId) =>
    employeeId === 'employee-1'
      ? {
          id: 'assignment-actor',
          companyId: 'company-1',
          employeeId: 'employee-1',
          scopeNodeId: 'company:company-1',
          positionId: 'position-manager',
          startedAt: new Date('2026-08-13T10:00:00.000Z'),
          endedAt: null,
          isPrimary: true,
          createdAt: new Date('2026-08-13T10:00:00.000Z'),
        }
      : null,
  getActivePrimaryAssignmentByPositionId: async () => null,
  listDirectReportAssignments: async () => [
    {
      id: 'assignment-direct-1',
      companyId: 'company-1',
      employeeId: 'employee-2',
      scopeNodeId: 'company:company-1',
      positionId: 'position-report-1',
      startedAt: new Date('2026-08-13T10:00:00.000Z'),
      endedAt: null,
      isPrimary: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
    {
      id: 'assignment-direct-2',
      companyId: 'company-1',
      employeeId: 'employee-3',
      scopeNodeId: 'company:company-1',
      positionId: 'position-report-2',
      startedAt: new Date('2026-08-13T10:00:00.000Z'),
      endedAt: null,
      isPrimary: true,
      createdAt: new Date('2026-08-13T10:00:00.000Z'),
    },
  ],
});

const createErpAccessGateway = (): ErpAccessGateway => ({
  getEmployeeById: async () => null,
  createInvitation: async () => {
    throw new Error('not implemented');
  },
  listPendingInvitationsByCompany: async () => [],
  findInvitationByTokenHash: async () => null,
  findUserByEmail: async () => null,
  findUserByIdentifier: async () => null,
  findUserMemberships: async () => [],
  getActiveLinkByEmployeeId: async () => null,
  getActiveLinkByUserId: async (_companyId, userId) =>
    userId === 'user-1'
      ? {
          id: 'link-1',
          companyId: 'company-1',
          employeeId: 'employee-1',
          userId: 'user-1',
          isActive: true,
          createdAt: new Date('2026-08-13T10:00:00.000Z'),
          revokedAt: null,
        }
      : null,
  acceptInvitation: async () => {},
  revokeAccess: async () => {},
});

describe('createEvaluateReportingLineScopes', () => {
  it('returns only the actor employee for the self scope', async () => {
    const evaluateReportingLineScopes = createEvaluateReportingLineScopes({
      hrEmployeesGateway: createHrEmployeesGateway(),
      erpAccessGateway: createErpAccessGateway(),
    });

    await expect(
      evaluateReportingLineScopes({
        companyId: 'company-1',
        userId: 'user-1',
        currentContext: { kind: 'self' },
      }),
    ).resolves.toEqual({
      employeeIds: ['employee-1'],
      permissionKeys: ['hr.employees.read'],
    });
  });

  it('returns only direct reports and excludes deeper descendants for the direct_reports scope', async () => {
    const evaluateReportingLineScopes = createEvaluateReportingLineScopes({
      hrEmployeesGateway: createHrEmployeesGateway(),
      erpAccessGateway: createErpAccessGateway(),
    });

    await expect(
      evaluateReportingLineScopes({
        companyId: 'company-1',
        userId: 'user-1',
        currentContext: { kind: 'direct_reports' },
      }),
    ).resolves.toEqual({
      employeeIds: ['employee-2', 'employee-3'],
      permissionKeys: ['hr.employees.read'],
    });
  });
});
