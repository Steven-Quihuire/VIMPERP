import { describe, expect, it } from 'vitest';

import { createDrizzleCompanyOnboardingGateway } from './drizzle-company.gateway';
import {
  auditEventsTable,
  companiesTable,
  companyProfilesTable,
  membershipsTable,
  notificationsTable,
  permissionsTable,
  privacyPolicyAcceptancesTable,
  roleAssignmentsTable,
  rolePermissionsTable,
  rolesTable,
} from '../../../shared/infrastructure/db/schema';
import type { AppDb } from '../../../shared/infrastructure/db/client';

const createFakeDb = ({ privacyPolicyAccepted = true } = {}) => {
  const writes: Array<{ table: unknown; values: unknown }> = [];
  const state = {
    permissions: [] as Array<{ id: string; key: string; family: string }>,
    roles: [] as Array<{ id: string; companyId: string; key: string; name: string; isSystem: boolean; createdAt: Date }>,
    rolePermissions: [] as Array<{ roleId: string; permissionId: string }>,
    roleAssignments: [] as Array<{ id: string; companyId: string; userId: string; roleId: string; scopeNodeId: string; scopeType: string; scopeId: string; createdAt: Date }>,
  };

  const rowsFor = (table: unknown) => {
    if (table === privacyPolicyAcceptancesTable) {
      return privacyPolicyAccepted ? [{ id: 'fixed-id' }] : [];
    }

    if (table === permissionsTable) {
      return state.permissions;
    }

    return [];
  };

  const createSelectQuery = (table: unknown) => {
    const rows = rowsFor(table);
    const builder = {
      where: () => builder,
      limit: () => Promise.resolve(rows),
      then: <TResult1 = unknown[], TResult2 = never>(
        onfulfilled?: ((value: unknown[]) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) => Promise.resolve(rows).then(onfulfilled, onrejected),
    };

    return builder;
  };

  const tx = {
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values });

        if (table === permissionsTable) {
          state.permissions.push(...(values as Array<{ id: string; key: string; family: string }>));
        }

        if (table === rolesTable) {
          state.roles.push(values as { id: string; companyId: string; key: string; name: string; isSystem: boolean; createdAt: Date });
        }

        if (table === rolePermissionsTable) {
          state.rolePermissions.push(...(values as Array<{ roleId: string; permissionId: string }>));
        }

        if (table === roleAssignmentsTable) {
          state.roleAssignments.push(values as { id: string; companyId: string; userId: string; roleId: string; scopeNodeId: string; scopeType: string; scopeId: string; createdAt: Date });
        }

        return Promise.resolve([]);
      },
    }),
    select: () => ({
      from: (table: unknown) => createSelectQuery(table),
    }),
    update: (table: unknown) => ({
      set: (values: unknown) => {
        writes.push({ table, values });
        return {
          where: () => Promise.resolve([]),
        };
      },
    }),
  };

  const db = {
    transaction: async <T>(callback: (client: typeof tx) => Promise<T>) =>
      await callback(tx),
  } as unknown as AppDb;

  return { db, writes };
};

const createSequentialId = () => {
  let counter = 0;

  return () => {
    counter += 1;
    return counter === 1 ? 'fixed-id' : `fixed-id-${counter}`;
  };
};

