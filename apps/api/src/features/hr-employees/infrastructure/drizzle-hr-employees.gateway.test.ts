import { afterEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';

import { applyMigrationsThrough, createMigrationTestDatabase } from '../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  companiesTable,
  positionsTable,
  scopeNodesTable,
  usersTable,
} from '../../../shared/infrastructure/db/schema';
import { createDrizzleHrEmployeesGateway } from './drizzle-hr-employees.gateway';

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

  return { db, pool: database.pool };
};

describe('createDrizzleHrEmployeesGateway', () => {
  it('persists employees, positions, assignments, managers, and direct reports', async () => {
    const { db } = await createDb();
    const now = new Date('2026-08-13T12:00:00.000Z');

    await db.insert(companiesTable).values({
      id: 'company-1',
      name: 'Vimcore',
      status: 'active',
      createdAt: now,
    });
    await db.insert(usersTable).values([
      {
        id: 'user-1',
        email: 'owner@vimcore.test',
        username: 'owner',
        passwordHash: 'hashed',
      },
      {
        id: 'user-2',
        email: 'manager@vimcore.test',
        username: 'manager',
        passwordHash: 'hashed',
      },
    ]);
    await db.insert(scopeNodesTable).values([
      {
        id: 'area:area-1',
        nodeType: 'area',
        sourceId: 'area-1',
        companyId: 'company-1',
        parentScopeNodeId: 'company:company-1',
        name: 'Operations',
        createdAt: now,
      },
    ]);

    const gateway = createDrizzleHrEmployeesGateway(db, {
      now: () => now,
      createId: (() => {
        let sequence = 0;
        return () => `generated-${++sequence}`;
      })(),
    });

    const manager = await gateway.createEmployee({
      companyId: 'company-1',
      fullName: 'People Manager',
      documentType: null,
      documentNumber: null,
      email: 'manager@vimcore.test',
      employmentStatus: 'active',
      hiredAt: now,
    });
    const directReport = await gateway.createEmployee({
      companyId: 'company-1',
      fullName: 'HR Analyst',
      documentType: null,
      documentNumber: null,
      email: 'analyst@vimcore.test',
      employmentStatus: 'active',
      hiredAt: now,
    });

    expect(manager).toMatchObject({ fullName: 'People Manager', employmentStatus: 'active' });
    await expect(
      gateway.updateEmployee('company-1', manager.id, {
        fullName: 'People Manager Updated',
        documentType: null,
        documentNumber: null,
        email: 'manager.updated@vimcore.test',
        employmentStatus: 'suspended',
        hiredAt: now,
      }),
    ).resolves.toMatchObject({
      fullName: 'People Manager Updated',
      email: 'manager.updated@vimcore.test',
      employmentStatus: 'suspended',
    });
    const leadPosition = await gateway.createPosition({
      companyId: 'company-1',
      name: 'People Lead',
      reportsToPositionId: null,
      headcount: 2,
      isActive: true,
    });
    const analystPosition = await gateway.createPosition({
      companyId: 'company-1',
      name: 'HR Analyst',
      reportsToPositionId: leadPosition.id,
      headcount: 2,
      isActive: true,
    });
    expect(analystPosition).toMatchObject({
      occupiedHeadcount: 0,
      remainingVacancies: 2,
    });

    await gateway.createAssignment({
      companyId: 'company-1',
      employeeId: manager.id,
      scopeNodeId: 'area:area-1',
      positionId: leadPosition.id,
      startedAt: new Date('2026-08-13T12:00:00.000Z'),
      isPrimary: true,
      createdAt: now,
    });
    const employeeAssignment = await gateway.createAssignment({
      companyId: 'company-1',
      employeeId: directReport.id,
      scopeNodeId: 'area:area-1',
      positionId: analystPosition.id,
      startedAt: new Date('2026-08-13T12:30:00.000Z'),
      isPrimary: true,
      createdAt: now,
    });

    await expect(gateway.countActivePrimaryAssignmentsForPosition(analystPosition.id)).resolves.toBe(1);
    await expect(gateway.listPositions('company-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: analystPosition.id,
          occupiedHeadcount: 1,
          remainingVacancies: 1,
        }),
      ]),
    );
    await expect(
      gateway.getActivePrimaryAssignmentByEmployeeId('company-1', directReport.id),
    ).resolves.toMatchObject({ id: employeeAssignment.id, positionId: analystPosition.id });

    const managerAssignment = await gateway.getActivePrimaryAssignmentByPositionId(
      'company-1',
      leadPosition.id,
    );
    expect(managerAssignment).toMatchObject({ employeeId: manager.id });

    await expect(
      gateway.listDirectReportAssignments('company-1', leadPosition.id),
    ).resolves.toEqual([
      expect.objectContaining({ employeeId: directReport.id, positionId: analystPosition.id }),
    ]);

    const replacementAssignment = await gateway.createAssignment({
      companyId: 'company-1',
      employeeId: directReport.id,
      scopeNodeId: 'area:area-1',
      positionId: leadPosition.id,
      startedAt: new Date('2026-08-13T13:00:00.000Z'),
      isPrimary: true,
      createdAt: now,
    });
    await expect(gateway.listAssignmentHistory('company-1', directReport.id)).resolves.toEqual([
      expect.objectContaining({
        id: employeeAssignment.id,
        positionName: 'HR Analyst',
        scopeNodeName: 'Operations',
        startedAt: new Date('2026-08-13T12:30:00.000Z'),
        endedAt: new Date('2026-08-13T13:00:00.000Z'),
        isPrimary: true,
      }),
      expect.objectContaining({
        id: replacementAssignment.id,
        positionName: 'People Lead',
        scopeNodeName: 'Operations',
        startedAt: new Date('2026-08-13T13:00:00.000Z'),
        endedAt: null,
        isPrimary: true,
      }),
    ]);

    const positions = await db.select().from(positionsTable);
    expect(positions).toHaveLength(2);
  });
});
