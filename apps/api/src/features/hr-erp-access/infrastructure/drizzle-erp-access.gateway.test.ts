import { afterEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';

import { applyMigrationsThrough, createMigrationTestDatabase } from '../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  companiesTable,
  employeesTable,
  erpAccessInvitationsTable,
  erpAccessLinksTable,
  membershipsTable,
  sessionsTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import { createDrizzleErpAccessGateway } from './drizzle-erp-access.gateway';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();
    if (cleanup) {
      await cleanup();
    }
  }
});

const createDb = async () => {
  const database = await createMigrationTestDatabase();
  cleanups.push(database.cleanup);
  await applyMigrationsThrough(database.pool, '0023_employee_master.sql');

  const db = drizzle(database.pool, {
    schema: await import('../../../shared/infrastructure/db/schema'),
  }) as AppDb;

  return { db };
};

describe('createDrizzleErpAccessGateway', () => {
  it('persists invitations, accepts them into active links, and revokes access', async () => {
    const { db } = await createDb();
    const now = new Date('2026-08-13T12:00:00.000Z');

    await db.insert(companiesTable).values({
      id: 'company-1',
      name: 'Vimcore',
      status: 'active',
      createdAt: now,
    });
    await db.insert(usersTable).values({
      id: 'owner-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:owner',
    });
    await db.insert(employeesTable).values({
      id: 'employee-1',
      companyId: 'company-1',
      createdAt: now,
    });

    const gateway = createDrizzleErpAccessGateway(db, {
      createId: (() => {
        let sequence = 0;
        return () => `generated-${++sequence}`;
      })(),
    });

    const invitation = await gateway.createInvitation({
      id: 'inv-1',
      companyId: 'company-1',
      employeeId: 'employee-1',
      inviteeEmail: 'new.user@vimcore.test',
      tokenHash: 'token-hash-1',
      createdByUserId: 'owner-1',
      expiresAt: new Date('2026-08-20T12:00:00.000Z'),
    });

    await expect(
      gateway.listPendingInvitationsByCompany('company-1', new Date('2026-08-13T12:00:00.000Z')),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'inv-1', employeeId: 'employee-1' }),
    ]);

    await gateway.acceptInvitation({
      invitationId: invitation.id,
      acceptedAt: new Date('2026-08-13T13:00:00.000Z'),
      acceptedByUserId: 'user-1',
      employeeId: 'employee-1',
      companyId: 'company-1',
      user: {
        id: 'user-1',
        email: 'new.user@vimcore.test',
        username: 'new.user',
        passwordHash: 'hashed:secret123',
      },
      session: {
        token: 'session-token',
        userId: 'user-1',
        expiresAt: new Date('2026-08-13T21:00:00.000Z'),
      },
      ensureCompanyUserMembership: true,
    });

    await expect(
      gateway.getActiveLinkByEmployeeId('company-1', 'employee-1'),
    ).resolves.toMatchObject({
      employeeId: 'employee-1',
      userId: 'user-1',
      isActive: true,
    });

    await expect(db.select().from(erpAccessInvitationsTable)).resolves.toEqual([
      expect.objectContaining({
        id: 'inv-1',
        acceptedByUserId: 'user-1',
        acceptedAt: new Date('2026-08-13T13:00:00.000Z'),
      }),
    ]);
    await expect(db.select().from(erpAccessLinksTable)).resolves.toEqual([
      expect.objectContaining({ employeeId: 'employee-1', userId: 'user-1', isActive: true }),
    ]);
    await expect(db.select().from(membershipsTable)).resolves.toEqual([
      expect.objectContaining({ userId: 'user-1', companyId: 'company-1', role: 'company-user' }),
    ]);
    await expect(db.select().from(sessionsTable)).resolves.toEqual([
      expect.objectContaining({ token: 'session-token', userId: 'user-1' }),
    ]);

    await gateway.revokeAccess({
      companyId: 'company-1',
      employeeId: 'employee-1',
      revokedAt: new Date('2026-08-13T14:00:00.000Z'),
    });

    await expect(
      gateway.getActiveLinkByEmployeeId('company-1', 'employee-1'),
    ).resolves.toBeNull();
    await expect(db.select().from(erpAccessLinksTable)).resolves.toEqual([
      expect.objectContaining({
        employeeId: 'employee-1',
        isActive: false,
        revokedAt: new Date('2026-08-13T14:00:00.000Z'),
      }),
    ]);
    await expect(db.select().from(usersTable)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'owner-1' }),
        expect.objectContaining({ id: 'user-1' }),
      ]),
    );
  });
});
