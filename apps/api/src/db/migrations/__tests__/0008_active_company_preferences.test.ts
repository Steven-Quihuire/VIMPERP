import { afterEach, describe, expect, it } from 'vitest';

import { applyMigrationsThrough, createMigrationTestDatabase } from './migration-test-helpers';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();

    if (cleanup) {
      await cleanup();
    }
  }
});

describe('0008_active_company_preferences migration', () => {
  it('adds company lifecycle status and user active-company preferences', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0008_tiny_scrambler.sql');

    const enumValuesResult = await database.pool.query<{
      enumValue: string;
    }>(`
      SELECT e.enumlabel AS "enumValue"
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname = 'company_status'
      ORDER BY e.enumsortorder ASC
    `);

    const tableColumnsResult = await database.pool.query<{
      tableName: string;
      columnName: string;
      dataType: string;
      udtName: string;
      isNullable: 'YES' | 'NO';
      columnDefault: string | null;
    }>(`
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS "isNullable",
        column_default AS "columnDefault"
      FROM information_schema.columns
      WHERE table_name IN ('companies', 'user_preferences')
      ORDER BY table_name ASC, ordinal_position ASC
    `);

    const foreignKeysResult = await database.pool.query<{
      constraintName: string;
      tableName: string;
      columnName: string;
      foreignTableName: string;
      foreignColumnName: string;
    }>(`
      SELECT
        tc.constraint_name AS "constraintName",
        tc.table_name AS "tableName",
        kcu.column_name AS "columnName",
        ccu.table_name AS "foreignTableName",
        ccu.column_name AS "foreignColumnName"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'user_preferences'
    `);

    expect(enumValuesResult.rows).toEqual([
      { enumValue: 'active' },
      { enumValue: 'suspended' },
      { enumValue: 'provisioning_failed' },
    ]);
    expect(tableColumnsResult.rows).toEqual([
      {
        tableName: 'companies',
        columnName: 'id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        tableName: 'companies',
        columnName: 'name',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        tableName: 'companies',
        columnName: 'created_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        tableName: 'companies',
        columnName: 'status',
        dataType: 'USER-DEFINED',
        udtName: 'company_status',
        isNullable: 'NO',
        columnDefault: "'active'::company_status",
      },
      {
        tableName: 'user_preferences',
        columnName: 'user_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
        columnDefault: null,
      },
      {
        tableName: 'user_preferences',
        columnName: 'active_company_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'YES',
        columnDefault: null,
      },
    ]);
    expect(foreignKeysResult.rows).toEqual([
      {
        constraintName: 'user_preferences_active_company_id_companies_id_fk',
        tableName: 'user_preferences',
        columnName: 'active_company_id',
        foreignTableName: 'companies',
        foreignColumnName: 'id',
      },
    ]);
  });
});
