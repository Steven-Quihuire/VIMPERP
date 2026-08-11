import { afterEach, describe, expect, it } from 'vitest';

import {
  applyMigrationFile,
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from './migration-test-helpers';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();

    if (cleanup) {
      await cleanup();
    }
  }
});

const migrationFile = '0017_role_assignment_scope_fk.sql';

describe('role assignment scope FK migration', () => {
  it('backfills canonical scope_node_id values, quarantines dangling assignments, and writes audit events', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0016_canonical_scope_nodes.sql');

    const now = new Date('2026-08-09T12:00:00.000Z');

    await database.pool.query(
      `INSERT INTO companies (id, name, status, created_at) VALUES ($1, $2, $3, $4)`,
      ['company-a', 'Vimcore', 'active', now],
    );
    await database.pool.query(
      `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
      ['user-1', 'owner@vimcore.test', 'owner', 'hashed'],
    );
    await database.pool.query(
      `INSERT INTO roles (id, company_id, key, name, is_system, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['role-1', 'company-a', 'inventory-admin', 'Inventory Admin', false, now],
    );
    await database.pool.query(
      `INSERT INTO locals (id, company_id, division_id, name, locale)
       VALUES ($1, $2, $3, $4, $5)`,
      ['local-1', 'company-a', null, 'HQ', null],
    );
    await database.pool.query(
      `INSERT INTO role_assignments (id, company_id, user_id, role_id, scope_type, scope_id, created_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7),
         ($8, $9, $10, $11, $12, $13, $14),
         ($15, $16, $17, $18, $19, $20, $21)`,
      [
        'assignment-company',
        'company-a',
        'user-1',
        'role-1',
        'company',
        null,
        now,
        'assignment-local',
        'company-a',
        'user-1',
        'role-1',
        'local',
        'local-1',
        now,
        'assignment-dangling',
        'company-a',
        'user-1',
        'role-1',
        'local',
        'missing-local',
        now,
      ],
    );

    await applyMigrationFile(database.pool, migrationFile);

    const assignments = await database.pool.query<{
      id: string;
      scopeNodeId: string;
      scopeType: string;
      scopeId: string | null;
    }>(`
      SELECT
        id,
        scope_node_id AS "scopeNodeId",
        scope_type::text AS "scopeType",
        scope_id AS "scopeId"
      FROM role_assignments
      ORDER BY id ASC
    `);

    expect(assignments.rows).toEqual([
      {
        id: 'assignment-company',
        scopeNodeId: 'company:company-a',
        scopeType: 'company',
        scopeId: 'company-a',
      },
      {
        id: 'assignment-local',
        scopeNodeId: 'local:local-1',
        scopeType: 'local',
        scopeId: 'local-1',
      },
    ]);

    const staleAssignments = await database.pool.query<{
      id: string;
      scopeType: string;
      scopeId: string | null;
      expectedScopeNodeId: string | null;
      quarantineReason: string;
    }>(`
      SELECT
        id,
        scope_type::text AS "scopeType",
        scope_id AS "scopeId",
        expected_scope_node_id AS "expectedScopeNodeId",
        quarantine_reason AS "quarantineReason"
      FROM stale_role_assignments
      ORDER BY id ASC
    `);

    expect(staleAssignments.rows).toEqual([
      {
        id: 'assignment-dangling',
        scopeType: 'local',
        scopeId: 'missing-local',
        expectedScopeNodeId: 'local:missing-local',
        quarantineReason: 'missing_scope_node',
      },
    ]);

    const auditEvents = await database.pool.query<{
      actorUserId: string;
      entityType: string | null;
      entityId: string | null;
      type: string;
      details: {
        action: string;
        assignmentId: string;
        originalScopeType: string;
        originalScopeId: string | null;
      };
    }>(`
      SELECT
        actor_user_id AS "actorUserId",
        entity_type AS "entityType",
        entity_id AS "entityId",
        type,
        details
      FROM audit_events
      WHERE entity_id = 'assignment-dangling'
      ORDER BY created_at ASC
    `);

    expect(auditEvents.rows).toEqual([
      {
        actorUserId: 'system:migration:0017',
        entityType: 'role_assignment',
        entityId: 'assignment-dangling',
        type: 'role_assignment.scope_quarantined',
        details: {
          action: 'quarantined',
          assignmentId: 'assignment-dangling',
          originalScopeType: 'local',
          originalScopeId: 'missing-local',
        },
      },
    ]);
  });

  it('creates restrictive scope_node_id integrity and blocks live deletes for assigned scope nodes', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0016_canonical_scope_nodes.sql');

    const now = new Date('2026-08-09T12:00:00.000Z');

    await database.pool.query(
      `INSERT INTO companies (id, name, status, created_at) VALUES ($1, $2, $3, $4)`,
      ['company-a', 'Vimcore', 'active', now],
    );
    await database.pool.query(
      `INSERT INTO users (id, email, username, password_hash) VALUES ($1, $2, $3, $4)`,
      ['user-1', 'owner@vimcore.test', 'owner', 'hashed'],
    );
    await database.pool.query(
      `INSERT INTO roles (id, company_id, key, name, is_system, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['role-1', 'company-a', 'inventory-admin', 'Inventory Admin', false, now],
    );
    await database.pool.query(
      `INSERT INTO locals (id, company_id, division_id, name, locale)
       VALUES ($1, $2, $3, $4, $5)`,
      ['local-1', 'company-a', null, 'HQ', null],
    );
    await database.pool.query(
      `INSERT INTO role_assignments (id, company_id, user_id, role_id, scope_type, scope_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['assignment-local', 'company-a', 'user-1', 'role-1', 'local', 'local-1', now],
    );

    await applyMigrationFile(database.pool, migrationFile);

    const columns = await database.pool.query<{
      columnName: string;
      isNullable: 'YES' | 'NO';
    }>(`
      SELECT
        column_name AS "columnName",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_name = 'role_assignments'
        AND column_name = 'scope_node_id'
    `);

    expect(columns.rows).toEqual([{ columnName: 'scope_node_id', isNullable: 'NO' }]);

    const scopeIdColumn = await database.pool.query<{
      columnName: string;
      isNullable: 'YES' | 'NO';
    }>(`
      SELECT
        column_name AS "columnName",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_name = 'role_assignments'
        AND column_name = 'scope_id'
    `);

    expect(scopeIdColumn.rows).toEqual([{ columnName: 'scope_id', isNullable: 'NO' }]);

    const foreignKeys = await database.pool.query<{
      columnName: string;
      foreignTableName: string;
      deleteRule: string;
    }>(`
      SELECT
        kcu.column_name AS "columnName",
        ccu.table_name AS "foreignTableName",
        rc.delete_rule AS "deleteRule"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc
        ON rc.constraint_name = tc.constraint_name
       AND rc.constraint_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'role_assignments'
        AND kcu.column_name = 'scope_node_id'
    `);

    expect(foreignKeys.rows).toEqual([
      {
        columnName: 'scope_node_id',
        foreignTableName: 'scope_nodes',
        deleteRule: 'RESTRICT',
      },
    ]);

    await expect(
      database.pool.query(`DELETE FROM locals WHERE id = 'local-1'`),
    ).rejects.toMatchObject({ code: '23503' });
  });
});
