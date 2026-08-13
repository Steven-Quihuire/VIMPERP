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

const migrationFile = '0021_node_management_invitations.sql';

describe('node management invitations migration', () => {
  it('adds the invitation table, token uniqueness, and acceptance consistency check', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0020_node_management_foundation.sql');
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
      WHERE table_name = 'node_management_invitations'
      ORDER BY ordinal_position ASC
    `);

    expect(columns.rows).toEqual([
      { columnName: 'id', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'company_id', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'scope_node_id', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'scope_type', dataType: 'USER-DEFINED', udtName: 'scope_node_type', isNullable: 'NO', columnDefault: null },
      { columnName: 'scope_id', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'invitee_email', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'token_hash', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'managed_role_key', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: "'node-manager'::text" },
      { columnName: 'base_membership_role', dataType: 'USER-DEFINED', udtName: 'auth_role', isNullable: 'NO', columnDefault: "'company-user'::auth_role" },
      { columnName: 'created_by_user_id', dataType: 'text', udtName: 'text', isNullable: 'NO', columnDefault: null },
      { columnName: 'created_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', isNullable: 'NO', columnDefault: 'now()' },
      { columnName: 'expires_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', isNullable: 'NO', columnDefault: null },
      { columnName: 'accepted_at', dataType: 'timestamp with time zone', udtName: 'timestamptz', isNullable: 'YES', columnDefault: null },
      { columnName: 'accepted_by_user_id', dataType: 'text', udtName: 'text', isNullable: 'YES', columnDefault: null },
    ]);

    const indexes = await database.pool.query<{ indexName: string; indexDef: string }>(`
      SELECT
        indexname AS "indexName",
        indexdef AS "indexDef"
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'node_management_invitations'
      ORDER BY indexname ASC
    `);

    expect(indexes.rows).toEqual([
      {
        indexName: 'node_management_invitations_company_idx',
        indexDef: 'CREATE INDEX node_management_invitations_company_idx ON public.node_management_invitations USING btree (company_id)',
      },
      {
        indexName: 'node_management_invitations_invitee_email_idx',
        indexDef: 'CREATE INDEX node_management_invitations_invitee_email_idx ON public.node_management_invitations USING btree (invitee_email)',
      },
      {
        indexName: 'node_management_invitations_pkey',
        indexDef: 'CREATE UNIQUE INDEX node_management_invitations_pkey ON public.node_management_invitations USING btree (id)',
      },
      {
        indexName: 'node_management_invitations_scope_node_idx',
        indexDef: 'CREATE INDEX node_management_invitations_scope_node_idx ON public.node_management_invitations USING btree (scope_node_id)',
      },
      {
        indexName: 'node_management_invitations_token_hash_idx',
        indexDef: 'CREATE UNIQUE INDEX node_management_invitations_token_hash_idx ON public.node_management_invitations USING btree (token_hash)',
      },
    ]);

    const checks = await database.pool.query<{ constraintName: string; definition: string }>(`
      SELECT
        conname AS "constraintName",
        pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conrelid = 'node_management_invitations'::regclass
        AND contype = 'c'
    `);

    expect(checks.rows).toEqual([
      {
        constraintName: 'node_management_invitations_acceptance_chk',
        definition:
          'CHECK ((((accepted_at IS NULL) AND (accepted_by_user_id IS NULL)) OR ((accepted_at IS NOT NULL) AND (accepted_by_user_id IS NOT NULL))))',
      },
    ]);
  });
});
