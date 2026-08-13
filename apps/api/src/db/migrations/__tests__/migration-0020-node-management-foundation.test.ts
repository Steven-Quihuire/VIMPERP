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

const migrationFile = '0020_node_management_foundation.sql';

describe('node management foundation migration', () => {
  it('adds the node_responsibilities table with V1 defaults and active uniqueness', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0018_role_assignment_mode.sql');
    await applyMigrationFile(database.pool, migrationFile);

    const columns = await database.pool.query<{
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
      WHERE table_name = 'node_responsibilities'
      ORDER BY ordinal_position ASC
    `);

    expect(columns.rows).toEqual([
      {
        columnName: 'id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        columnName: 'company_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        columnName: 'scope_node_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        columnName: 'scope_type',
        dataType: 'USER-DEFINED',
        udtName: 'scope_node_type',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        columnName: 'scope_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        columnName: 'responsible_user_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        columnName: 'managed_role_key',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: "'node-manager'::text",
      },
      {
        columnName: 'assignment_mode',
        dataType: 'USER-DEFINED',
        udtName: 'role_assignment_mode',
        isNullable: 'NO',
        columnDefault: "'subtree_inclusive'::role_assignment_mode",
      },
      {
        columnName: 'base_membership_role',
        dataType: 'USER-DEFINED',
        udtName: 'auth_role',
        isNullable: 'NO',
        columnDefault: "'company-user'::auth_role",
      },
      {
        columnName: 'is_active',
        dataType: 'boolean',
        udtName: 'bool',
        isNullable: 'NO',
        columnDefault: 'true',
      },
      {
        columnName: 'created_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
        columnDefault: 'now()',
      },
      {
        columnName: 'updated_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
        columnDefault: 'now()',
      },
      {
        columnName: 'ended_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'YES',
        columnDefault: null,
      },
    ]);

    const indexes = await database.pool.query<{ indexName: string; indexDef: string }>(`
      SELECT
        indexname AS "indexName",
        indexdef AS "indexDef"
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'node_responsibilities'
      ORDER BY indexname ASC
    `);

    expect(indexes.rows).toEqual([
      {
        indexName: 'node_responsibilities_active_scope_node_idx',
        indexDef:
          'CREATE UNIQUE INDEX node_responsibilities_active_scope_node_idx ON public.node_responsibilities USING btree (scope_node_id) WHERE ((is_active = true) AND (ended_at IS NULL))',
      },
      {
        indexName: 'node_responsibilities_company_idx',
        indexDef:
          'CREATE INDEX node_responsibilities_company_idx ON public.node_responsibilities USING btree (company_id)',
      },
      {
        indexName: 'node_responsibilities_pkey',
        indexDef:
          'CREATE UNIQUE INDEX node_responsibilities_pkey ON public.node_responsibilities USING btree (id)',
      },
      {
        indexName: 'node_responsibilities_scope_idx',
        indexDef:
          'CREATE INDEX node_responsibilities_scope_idx ON public.node_responsibilities USING btree (scope_type, scope_id)',
      },
      {
        indexName: 'node_responsibilities_scope_node_idx',
        indexDef:
          'CREATE INDEX node_responsibilities_scope_node_idx ON public.node_responsibilities USING btree (scope_node_id)',
      },
      {
        indexName: 'node_responsibilities_user_idx',
        indexDef:
          'CREATE INDEX node_responsibilities_user_idx ON public.node_responsibilities USING btree (responsible_user_id)',
      },
    ]);
  });
});
