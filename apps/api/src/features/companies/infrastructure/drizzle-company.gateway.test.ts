import { describe, expect, it } from 'vitest';

import { createDrizzleCompanyOnboardingGateway } from './drizzle-company.gateway';
import {
  auditEventsTable,
  branchesTable,
  companiesTable,
  companyProfilesTable,
  companyServicesTable,
  membershipsTable,
  notificationsTable,
  privacyConsentsTable,
  privacyPolicyAcceptancesTable,
  themePreferencesTable,
  userPreferencesTable,
} from '../../../shared/infrastructure/db/schema';
import type { AppDb } from '../../../shared/infrastructure/db/client';

const createFakeDb = ({ privacyPolicyAccepted = true } = {}) => {
  const writes: Array<{ table: unknown; values: unknown }> = [];
  const emptyQuery = {
    from: (table: unknown) => ({
      where: () => ({
        limit: () =>
          Promise.resolve(
            table === privacyPolicyAcceptancesTable && privacyPolicyAccepted
              ? [{ id: 'fixed-id' }]
              : [],
          ),
      }),
    }),
  };

  const tx = {
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        writes.push({ table, values });
        return Promise.resolve([]);
      },
    }),
    select: () => emptyQuery,
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

describe('createDrizzleCompanyOnboardingGateway', () => {
  it('rejects company creation when the privacy policy was not accepted on the server', async () => {
    const { db, writes } = createFakeDb({ privacyPolicyAccepted: false });
    const gateway = createDrizzleCompanyOnboardingGateway(db, {
      createId: () => 'fixed-id',
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
      createId: () => 'fixed-id',
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
    expect(writes).toEqual([
      {
        table: companiesTable,
        values: {
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          id: 'fixed-id',
          name: 'Vimcore Labs',
          status: 'active',
        },
      },
      {
        table: privacyConsentsTable,
        values: {
          acceptedAt: new Date('2026-07-28T12:00:00.000Z'),
          companyId: 'fixed-id',
          id: 'fixed-id',
          policyVersion: '2025-07-09',
          userId: 'user-1',
        },
      },
      {
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
      },
      {
        table: companyServicesTable,
        values: [
          {
            companyId: 'fixed-id',
            createdAt: new Date('2026-07-28T12:00:00.000Z'),
            id: 'fixed-id',
            name: 'Implementation',
          },
          {
            companyId: 'fixed-id',
            createdAt: new Date('2026-07-28T12:00:00.000Z'),
            id: 'fixed-id',
            name: 'Support',
          },
        ],
      },
      {
        table: branchesTable,
        values: [
          {
            companyId: 'fixed-id',
            id: 'fixed-id',
            locale: 'es-MX',
            name: 'HQ',
          },
        ],
      },
      {
        table: membershipsTable,
        values: {
          companyId: 'fixed-id',
          role: 'company-owner',
          userId: 'user-1',
        },
      },
      {
        table: themePreferencesTable,
        values: {
          companyId: 'fixed-id',
          paletteId: 'ocean',
          userId: 'user-1',
        },
      },
      {
        table: userPreferencesTable,
        values: {
          activeCompanyId: 'fixed-id',
          userId: 'user-1',
        },
      },
      {
        table: notificationsTable,
        values: {
          companyId: 'fixed-id',
          createdAt: new Date('2026-07-28T12:00:00.000Z'),
          id: 'fixed-id',
          message: 'Vimcore Labs registered',
          targetRole: 'platform-admin',
          type: 'company.registered',
        },
      },
      {
        table: auditEventsTable,
        values: {
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
          id: 'fixed-id',
          newValues: {
            legalIdentifier: 'RFC-123456',
            name: 'Vimcore Labs',
            services: ['Implementation', 'Support'],
          },
          oldValues: null,
          type: 'company.created',
        },
      },
    ]);
  });
});