describe('createDrizzleCompanyOnboardingGateway', () => {
  it('rejects company creation when the privacy policy was not accepted on the server', async () => {
    const { db, writes } = createFakeDb({ privacyPolicyAccepted: false });
    const gateway = createDrizzleCompanyOnboardingGateway(db, {
      createId: createSequentialId(),
      now: () => new Date('2026-07-28T12:00:00.000Z'),
    });

    await expect(
      gateway.createCompany({
        ownerUserId: 'user-1',
        correlationId: 'corr-1',
        requestId: 'req-1',
        idempotencyKey: 'idem-1',
        name: 'Vimcore Labs',
        legalIdentifier: 'RFC-123456',
        services: ['Implementation'],
        address: {
          country: 'Mexico',
          city: 'Monterrey',
          exactLocation: 'San Pedro 123',
        },
        contact: {
          phone: '0991234567',
          email: 'ops@vimcore.test',
        },
        paletteId: 'ocean',
        erpModuleId: 'inventory',
        privacyPolicyVersion: '2025-07-09',
        branches: [],
      }),
    ).rejects.toThrow(
      'Debes aceptar la política de privacidad antes de registrar la empresa.',
    );

    expect(writes).toEqual([]);
  });

  it('keeps company creation atomic while dual-writing normalized services and structured audit metadata', async () => {
    const { db, writes } = createFakeDb();
    const gateway = createDrizzleCompanyOnboardingGateway(db, {
      createId: createSequentialId(),
      now: () => new Date('2026-07-28T12:00:00.000Z'),
    });

    const result = await gateway.createCompany({
      ownerUserId: 'user-1',
      correlationId: 'corr-1',
      requestId: 'req-1',
      idempotencyKey: 'idem-1',
      name: 'Vimcore Labs',
      legalIdentifier: 'RFC-123456',
      services: ['Implementation', 'Implementation', 'Support', 'Support'],
      address: {
        country: 'Mexico',
        city: 'Monterrey',
        exactLocation: 'San Pedro 123',
      },
      contact: {
        phone: '0991234567',
        email: 'ops@vimcore.test',
      },
      paletteId: 'ocean',
      erpModuleId: 'inventory',
      privacyPolicyVersion: '2025-07-09',
      branches: [{ name: 'HQ', locale: 'es-MX' }],
    });

    expect(result).toEqual({ companyId: 'fixed-id', paletteId: 'ocean' });
    expect(writes).toContainEqual({
      table: companiesTable,
      values: {
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        id: 'fixed-id',
        name: 'Vimcore Labs',
        status: 'active',
      },
    });
    expect(writes).toContainEqual({
      table: membershipsTable,
      values: {
        companyId: 'fixed-id',
        role: 'company-owner',
        userId: 'user-1',
      },
    });
    expect(writes).toContainEqual({
      table: companyProfilesTable,
      values: {
        city: 'Monterrey',
        companyId: 'fixed-id',
        contactEmail: 'ops@vimcore.test',
        contactPhone: '0991234567',
        country: 'Mexico',
        exactLocation: 'San Pedro 123',
        erpModuleId: 'inventory',
        legalIdentifier: 'RFC-123456',
        services: JSON.stringify(['Implementation', 'Support']),
      },
    });

    const permissionsWrite = writes.find((entry) => entry.table === permissionsTable);
    expect(permissionsWrite?.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'catalog.read', family: 'normal' }),
        expect.objectContaining({ key: 'roles.assign', family: 'normal' }),
        expect.objectContaining({
          key: 'platform.bypass_company_isolation',
          family: 'reserved',
        }),
      ]),
    );

    const roleWrites = writes.filter((entry) => entry.table === rolesTable);
    expect(roleWrites).toHaveLength(2);
    expect(roleWrites.map((entry) => (entry.values as { key: string }).key)).toEqual(
      expect.arrayContaining(['company-owner', 'company-user']),
    );

    const assignmentWrites = writes.filter((entry) => entry.table === roleAssignmentsTable);
    expect(assignmentWrites).toHaveLength(2);
    expect(assignmentWrites.every((entry) => (entry.values as { companyId: string }).companyId === 'fixed-id')).toBe(true);
    expect(
      assignmentWrites.every(
        (entry) =>
          (entry.values as { scopeNodeId: string; scopeId: string }).scopeNodeId ===
            'company:fixed-id' &&
          (entry.values as { scopeId: string }).scopeId === 'fixed-id',
      ),
    ).toBe(true);

    const notificationWrite = writes.find((entry) => entry.table === notificationsTable);
    expect(notificationWrite?.values).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          companyId: 'fixed-id',
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          message: 'Vimcore Labs registered',
          targetRole: 'platform-admin',
          type: 'company.registered',
        }),
        expect.objectContaining({
          companyId: 'fixed-id',
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          message: 'Vimcore Labs registered',
          targetRole: 'company-owner',
          type: 'company.registered',
        }),
      ]),
    );

    const auditWrite = writes.find((entry) => entry.table === auditEventsTable);
    expect(auditWrite?.values).toEqual(
      expect.objectContaining({
        actorUserId: 'user-1',
        companyId: 'fixed-id',
        correlationId: 'corr-1',
        createdAt: new Date('2026-07-28T12:00:00.000Z'),
        details: {
          legalIdentifier: 'RFC-123456',
          services: ['Implementation', 'Support'],
        },
        entityId: 'fixed-id',
        entityType: 'company',
        newValues: {
          legalIdentifier: 'RFC-123456',
          name: 'Vimcore Labs',
          services: ['Implementation', 'Support'],
        },
        oldValues: null,
        type: 'company.created',
      }),
    );
  });
});
