import { describe, expect, it } from 'vitest';

import { createInMemoryScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import { createComputeEffectivePermissionsUseCase } from './compute-effective-permissions';
import type { RoleAssignmentsGateway } from '../domain/assignments';
import type { RolesGateway } from '../domain/roles';

const rolesGateway: RolesGateway = {
  createRole: async () => {
    throw new Error('not implemented');
  },
  updateRole: async () => {
    throw new Error('not implemented');
  },
  deleteRole: async () => {
    throw new Error('not implemented');
  },
  listRoles: async () => [],
  findRoleById: async () => null,
  findRoleWithPermissions: async () => null,
  listRolePermissionRows: async (roleIds) =>
    [
      { roleId: 'role-subtree', permissionKey: 'catalog.read' },
      { roleId: 'role-exact', permissionKey: 'catalog.write' },
    ].filter((row) => roleIds.includes(row.roleId)),
  replaceRolePermissions: async () => {
    throw new Error('not implemented');
  },
  countAssignmentsForRole: async () => 0,
};

const assignmentsGateway: RoleAssignmentsGateway = {
  createAssignment: async () => {
    throw new Error('not implemented');
  },
  deleteAssignment: async () => {
    throw new Error('not implemented');
  },
  findAssignmentById: async () => null,
  listAssignmentsForUser: async () => [
    {
      id: 'assignment-subtree',
      companyId: 'company-a',
      userId: 'user-1',
      roleId: 'role-subtree',
      mode: 'subtree_inclusive',
      scopeType: 'division',
      scopeId: 'division-1',
      createdAt: new Date('2026-08-11T15:00:00.000Z'),
    },
    {
      id: 'assignment-exact',
      companyId: 'company-a',
      userId: 'user-1',
      roleId: 'role-exact',
      mode: 'exact_node',
      scopeType: 'warehouse',
      scopeId: 'warehouse-1',
      createdAt: new Date('2026-08-11T15:00:00.000Z'),
    },
  ],
  countAssignmentsForRole: async () => 0,
};

const scopeResolver = createInMemoryScopeResolver({
  nodes: [
    {
      ref: { scopeType: 'company', scopeId: 'company-a' },
      parentRef: null,
      companyId: 'company-a',
      name: 'Vimcore',
    },
    {
      ref: { scopeType: 'division', scopeId: 'division-1' },
      parentRef: { scopeType: 'company', scopeId: 'company-a' },
      companyId: 'company-a',
      name: 'North Division',
    },
    {
      ref: { scopeType: 'local', scopeId: 'local-1' },
      parentRef: { scopeType: 'division', scopeId: 'division-1' },
      companyId: 'company-a',
      name: 'HQ',
    },
    {
      ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
      parentRef: { scopeType: 'local', scopeId: 'local-1' },
      companyId: 'company-a',
      name: 'Main Warehouse',
    },
    {
      ref: { scopeType: 'point-of-sale', scopeId: 'pos-1' },
      parentRef: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
      companyId: 'company-a',
      name: 'Checkout',
    },
  ],
  assignments: [],
});

describe('createComputeEffectivePermissionsUseCase', () => {
  it('keeps subtree_inclusive assignments active for descendants', async () => {
    const computeEffectivePermissions = createComputeEffectivePermissionsUseCase({
      rolesGateway,
      assignmentsGateway,
      scopeHierarchyGateway: {
        assertScopeRefBelongsToCompany: async () => undefined,
        getScopeLineage: scopeResolver.getLineage,
      },
    });

    await expect(
      computeEffectivePermissions({
        companyId: 'company-a',
        userId: 'user-1',
        currentContext: {
          scopeType: 'warehouse',
          scopeId: 'warehouse-1',
        },
      }),
    ).resolves.toEqual(['catalog.read', 'catalog.write']);
  });

  it('blocks exact_node permissions when the active scope is only a descendant', async () => {
    const computeEffectivePermissions = createComputeEffectivePermissionsUseCase({
      rolesGateway,
      assignmentsGateway,
      scopeHierarchyGateway: {
        assertScopeRefBelongsToCompany: async () => undefined,
        getScopeLineage: scopeResolver.getLineage,
      },
    });

    await expect(
      computeEffectivePermissions({
        companyId: 'company-a',
        userId: 'user-1',
        currentContext: {
          scopeType: 'point-of-sale',
          scopeId: 'pos-1',
        },
      }),
    ).resolves.toEqual(['catalog.read']);
  });

  it('unions reporting-line permission keys for the direct_reports permission scope', async () => {
    const computeEffectivePermissions = createComputeEffectivePermissionsUseCase({
      rolesGateway,
      assignmentsGateway,
      scopeHierarchyGateway: {
        assertScopeRefBelongsToCompany: async () => undefined,
        getScopeLineage: scopeResolver.getLineage,
      },
      evaluateReportingLineScopes: async () => ({
        employeeIds: ['employee-2'],
        permissionKeys: ['hr.employees.read'],
      }),
    });

    await expect(
      computeEffectivePermissions({
        companyId: 'company-a',
        userId: 'user-1',
        currentContext: {
          scopeType: 'warehouse',
          scopeId: 'warehouse-1',
        },
        permissionScope: { kind: 'direct_reports' },
      }),
    ).resolves.toEqual(['catalog.read', 'catalog.write', 'hr.employees.read']);
  });
});
