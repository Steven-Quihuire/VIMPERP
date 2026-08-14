import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterEach, describe, expect, it } from 'vitest';

import { createComputeEffectivePermissionsUseCase } from '../application/compute-effective-permissions';
import { applyMigrationsThrough, createMigrationTestDatabase } from '../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import { createDrizzleScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/drizzle-scope-resolver';
import {
  areasTable,
  companiesTable,
  divisionsTable,
  localsTable,
  permissionsTable,
  pointsOfSaleTable,
  usersTable,
  warehousesTable,
} from '../../../shared/infrastructure/db/schema';
import { createDrizzleAssignmentsGateway } from './drizzle-assignments.gateway';
import { createDrizzleRolesGateway } from './drizzle-roles.gateway';
import { createDrizzleScopeHierarchyGateway } from './drizzle-scope-resolver';

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
  await applyMigrationsThrough(database.pool, '0022_rrhh_foundation.sql');

  const pool: Pool = database.pool;
  const db = drizzle(pool, {
    schema: await import('../../../shared/infrastructure/db/schema'),
  }) as AppDb;

  return { db, pool };
};

describe('drizzle scope resolver', () => {
  it('uses a recursive scope_nodes lineage query and removes per-entity path loaders', async () => {
    const sourceFile = path.resolve(
      __dirname,
      '../../../shared/infrastructure/scope-hierarchy/drizzle-scope-resolver.ts',
    );
    const source = await readFile(sourceFile, 'utf8');

    expect(source).toContain('WITH RECURSIVE');
    expect(source).not.toContain('loadDivisionPath');
    expect(source).not.toContain('loadLocalPath');
    expect(source).not.toContain('loadAreaPath');
    expect(source).not.toContain('loadWarehousePath');
    expect(source).not.toContain('loadPointOfSalePath');
  });

  it('preserves ScopeRef[] lineage semantics and powers effective permission inheritance', async () => {
    const { db } = await createDb();
    const now = new Date('2026-08-09T12:00:00.000Z');

    await db.insert(companiesTable).values({
      id: 'company-a',
      name: 'Vimcore',
      status: 'active',
      createdAt: now,
    });
    await db.insert(divisionsTable).values({
      id: 'division-1',
      companyId: 'company-a',
      name: 'North',
      createdAt: now,
    });
    await db.insert(divisionsTable).values({
      id: 'division-2',
      companyId: 'company-a',
      name: 'South',
      createdAt: now,
    });
    await db.insert(localsTable).values({
      id: 'local-1',
      companyId: 'company-a',
      divisionId: 'division-1',
      name: 'HQ',
      locale: null,
    });
    await db.insert(localsTable).values({
      id: 'local-2',
      companyId: 'company-a',
      divisionId: 'division-2',
      name: 'South Store',
      locale: null,
    });
    await db.insert(areasTable).values({
      id: 'area-1',
      companyId: 'company-a',
      divisionId: 'division-1',
      localId: null,
      name: 'Storage',
      kind: 'area',
      createdAt: now,
    });
    await db.insert(warehousesTable).values({
      id: 'warehouse-1',
      companyId: 'company-a',
      areaId: 'area-1',
      localId: null,
      name: 'Main Warehouse',
      createdAt: now,
    });
    await db.insert(pointsOfSaleTable).values({
      id: 'pos-1',
      companyId: 'company-a',
      areaId: 'area-1',
      localId: null,
      name: 'Checkout',
      createdAt: now,
    });
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    await db.insert(permissionsTable).values([
      { id: 'perm-1', key: 'catalog.read', family: 'normal' },
      { id: 'perm-2', key: 'roles.assign', family: 'normal' },
    ]);

    const rolesGateway = createDrizzleRolesGateway(db, {
      createId: () => 'role-1',
      now: () => now,
    });
    await rolesGateway.createRole({
      companyId: 'company-a',
      key: 'inventory-admin',
      name: 'Inventory Admin',
      isSystem: false,
      permissionIds: ['perm-1', 'perm-2'],
    });

    const assignmentsGateway = createDrizzleAssignmentsGateway(db, {
      createId: () => 'assignment-1',
      now: () => now,
    });
    await assignmentsGateway.createAssignment({
      companyId: 'company-a',
      userId: 'user-1',
      roleId: 'role-1',
      scopeType: 'division',
      scopeId: 'division-1',
    });

    const scopeGateway = createDrizzleScopeHierarchyGateway(db);
    const sharedResolver = createDrizzleScopeResolver(db);
    const computeEffectivePermissions = createComputeEffectivePermissionsUseCase({
      rolesGateway,
      assignmentsGateway,
      scopeHierarchyGateway: scopeGateway,
    });

    await expect(
      scopeGateway.getScopeLineage('company-a', {
        scopeType: 'local',
        scopeId: 'local-1',
      }),
    ).resolves.toEqual([
      { scopeType: 'local', scopeId: 'local-1' },
      { scopeType: 'division', scopeId: 'division-1' },
      { scopeType: 'company', scopeId: 'company-a' },
    ]);

    await expect(
      scopeGateway.getScopeLineage('company-a', {
        scopeType: 'point-of-sale',
        scopeId: 'pos-1',
      }),
    ).resolves.toEqual([
      { scopeType: 'point-of-sale', scopeId: 'pos-1' },
      { scopeType: 'area', scopeId: 'area-1' },
      { scopeType: 'division', scopeId: 'division-1' },
      { scopeType: 'company', scopeId: 'company-a' },
      ]);

    await expect(
      sharedResolver.isAuthorized('company-a', 'user-1', {
        scopeType: 'warehouse',
        scopeId: 'warehouse-1',
      }),
    ).resolves.toBe(true);

    await expect(
      sharedResolver.listAuthorizedDescendants('company-a', 'user-1'),
    ).resolves.toEqual([
      {
        ref: { scopeType: 'division', scopeId: 'division-1' },
        parentRef: { scopeType: 'company', scopeId: 'company-a' },
        companyId: 'company-a',
        name: 'North',
        employeeCount: 0,
      },
      {
        ref: { scopeType: 'local', scopeId: 'local-1' },
        parentRef: { scopeType: 'division', scopeId: 'division-1' },
        companyId: 'company-a',
        name: 'HQ',
        employeeCount: 0,
      },
      {
        ref: { scopeType: 'area', scopeId: 'area-1' },
        parentRef: { scopeType: 'division', scopeId: 'division-1' },
        companyId: 'company-a',
        name: 'Storage',
        employeeCount: 0,
      },
      {
        ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
        parentRef: { scopeType: 'area', scopeId: 'area-1' },
        companyId: 'company-a',
        name: 'Main Warehouse',
        employeeCount: 0,
      },
      {
        ref: { scopeType: 'point-of-sale', scopeId: 'pos-1' },
        parentRef: { scopeType: 'area', scopeId: 'area-1' },
        companyId: 'company-a',
        name: 'Checkout',
        employeeCount: 0,
      },
    ]);

    const visibleNodes = await sharedResolver.listAuthorizedDescendants(
      'company-a',
      'user-1',
    );

    expect(visibleNodes).not.toContainEqual(
      expect.objectContaining({
        ref: { scopeType: 'division', scopeId: 'division-2' },
      }),
    );
    expect(visibleNodes).not.toContainEqual(
      expect.objectContaining({
        ref: { scopeType: 'local', scopeId: 'local-2' },
      }),
    );

    await expect(
      computeEffectivePermissions({
        companyId: 'company-a',
        userId: 'user-1',
        currentContext: {
          scopeType: 'warehouse',
          scopeId: 'warehouse-1',
        },
      }),
    ).resolves.toEqual(['catalog.read', 'roles.assign']);
  });
});
