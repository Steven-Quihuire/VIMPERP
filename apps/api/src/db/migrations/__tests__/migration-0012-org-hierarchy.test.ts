import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Pool } from 'pg';

import { applyMigrationsThrough, createMigrationTestDatabase } from './migration-test-helpers';

let pool: Pool;
let cleanup: (() => Promise<void>) | undefined;

const getLatestMigrationFile = async () => {
  const migrationsDir = path.resolve(__dirname, '..');
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^\d{4}_.+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .at(-1);
};

describe('org-hierarchy sidebar migration (divisions, local scoping)', () => {
  beforeAll(async () => {
    const database = await createMigrationTestDatabase();
    cleanup = database.cleanup;
    pool = database.pool;

    // This file verifies the additive org-hierarchy shape through the company-integrity pass.
    await applyMigrationsThrough(pool, '0019_org_hierarchy_company_integrity.sql');
  });

  afterAll(async () => {
    await cleanup?.();
  });

  it('creates the divisions table with company FK and company-name uniqueness', async () => {
    const latestMigration = await getLatestMigrationFile();
    expect(latestMigration).toBeDefined();

    const divisionsColumns = await pool.query<{
      tableName: string;
      columnName: string;
      dataType: string;
      udtName: string;
      isNullable: 'YES' | 'NO';
    }>(`
      SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType",
        udt_name AS "udtName",
        is_nullable AS "isNullable"
      FROM information_schema.columns
      WHERE table_name = 'divisions'
      ORDER BY ordinal_position ASC
    `);

    expect(divisionsColumns.rows).toEqual([
      {
        tableName: 'divisions',
        columnName: 'id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'divisions',
        columnName: 'company_id',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'divisions',
        columnName: 'name',
        dataType: 'text',
        udtName: 'text',
        isNullable: 'NO',
      },
      {
        tableName: 'divisions',
        columnName: 'created_at',
        dataType: 'timestamp with time zone',
        udtName: 'timestamptz',
        isNullable: 'NO',
      },
    ]);

    const divisionsForeignKeys = await pool.query<{
      constraintName: string;
      columnName: string;
      foreignTableName: string;
      foreignColumnName: string;
    }>(`
      SELECT
        tc.constraint_name AS "constraintName",
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
        AND tc.table_name = 'divisions'
    `);

expect(divisionsForeignKeys.rows.some(
      (row) =>
        row.columnName === 'company_id' &&
        row.foreignTableName === 'companies' &&
        row.foreignColumnName === 'id',
    )).toBe(true);

    const divisionsIndexes = await pool.query<{
      indexName: string;
      isUnique: boolean;
      columnNames: string;
    }>(`
      SELECT
        i.relname AS "indexName",
        ix.indisunique AS "isUnique",
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS "columnNames"
      FROM pg_index ix
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = 'public'
        AND c.relname = 'divisions'
      GROUP BY i.relname, ix.indisunique
    `);

    expect(divisionsIndexes.rows).toContainEqual({
      indexName: 'divisions_company_name_idx',
      isUnique: true,
      columnNames: '{company_id,name}',
    });
  });

  it('adds nullable division_id to locals with FK to divisions', async () => {
    const localDivisionId = await pool.query<{
      isNullable: 'YES' | 'NO';
      dataType: string;
    }>(`
      SELECT is_nullable AS "isNullable", data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'locals' AND column_name = 'division_id'
    `);

    expect(localDivisionId.rows).toEqual([
      { isNullable: 'YES', dataType: 'text' },
    ]);

    const localForeignKeys = await pool.query<{
      columnName: string;
      foreignTableName: string;
      foreignColumnName: string;
    }>(`
      SELECT
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
        AND tc.table_name = 'locals'
    `);

    expect(localForeignKeys.rows).toContainEqual({
      columnName: 'division_id',
      foreignTableName: 'divisions',
      foreignColumnName: 'id',
    });
  });

  it('adds nullable division_id and local_id to memberships without FK', async () => {
    const membershipNewColumns = await pool.query<{
      columnName: string;
      isNullable: 'YES' | 'NO';
      dataType: string;
    }>(`
      SELECT
        column_name AS "columnName",
        is_nullable AS "isNullable",
        data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'memberships'
        AND column_name IN ('division_id', 'local_id')
      ORDER BY column_name ASC
    `);

    expect(membershipNewColumns.rows).toEqual([
      { columnName: 'division_id', isNullable: 'YES', dataType: 'text' },
      { columnName: 'local_id', isNullable: 'YES', dataType: 'text' },
    ]);

    const membershipForeignKeys = await pool.query<{
      columnName: string;
      foreignTableName: string;
    }>(`
      SELECT
        kcu.column_name AS "columnName",
        ccu.table_name AS "foreignTableName"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'memberships'
        AND kcu.column_name IN ('division_id', 'local_id')
    `);

    expect(membershipForeignKeys.rows).toEqual([]);
  });

  it('adds nullable local_id to items and replaces the unique index with (company_id, local_id, sku)', async () => {
    const itemsLocalId = await pool.query<{
      isNullable: 'YES' | 'NO';
      dataType: string;
    }>(`
      SELECT is_nullable AS "isNullable", data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'items' AND column_name = 'local_id'
    `);

    expect(itemsLocalId.rows).toEqual([{ isNullable: 'YES', dataType: 'text' }]);

    const itemsIndexes = await pool.query<{
      indexName: string;
      isUnique: boolean;
      columnNames: string;
      whereClause: string | null;
    }>(`
      SELECT
        i.relname AS "indexName",
        ix.indisunique AS "isUnique",
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS "columnNames",
        pg_get_expr(ix.indpred, ix.indrelid) AS "whereClause"
      FROM pg_index ix
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = 'public'
        AND c.relname = 'items'
        AND i.relname LIKE 'items_%_idx'
      GROUP BY i.relname, ix.indisunique, ix.indpred, ix.indrelid
    `);

    const indexNames = itemsIndexes.rows.map((row) => row.indexName);

    expect(indexNames).not.toContain('items_company_sku_idx');
    expect(indexNames).toContain('items_company_local_sku_idx');

    const itemsIdx = itemsIndexes.rows.find(
      (row) => row.indexName === 'items_company_local_sku_idx',
    );
    expect(itemsIdx).toBeDefined();
    expect(itemsIdx!.isUnique).toBe(true);
    expect(itemsIdx!.columnNames).toBe('{company_id,local_id,sku}');
    expect(itemsIdx!.whereClause).toContain('sku IS NOT NULL');
  });

  it('adds nullable local_id to item_categories and replaces the unique index', async () => {
    const categoryLocalId = await pool.query<{
      isNullable: 'YES' | 'NO';
      dataType: string;
    }>(`
      SELECT is_nullable AS "isNullable", data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'item_categories' AND column_name = 'local_id'
    `);

    expect(categoryLocalId.rows).toEqual([{ isNullable: 'YES', dataType: 'text' }]);

    const categoryIndexes = await pool.query<{
      indexName: string;
      isUnique: boolean;
      columnNames: string;
    }>(`
      SELECT
        i.relname AS "indexName",
        ix.indisunique AS "isUnique",
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS "columnNames"
      FROM pg_index ix
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = 'public'
        AND c.relname = 'item_categories'
        AND i.relname LIKE 'item_categories_%_idx'
      GROUP BY i.relname, ix.indisunique
    `);

    const indexNames = categoryIndexes.rows.map((row) => row.indexName);

    expect(indexNames).not.toContain('item_categories_company_parent_name_idx');
    expect(indexNames).toContain('item_categories_company_local_parent_name_idx');
    expect(categoryIndexes.rows).toContainEqual({
      indexName: 'item_categories_company_local_parent_name_idx',
      isUnique: true,
      columnNames: '{company_id,local_id,parent_id,name}',
    });
  });

  it('adds nullable active_local_id to user_preferences', async () => {
    const prefLocalId = await pool.query<{
      isNullable: 'YES' | 'NO';
      dataType: string;
    }>(`
      SELECT is_nullable AS "isNullable", data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'user_preferences' AND column_name = 'active_local_id'
    `);

    expect(prefLocalId.rows).toEqual([{ isNullable: 'YES', dataType: 'text' }]);
  });

  it('enforces same-company composite parent foreign keys across hierarchy tables', async () => {
    const foreignKeys = await pool.query<{
      tableName: string;
      constraintName: string;
      columnNames: string;
      foreignTableName: string;
      foreignColumnNames: string;
    }>(`
      SELECT
        tc.table_name AS "tableName",
        tc.constraint_name AS "constraintName",
        array_to_string(array_agg(DISTINCT kcu.column_name ORDER BY kcu.column_name), ',') AS "columnNames",
        ccu.table_name AS "foreignTableName",
        array_to_string(array_agg(DISTINCT ccu.column_name ORDER BY ccu.column_name), ',') AS "foreignColumnNames"
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('locals', 'areas', 'warehouses', 'points_of_sale')
        AND tc.constraint_name IN (
          'locals_division_company_fk',
          'areas_division_company_fk',
          'areas_local_company_fk',
          'warehouses_area_company_fk',
          'warehouses_local_company_fk',
          'points_of_sale_area_company_fk',
          'points_of_sale_local_company_fk'
        )
      GROUP BY tc.table_name, tc.constraint_name, ccu.table_name
      ORDER BY tc.table_name, tc.constraint_name
    `);

    expect(foreignKeys.rows).toEqual([
      {
        tableName: 'areas',
        constraintName: 'areas_division_company_fk',
        columnNames: 'company_id,division_id',
        foreignTableName: 'divisions',
        foreignColumnNames: 'company_id,id',
      },
      {
        tableName: 'areas',
        constraintName: 'areas_local_company_fk',
        columnNames: 'company_id,local_id',
        foreignTableName: 'locals',
        foreignColumnNames: 'company_id,id',
      },
      {
        tableName: 'locals',
        constraintName: 'locals_division_company_fk',
        columnNames: 'company_id,division_id',
        foreignTableName: 'divisions',
        foreignColumnNames: 'company_id,id',
      },
      {
        tableName: 'points_of_sale',
        constraintName: 'points_of_sale_area_company_fk',
        columnNames: 'area_id,company_id',
        foreignTableName: 'areas',
        foreignColumnNames: 'company_id,id',
      },
      {
        tableName: 'points_of_sale',
        constraintName: 'points_of_sale_local_company_fk',
        columnNames: 'company_id,local_id',
        foreignTableName: 'locals',
        foreignColumnNames: 'company_id,id',
      },
      {
        tableName: 'warehouses',
        constraintName: 'warehouses_area_company_fk',
        columnNames: 'area_id,company_id',
        foreignTableName: 'areas',
        foreignColumnNames: 'company_id,id',
      },
      {
        tableName: 'warehouses',
        constraintName: 'warehouses_local_company_fk',
        columnNames: 'company_id,local_id',
        foreignTableName: 'locals',
        foreignColumnNames: 'company_id,id',
      },
    ]);
  });

  it('adds nullable division_id and local_id to audit_events and indexes local_id', async () => {
    const auditNewColumns = await pool.query<{
      columnName: string;
      isNullable: 'YES' | 'NO';
      dataType: string;
    }>(`
      SELECT
        column_name AS "columnName",
        is_nullable AS "isNullable",
        data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'audit_events'
        AND column_name IN ('division_id', 'local_id')
      ORDER BY column_name ASC
    `);

    expect(auditNewColumns.rows).toEqual([
      { columnName: 'division_id', isNullable: 'YES', dataType: 'text' },
      { columnName: 'local_id', isNullable: 'YES', dataType: 'text' },
    ]);

    const auditLocalIdIndex = await pool.query<{
      indexName: string;
      columnNames: string;
    }>(`
      SELECT
        i.relname AS "indexName",
        array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS "columnNames"
      FROM pg_index ix
      JOIN pg_class c ON c.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
      WHERE n.nspname = 'public'
        AND c.relname = 'audit_events'
        AND i.relname = 'audit_events_local_id_idx'
      GROUP BY i.relname
    `);

    expect(auditLocalIdIndex.rows).toEqual([
      { indexName: 'audit_events_local_id_idx', columnNames: '{local_id}' },
    ]);
  });
});
