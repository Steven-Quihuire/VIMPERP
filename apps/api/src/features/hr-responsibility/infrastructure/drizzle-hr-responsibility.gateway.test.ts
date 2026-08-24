import { afterEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';

import {
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from '../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  companiesTable,
  hrResponsibilityInvitationsTable,
  membershipsTable,
  permissionsTable,
  usersTable,
  sessionsTable,
} from '../../../shared/infrastructure/db/schema';
import { createComputeEffectivePermissionsUseCase } from '../../roles-management/application/compute-effective-permissions';
import { hrPermissionKeys } from '../../roles-management/domain/permissions';
import { createDrizzleAssignmentsGateway } from '../../roles-management/infrastructure/drizzle-assignments.gateway';
import { createDrizzleRolesGateway } from '../../roles-management/infrastructure/drizzle-roles.gateway';
import { createDrizzleHrResponsibilityGateway } from './drizzle-hr-responsibility.gateway';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()!();
  }
});

describe('createDrizzleHrResponsibilityGateway', () => {
  it('keeps company HR responsibility isolated and grants the real HR role permissions', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);
    await applyMigrationsThrough(
      database.pool,
      '0025_hr_responsibility_invitations.sql',
    );
    const db = drizzle(database.pool, {
      schema: await import('../../../shared/infrastructure/db/schema'),
    }) as AppDb;
    const now = new Date('2026-08-14T12:00:00.000Z');

    await db.insert(companiesTable).values([
      { id: 'company-1', name: 'Northwind', status: 'active', createdAt: now },
      { id: 'company-2', name: 'Other', status: 'active', createdAt: now },
    ]);
    await db.insert(usersTable).values([
      {
        id: 'user-1',
        email: 'one@test.local',
        username: 'one',
        passwordHash: 'hash',
      },
      {
        id: 'user-2',
        email: 'two@test.local',
        username: 'two',
        passwordHash: 'hash',
      },
      {
        id: 'user-3',
        email: 'three@test.local',
        username: 'three',
        passwordHash: 'hash',
      },
    ]);
    await db.insert(membershipsTable).values([
      {
        userId: 'user-1',
        companyId: 'company-1',
        divisionId: null,
        localId: null,
        role: 'company-user',
      },
      {
        userId: 'user-2',
        companyId: 'company-1',
        divisionId: null,
        localId: null,
        role: 'company-user',
      },
      {
        userId: 'user-3',
        companyId: 'company-2',
        divisionId: null,
        localId: null,
        role: 'company-user',
      },
    ]);
    await db.insert(permissionsTable).values(
      hrPermissionKeys.map((key, index) => ({
        id: `permission-${index}`,
        key,
        family: 'normal' as const,
      })),
    );

    const gateway = createDrizzleHrResponsibilityGateway(db, {
      createId: (() => {
        let index = 0;
        return () => `generated-${++index}`;
      })(),
      now: () => now,
    });

    await expect(gateway.listResponsibilities('company-1')).resolves.toEqual(
      [],
    );
    await gateway.assignResponsibility({
      companyId: 'company-1',
      userId: 'user-1',
    });
    await gateway.assignResponsibility({
      companyId: 'company-1',
      userId: 'user-2',
    });
    await expect(
      gateway.assignResponsibility({
        companyId: 'company-1',
        userId: 'user-3',
      }),
    ).rejects.toThrow('must belong to the company');
    await expect(
      gateway.listResponsibilities('company-1'),
    ).resolves.toHaveLength(2);

    const permissions = createComputeEffectivePermissionsUseCase({
      rolesGateway: createDrizzleRolesGateway(db),
      assignmentsGateway: createDrizzleAssignmentsGateway(db),
      scopeHierarchyGateway: {
        assertScopeRefBelongsToCompany: () => Promise.resolve(undefined),
        getScopeLineage: () => Promise.resolve([
          { scopeType: 'company', scopeId: 'company-1' },
        ]),
      },
    });

    await expect(
      permissions({
        companyId: 'company-1',
        userId: 'user-1',
        currentContext: { scopeType: 'company', scopeId: 'company-1' },
      }),
    ).resolves.toEqual([...hrPermissionKeys].sort());

    await db.insert(hrResponsibilityInvitationsTable).values({
      id: 'hr-inv-1',
      companyId: 'company-1',
      inviteeEmail: 'two@test.local',
      tokenHash: 'hr-token-hash',
      createdByUserId: 'user-1',
      expiresAt: new Date('2026-08-21T12:00:00.000Z'),
    });
    await gateway.acceptInvitation({
      invitationId: 'hr-inv-1',
      acceptedAt: now,
      acceptedByUserId: 'user-2',
      user: null,
      session: {
        token: 'hr-session-1',
        userId: 'user-2',
        expiresAt: new Date('2026-08-15T12:00:00.000Z'),
      },
      ensureCompanyUserMembership: false,
      companyId: 'company-1',
    });
    await expect(
      db
        .select({ token: sessionsTable.token })
        .from(sessionsTable)
        .where(eq(sessionsTable.token, 'hr-session-1')),
    ).resolves.toEqual([{ token: 'hr-session-1' }]);
    await expect(
      db
        .select({
          acceptedByUserId: hrResponsibilityInvitationsTable.acceptedByUserId,
        })
        .from(hrResponsibilityInvitationsTable)
        .where(eq(hrResponsibilityInvitationsTable.id, 'hr-inv-1')),
    ).resolves.toEqual([{ acceptedByUserId: 'user-2' }]);
  }, 15000);
});
