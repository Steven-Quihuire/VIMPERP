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

describe('0006_item_catalog migration', () => {
  it('creates the item catalog enums and tables with the expected columns', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0006_item_catalog.sql');

    const enumValuesResult = await database.pool.query<{ enumName: string; enumValue: string }>(
      `SELECT
        t.typname AS "enumName",
        e.enumlabel AS "enumValue"
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname IN ('item_type', 'item_unit', 'item_track_batch_mode')
      ORDER BY t.typname ASC, e.enumsortorder ASC`,
    );

    const tableColumnsResult = await database.pool.query<{
      tableName: string;
      columnName: string;
      dataType: string;
      udtName: string;
      isNullable: 'YES' | 'NO';
    }>(
      `SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_name IN ('item_categories', 'items')
      ORDER BY table_name ASC, ordinal_position ASC`,
    );

    expect(enumValuesResult.rows).toEqual([
      { enumName: 'item_track_batch_mode', enumValue: 'none' },
      { enumName: 'item_track_batch_mode', enumValue: 'batch' },
      { enumName: 'item_track_batch_mode', enumValue: 'serial' },
      { enumName: 'item_type', enumValue: 'product' },
      { enumName: 'item_type', enumValue: 'service' },
      { enumName: 'item_unit', enumValue: 'unit' },
      { enumName: 'item_unit', enumValue: 'hour' },
      { enumName: 'item_unit', enumValue: 'kg' },
      { enumName: 'item_unit', enumValue: 'liter' },
      { enumName: 'item_unit', enumValue: 'meter' },
      { enumName: 'item_unit', enumValue: 'box' },
      { enumName: 'item_unit', enumValue: 'service' },
    ]);
    expect(tableColumnsResult.rows).toEqual([
      {
        tableName: 'item_categories',
        columnName: 'id',
        dataType: 'uuid',
        udtName: 'uuid',
        isNullable: 'NO',
      },
      {
        tableName: 'item_categories',
        columnName: 'company_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'item_categories',
        columnName: 'parent_id',
        dataType: 'uuid',
        udtName: 'uuid',
        isNullable: 'YES',
      },
      {
        tableName: 'item_categories',
        columnName: 'name',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'item_categories',
        columnName: 'created_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'id',
        dataType: 'uuid',
        udtName: 'uuid',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'company_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'category_id',
        dataType: 'uuid',
        udtName: 'uuid',
        isNullable: 'YES',
      },
      {
        tableName: 'items',
        columnName: 'sku',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'YES',
      },
      {
        tableName: 'items',
        columnName: 'name',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'type',
        dataType: 'USER-DEFINED',
        udtName: 'item_type',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'unit',
        dataType: 'USER-DEFINED',
        udtName: 'item_unit',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'unit_price',
        dataType: 'numeric',
        udtName: 'numeric',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'tracks_stock',
        dataType: 'boolean',
        udtName: 'bool',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'track_batch_mode',
        dataType: 'USER-DEFINED',
        udtName: 'item_track_batch_mode',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'deleted_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'YES',
      },
      {
        tableName: 'items',
        columnName: 'created_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
      },
      {
        tableName: 'items',
        columnName: 'updated_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
      },
    ]);
  });

  it('creates the composite category unique index and partial sku unique index', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0006_item_catalog.sql');

    const indexesResult = await database.pool.query<{
      tableName: string;
      indexName: string;
      indexDef: string;
    }>(
      `SELECT
        tablename AS "tableName",
        indexname AS "indexName",
        indexdef AS "indexDef"
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('item_categories', 'items')
      ORDER BY tablename ASC, indexname ASC`,
    );

    const indexSummaries = indexesResult.rows.map(
      ({ tableName, indexName, indexDef }) => `${tableName}:${indexName}:${indexDef}`,
    );

    expect(indexSummaries).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'item_categories:item_categories_company_parent_name_idx:CREATE UNIQUE INDEX item_categories_company_parent_name_idx ON public.item_categories USING btree (company_id, parent_id, name)',
        ),
        expect.stringContaining(
          'items:items_company_sku_idx:CREATE UNIQUE INDEX items_company_sku_idx ON public.items USING btree (company_id, sku)',
        ),
        expect.stringContaining('items:items_company_sku_idx:'),
        expect.stringContaining('WHERE (sku IS NOT NULL)'),
      ]),
    );
  });
});
