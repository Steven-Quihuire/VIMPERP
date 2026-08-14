import { afterEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';

import {
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from '../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  companiesTable,
  scopeNodesTable,
} from '../../../shared/infrastructure/db/schema';
import { createDrizzleApprovalPolicyGateway } from './drizzle-approval-policy.gateway';

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

  return { db };
};

describe('createDrizzleApprovalPolicyGateway', () => {
  it('persists and updates approval policies for company and node scopes', async () => {
    const { db } = await createDb();
    const now = new Date('2026-08-13T12:00:00.000Z');

    await db.insert(companiesTable).values({
      id: 'company-a',
      name: 'Vimcore',
      status: 'active',
      createdAt: now,
    });
    await db.insert(scopeNodesTable).values({
      id: 'area:area-1',
      nodeType: 'area',
      sourceId: 'area-1',
      companyId: 'company-a',
      parentScopeNodeId: 'company:company-a',
      name: 'Operations',
      createdAt: now,
    });

    const gateway = createDrizzleApprovalPolicyGateway(db, {
      createId: () => 'policy-1',
      now: () => now,
    });

    const created = await gateway.createApprovalPolicy({
      companyId: 'company-a',
      scopeType: 'company',
      scopeNodeId: null,
      name: 'Company Policy',
      definition: { steps: ['manager'] },
      isActive: true,
    });

    expect(created).toMatchObject({
      id: 'policy-1',
      companyId: 'company-a',
      scopeType: 'company',
      scopeNodeId: null,
      name: 'Company Policy',
      definition: { steps: ['manager'] },
      isActive: true,
    });

    const updated = await gateway.updateApprovalPolicy({
      companyId: 'company-a',
      policyId: 'policy-1',
      scopeType: 'area',
      scopeNodeId: 'area:area-1',
      name: 'Area Policy',
      definition: { steps: ['director'] },
      isActive: true,
    });

    expect(updated).toMatchObject({
      id: 'policy-1',
      scopeType: 'area',
      scopeNodeId: 'area:area-1',
      name: 'Area Policy',
      definition: { steps: ['director'] },
    });

    await expect(gateway.listApprovalPolicies('company-a')).resolves.toEqual([
      expect.objectContaining({ id: 'policy-1', scopeType: 'area' }),
    ]);
  });

  it('deactivates approval policies without deleting the record', async () => {
    const { db } = await createDb();
    const now = new Date('2026-08-13T12:00:00.000Z');

    await db.insert(companiesTable).values({
      id: 'company-a',
      name: 'Vimcore',
      status: 'active',
      createdAt: now,
    });

    const gateway = createDrizzleApprovalPolicyGateway(db, {
      createId: () => 'policy-1',
      now: () => now,
    });

    await gateway.createApprovalPolicy({
      companyId: 'company-a',
      scopeType: 'company',
      scopeNodeId: null,
      name: 'Company Policy',
      definition: { steps: ['manager'] },
      isActive: true,
    });

    const deactivated = await gateway.deactivateApprovalPolicy('company-a', 'policy-1');

    expect(deactivated).toMatchObject({
      id: 'policy-1',
      isActive: false,
    });
  });
});
