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

const migrationFile = '0018_role_assignment_mode.sql';

describe('role assignment mode migration', () => {
  it('adds the role_assignment_mode enum, a defaulted mode column, and nullable active_scope_node_id', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0017_role_assignment_scope_fk.sql');

    await applyMigrationFile(database.pool, migrationFile);

    const modeColumn = await database.pool.query<{
      columnName: string;
      dataType: string;
      udtName: string;
      isNullable: 'YES' | 'NO';
      columnDefault: string | null;
    }>(`
      SELECT
        column_name AS "columnName",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS "isNullable",
        column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_name = 'role_assignments'
        AND column_name = 'mode'
    `);

    expect(modeColumn.rows).toEqual([
      {
        columnName: 'mode',
        dataType: 'USER-DEFINED',
        udtName: 'role_assignment_mode',
        isNullable: 'NO',
        columnDefault: "'subtree_inclusive'::role_assignment_mode",
      },
    ]);

    const activeScopeColumn = await database.pool.query<{
      columnName: string;
      dataType: string;
      isNullable: 'YES' | 'NO';
    }>(`
      SELECT
        column_name AS "columnName",
        data_type AS "dataType",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_name = 'user_preferences'
        AND column_name = 'active_scope_node_id'
    `);

    expect(activeScopeColumn.rows).toEqual([
      {
        columnName: 'active_scope_node_id',
        dataType: 'text',
        isNullable: 'YES',
      },
    ]);
  });

  it('backfills existing assignments to subtree_inclusive', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0017_role_assignment_scope_fk.sql');

    const now = new Date('2026-08-11T15:30:00.000Z');

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
      `INSERT INTO role_assignments (id, company_id, user_id, role_id, scope_node_id, scope_type, scope_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'assignment-1',
        'company-a',
        'user-1',
        'role-1',
        'company:company-a',
        'company',
        'company-a',
        now,
      ],
    );

    await applyMigrationFile(database.pool, migrationFile);

    const assignments = await database.pool.query<{
      id: string;
      mode: string;
    }>(`
      SELECT id, mode::text AS "mode"
      FROM role_assignments
      ORDER BY id ASC
    `);

    expect(assignments.rows).toEqual([
      {
        id: 'assignment-1',
        mode: 'subtree_inclusive',
      },
    ]);
  });
});
