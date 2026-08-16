import { afterEach, describe, expect, it } from 'vitest';

import type { Pool } from 'pg';

import {
  applyMigrationFile,
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from './migration-test-helpers';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
});

const migrationFile = '0027_inventory_foundation.sql';
const baselineMigrationFile = '0026_timesheets.sql';

const companyOneId = 'company-inventory-1';
const companyTwoId = 'company-inventory-2';
const companyOneWarehouseId = 'warehouse-1';
const companyTwoWarehouseId = 'warehouse-2';
const companyOnePointOfSaleId = 'point-of-sale-1';
const companyOneDivisionId = 'division-1';
const companyOneItemId = '00000000-0000-0000-0000-000000000101';
const companyTwoItemId = '00000000-0000-0000-0000-000000000202';
const companyOneLotId = '00000000-0000-0000-0000-000000000301';
const companyTwoLotId = '00000000-0000-0000-0000-000000000302';

const listTableColumns = async (pool: Pool, tableName: string) => {
  const result = await pool.query<{ columnName: string }>(
    `
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position ASC
    `,
    [tableName],
  );

  return result.rows.map((row) => row.columnName);
};

const getScopeNodeId = async (
  pool: Pool,
  nodeType: string,
  sourceId: string,
  companyId: string,
) => {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM scope_nodes
      WHERE node_type = $1
        AND source_id = $2
        AND company_id = $3
      LIMIT 1
    `,
    [nodeType, sourceId, companyId],
  );

  const scopeNodeId = result.rows[0]?.id;

  expect(scopeNodeId).toBeDefined();

  return scopeNodeId as string;
};

const seedInventoryFixture = async (pool: Pool) => {
  await pool.query(`
    INSERT INTO companies (id, name, status, created_at)
    VALUES
      ('${companyOneId}', 'Inventory Co', 'active', now()),
      ('${companyTwoId}', 'Other Inventory Co', 'active', now())
  `);

  await pool.query(`
    INSERT INTO users (id, email, username, password_hash)
    VALUES
      ('user-1', 'inventory.owner@example.com', 'inventory-owner', 'hash'),
      ('user-2', 'inventory.other@example.com', 'inventory-other', 'hash')
  `);

  await pool.query(`
    INSERT INTO divisions (id, company_id, name, created_at)
    VALUES
      ('${companyOneDivisionId}', '${companyOneId}', 'Operations', now())
  `);

  await pool.query(`
    INSERT INTO locals (id, company_id, division_id, name, locale)
    VALUES
      ('local-1', '${companyOneId}', NULL, 'HQ', 'en-US'),
      ('local-2', '${companyTwoId}', NULL, 'Branch', 'en-US')
  `);

  await pool.query(`
    INSERT INTO areas (id, company_id, division_id, local_id, name)
    VALUES
      ('area-1', '${companyOneId}', NULL, 'local-1', 'Receiving'),
      ('area-2', '${companyTwoId}', NULL, 'local-2', 'Receiving')
  `);

  await pool.query(`
    INSERT INTO warehouses (id, company_id, area_id, local_id, name)
    VALUES
      ('${companyOneWarehouseId}', '${companyOneId}', 'area-1', NULL, 'Main Warehouse'),
      ('${companyTwoWarehouseId}', '${companyTwoId}', 'area-2', NULL, 'Remote Warehouse')
  `);

  await pool.query(`
    INSERT INTO points_of_sale (id, company_id, area_id, local_id, name)
    VALUES
      ('${companyOnePointOfSaleId}', '${companyOneId}', NULL, 'local-1', 'Front Counter')
  `);

  await pool.query(`
    INSERT INTO items (
      id,
      company_id,
      category_id,
      sku,
      local_id,
      name,
      type,
      unit,
      unit_price,
      tracks_stock,
      track_batch_mode
    )
    VALUES
      (
        '${companyOneItemId}',
        '${companyOneId}',
        NULL,
        'INV-001',
        NULL,
        'Batch Tracked Item',
        'product',
        'unit',
        10,
        true,
        'batch'
      ),
      (
        '${companyTwoItemId}',
        '${companyTwoId}',
        NULL,
        'INV-002',
        NULL,
        'Other Company Item',
        'product',
        'unit',
        12,
        true,
        'batch'
      )
  `);

  const warehouseScopeNodeId = await getScopeNodeId(
    pool,
    'warehouse',
    companyOneWarehouseId,
    companyOneId,
  );
  const pointOfSaleScopeNodeId = await getScopeNodeId(
    pool,
    'point-of-sale',
    companyOnePointOfSaleId,
    companyOneId,
  );
  const divisionScopeNodeId = await getScopeNodeId(
    pool,
    'division',
    companyOneDivisionId,
    companyOneId,
  );
  const companyTwoWarehouseScopeNodeId = await getScopeNodeId(
    pool,
    'warehouse',
    companyTwoWarehouseId,
    companyTwoId,
  );

  await pool.query(`
    INSERT INTO stock_lots (id, company_id, item_id, lot_number, expires_at)
    VALUES
      ('${companyOneLotId}', '${companyOneId}', '${companyOneItemId}', 'LOT-001', '2026-12-31'),
      ('${companyTwoLotId}', '${companyTwoId}', '${companyTwoItemId}', 'LOT-002', '2026-12-31')
  `);

  return {
    warehouseScopeNodeId,
    pointOfSaleScopeNodeId,
    divisionScopeNodeId,
    companyTwoWarehouseScopeNodeId,
  };
};

type StockDocumentInsert = {
  id: string;
  documentNo: string;
  type: 'receipt' | 'transfer' | 'adjustment' | 'loss';
  status?: 'draft' | 'confirmed' | 'cancelled';
  originScopeNodeId?: string | null;
  originScopeType?: string | null;
  destinationScopeNodeId?: string | null;
  destinationScopeType?: string | null;
  reversalOfId?: string | null;
  note?: string | null;
};

const insertStockDocument = async (pool: Pool, document: StockDocumentInsert) => {
  await pool.query(
    `
      INSERT INTO stock_documents (
        id,
        company_id,
        document_no,
        type,
        status,
        origin_scope_node_id,
        origin_scope_type,
        destination_scope_node_id,
        destination_scope_type,
        occurred_at,
        created_by_user_id,
        reversal_of_id,
        note
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13
      )
    `,
    [
      document.id,
      companyOneId,
      document.documentNo,
      document.type,
      document.status ?? 'draft',
      document.originScopeNodeId ?? null,
      document.originScopeType ?? null,
      document.destinationScopeNodeId ?? null,
      document.destinationScopeType ?? null,
      '2026-08-16T10:00:00.000Z',
      'user-1',
      document.reversalOfId ?? null,
      document.note ?? null,
    ],
  );
};

describe('inventory foundation migration', () => {
  it('adds inventory tables, enums, foreign keys, indexes, and scope triggers', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, baselineMigrationFile);
    await applyMigrationFile(database.pool, migrationFile);

    await expect(listTableColumns(database.pool, 'stock_lots')).resolves.toEqual([
      'id',
      'company_id',
      'item_id',
      'lot_number',
      'expires_at',
      'created_at',
      'updated_at',
    ]);
    await expect(listTableColumns(database.pool, 'stock_documents')).resolves.toEqual([
      'id',
      'company_id',
      'document_no',
      'type',
      'status',
      'origin_scope_node_id',
      'origin_scope_type',
      'destination_scope_node_id',
      'destination_scope_type',
      'occurred_at',
      'created_by_user_id',
      'reversal_of_id',
      'note',
      'created_at',
      'updated_at',
    ]);
    await expect(listTableColumns(database.pool, 'stock_document_lines')).resolves.toEqual([
      'id',
      'company_id',
      'document_id',
      'item_id',
      'quantity',
      'unit_cost',
      'lot_id',
      'created_at',
    ]);
    await expect(listTableColumns(database.pool, 'stock_quants')).resolves.toEqual([
      'id',
      'company_id',
      'item_id',
      'scope_node_id',
      'scope_type',
      'lot_id',
      'quantity',
      'reserved_quantity',
      'quarantine_quantity',
      'avg_unit_cost',
      'created_at',
      'updated_at',
    ]);

    const enumLabels = await database.pool.query<{ typeName: string; label: string }>(`
      SELECT
        t.typname AS "typeName",
        e.enumlabel AS label
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname IN ('stock_document_type', 'stock_document_status')
      ORDER BY t.typname, e.enumsortorder
    `);

    expect(enumLabels.rows).toEqual([
      { typeName: 'stock_document_status', label: 'draft' },
      { typeName: 'stock_document_status', label: 'confirmed' },
      { typeName: 'stock_document_status', label: 'cancelled' },
      { typeName: 'stock_document_type', label: 'receipt' },
      { typeName: 'stock_document_type', label: 'transfer' },
      { typeName: 'stock_document_type', label: 'adjustment' },
      { typeName: 'stock_document_type', label: 'loss' },
    ]);

    const foreignKeys = await database.pool.query<{ tableName: string; constraintName: string }>(`
      SELECT
        tc.table_name AS "tableName",
        tc.constraint_name AS "constraintName"
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (
          'stock_lots',
          'stock_documents',
          'stock_document_lines',
          'stock_quants'
        )
      ORDER BY tc.table_name, tc.constraint_name
    `);

    expect(foreignKeys.rows).toEqual(
      expect.arrayContaining([
        { tableName: 'stock_lots', constraintName: 'stock_lots_item_company_fk' },
        {
          tableName: 'stock_documents',
          constraintName: 'stock_documents_destination_scope_node_company_fk',
        },
        {
          tableName: 'stock_documents',
          constraintName: 'stock_documents_origin_scope_node_company_fk',
        },
        {
          tableName: 'stock_document_lines',
          constraintName: 'stock_document_lines_document_company_fk',
        },
        {
          tableName: 'stock_document_lines',
          constraintName: 'stock_document_lines_lot_company_fk',
        },
        {
          tableName: 'stock_quants',
          constraintName: 'stock_quants_scope_node_company_fk',
        },
      ]),
    );

    const quantIndex = await database.pool.query<{ indexDef: string }>(`
      SELECT indexdef AS "indexDef"
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'stock_quants'
        AND indexname = 'stock_quants_company_item_scope_lot_uk'
    `);

    expect(quantIndex.rows).toEqual([
      {
        indexDef:
          'CREATE UNIQUE INDEX stock_quants_company_item_scope_lot_uk ON public.stock_quants USING btree (company_id, item_id, scope_node_id, lot_id) NULLS NOT DISTINCT',
      },
    ]);

    const triggers = await database.pool.query<{ triggerName: string }>(`
      SELECT tgname AS "triggerName"
      FROM pg_trigger
      WHERE tgrelid IN ('stock_documents'::regclass, 'stock_quants'::regclass)
        AND NOT tgisinternal
      ORDER BY tgname
    `);

    expect(triggers.rows).toEqual([
      { triggerName: 'stock_documents_scope_type_check_trg' },
      { triggerName: 'stock_quants_scope_type_check_trg' },
    ]);
  }, 30000);

  it('rejects invalid scope shapes, tenant leaks, and impossible inventory states', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, baselineMigrationFile);
    await applyMigrationFile(database.pool, migrationFile);

    const {
      warehouseScopeNodeId,
      pointOfSaleScopeNodeId,
      divisionScopeNodeId,
      companyTwoWarehouseScopeNodeId,
    } = await seedInventoryFixture(database.pool);

    await expect(
      database.pool.query(`
        INSERT INTO stock_documents (
          id,
          company_id,
          document_no,
          type,
          status,
          origin_scope_node_id,
          origin_scope_type,
          destination_scope_node_id,
          destination_scope_type,
          occurred_at,
          created_by_user_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000401',
          '${companyOneId}',
          'DOC-BAD-RECEIPT',
          'receipt',
          'draft',
          '${warehouseScopeNodeId}',
          'warehouse',
          '${pointOfSaleScopeNodeId}',
          'point-of-sale',
          now(),
          'user-1'
        )
      `),
    ).rejects.toThrow(/stock_documents_receipt_shape_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_documents (
          id,
          company_id,
          document_no,
          type,
          status,
          destination_scope_node_id,
          destination_scope_type,
          occurred_at,
          created_by_user_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000402',
          '${companyOneId}',
          'DOC-BAD-PAIR',
          'receipt',
          'draft',
          '${warehouseScopeNodeId}',
          NULL,
          now(),
          'user-1'
        )
      `),
    ).rejects.toThrow(/stock_documents_destination_scope_type_mismatch/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_documents (
          id,
          company_id,
          document_no,
          type,
          status,
          origin_scope_node_id,
          origin_scope_type,
          destination_scope_node_id,
          destination_scope_type,
          occurred_at,
          created_by_user_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000416',
          '${companyOneId}',
          'DOC-BAD-ORIGIN-PAIR',
          'transfer',
          'draft',
          NULL,
          'warehouse',
          '${pointOfSaleScopeNodeId}',
          'point-of-sale',
          now(),
          'user-1'
        )
      `),
    ).rejects.toThrow(/stock_documents_origin_scope_pair_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_documents (
          id,
          company_id,
          document_no,
          type,
          status,
          origin_scope_node_id,
          origin_scope_type,
          occurred_at,
          created_by_user_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000403',
          '${companyOneId}',
          'DOC-BAD-SCOPE-CHECK',
          'loss',
          'draft',
          '${divisionScopeNodeId}',
          'division',
          now(),
          'user-1'
        )
      `),
    ).rejects.toThrow(/stock_documents_origin_scope_type_warehouse_pos_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_documents (
          id,
          company_id,
          document_no,
          type,
          status,
          destination_scope_node_id,
          destination_scope_type,
          occurred_at,
          created_by_user_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000404',
          '${companyOneId}',
          'DOC-BAD-SCOPE-TRIGGER',
          'receipt',
          'draft',
          '${warehouseScopeNodeId}',
          'point-of-sale',
          now(),
          'user-1'
        )
      `),
    ).rejects.toThrow(/stock_documents_destination_scope_type_mismatch/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_documents (
          id,
          company_id,
          document_no,
          type,
          status,
          destination_scope_node_id,
          destination_scope_type,
          occurred_at,
          created_by_user_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000405',
          '${companyOneId}',
          'DOC-CROSS-COMPANY',
          'receipt',
          'draft',
          '${companyTwoWarehouseScopeNodeId}',
          'warehouse',
          now(),
          'user-1'
        )
      `),
    ).rejects.toThrow(/stock_documents_destination_scope_node_missing/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_lots (id, company_id, item_id, lot_number)
        VALUES (
          '00000000-0000-0000-0000-000000000303',
          '${companyOneId}',
          '${companyTwoItemId}',
          'LOT-CROSS-COMPANY'
        )
      `),
    ).rejects.toThrow(/stock_lots_item_company_fk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_lots (id, company_id, item_id, lot_number)
        VALUES (
          '00000000-0000-0000-0000-000000000304',
          '${companyOneId}',
          '${companyOneItemId}',
          'LOT-001'
        )
      `),
    ).rejects.toThrow(/stock_lots_company_item_lot_idx/);

    await database.pool.query(`
      INSERT INTO stock_documents (
        id,
        company_id,
        document_no,
        type,
        status,
        destination_scope_node_id,
        destination_scope_type,
        occurred_at,
        created_by_user_id
      )
      VALUES (
        '00000000-0000-0000-0000-000000000406',
        '${companyOneId}',
        'DOC-LINE-BASE',
        'receipt',
        'draft',
        '${warehouseScopeNodeId}',
        'warehouse',
        now(),
        'user-1'
      )
    `);

    await expect(
      database.pool.query(`
        INSERT INTO stock_document_lines (
          id,
          company_id,
          document_id,
          item_id,
          quantity,
          unit_cost,
          lot_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000407',
          '${companyOneId}',
          '00000000-0000-0000-0000-000000000406',
          '${companyOneItemId}',
          0,
          10,
          '${companyOneLotId}'
        )
      `),
    ).rejects.toThrow(/stock_document_lines_quantity_positive_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_document_lines (
          id,
          company_id,
          document_id,
          item_id,
          quantity,
          unit_cost,
          lot_id
        )
        VALUES (
          '00000000-0000-0000-0000-000000000408',
          '${companyOneId}',
          '00000000-0000-0000-0000-000000000406',
          '${companyOneItemId}',
          2,
          10,
          '${companyTwoLotId}'
        )
      `),
    ).rejects.toThrow(/stock_document_lines_lot_company_fk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          quantity,
          reserved_quantity,
          quarantine_quantity
        )
        VALUES (
          '00000000-0000-0000-0000-000000000409',
          '${companyOneId}',
          '${companyOneItemId}',
          '${divisionScopeNodeId}',
          'division',
          5,
          0,
          0
        )
      `),
    ).rejects.toThrow(/stock_quants_scope_type_warehouse_pos_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          quantity,
          reserved_quantity,
          quarantine_quantity
        )
        VALUES (
          '00000000-0000-0000-0000-000000000410',
          '${companyOneId}',
          '${companyOneItemId}',
          '${warehouseScopeNodeId}',
          'point-of-sale',
          5,
          0,
          0
        )
      `),
    ).rejects.toThrow(/stock_quants_scope_type_mismatch/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          quantity,
          reserved_quantity,
          quarantine_quantity
        )
        VALUES (
          '00000000-0000-0000-0000-000000000411',
          '${companyOneId}',
          '${companyTwoItemId}',
          '${warehouseScopeNodeId}',
          'warehouse',
          5,
          0,
          0
        )
      `),
    ).rejects.toThrow(/stock_quants_item_company_fk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          quantity,
          reserved_quantity,
          quarantine_quantity
        )
        VALUES (
          '00000000-0000-0000-0000-000000000412',
          '${companyOneId}',
          '${companyOneItemId}',
          '${warehouseScopeNodeId}',
          'warehouse',
          -1,
          0,
          0
        )
      `),
    ).rejects.toThrow(/stock_quants_quantity_nonnegative_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          quantity,
          reserved_quantity,
          quarantine_quantity
        )
        VALUES (
          '00000000-0000-0000-0000-000000000413',
          '${companyOneId}',
          '${companyOneItemId}',
          '${warehouseScopeNodeId}',
          'warehouse',
          5,
          4,
          2
        )
      `),
    ).rejects.toThrow(/stock_quants_reserved_quarantine_within_quantity_chk/);

    await database.pool.query(`
      INSERT INTO stock_quants (
        id,
        company_id,
        item_id,
        scope_node_id,
        scope_type,
        lot_id,
        quantity,
        reserved_quantity,
        quarantine_quantity
      )
      VALUES (
        '00000000-0000-0000-0000-000000000414',
        '${companyOneId}',
        '${companyOneItemId}',
        '${warehouseScopeNodeId}',
        'warehouse',
        NULL,
        5,
        0,
        0
      )
    `);

    await expect(
      database.pool.query(`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          lot_id,
          quantity,
          reserved_quantity,
          quarantine_quantity
        )
        VALUES (
          '00000000-0000-0000-0000-000000000415',
          '${companyOneId}',
          '${companyOneItemId}',
          '${warehouseScopeNodeId}',
          'warehouse',
          NULL,
          3,
          0,
          0
        )
      `),
    ).rejects.toThrow(/stock_quants_company_item_scope_lot_uk/);
  }, 30000);

  it('persists a valid lot, document, line, and quant happy path', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, baselineMigrationFile);
    await applyMigrationFile(database.pool, migrationFile);

    const { warehouseScopeNodeId } = await seedInventoryFixture(database.pool);

    await database.pool.query(`
      INSERT INTO stock_documents (
        id,
        company_id,
        document_no,
        type,
        status,
        destination_scope_node_id,
        destination_scope_type,
        occurred_at,
        created_by_user_id,
        note
      )
      VALUES (
        '00000000-0000-0000-0000-000000000501',
        '${companyOneId}',
        'DOC-OK-001',
        'receipt',
        'confirmed',
        '${warehouseScopeNodeId}',
        'warehouse',
        '2026-08-16T10:00:00.000Z',
        'user-1',
        'Initial inventory receipt'
      )
    `);

    await database.pool.query(`
      INSERT INTO stock_document_lines (
        id,
        company_id,
        document_id,
        item_id,
        quantity,
        unit_cost,
        lot_id
      )
      VALUES (
        '00000000-0000-0000-0000-000000000502',
        '${companyOneId}',
        '00000000-0000-0000-0000-000000000501',
        '${companyOneItemId}',
        5,
        12.3456,
        '${companyOneLotId}'
      )
    `);

    await database.pool.query(`
      INSERT INTO stock_quants (
        id,
        company_id,
        item_id,
        scope_node_id,
        scope_type,
        lot_id,
        quantity,
        reserved_quantity,
        quarantine_quantity,
        avg_unit_cost
      )
      VALUES (
        '00000000-0000-0000-0000-000000000503',
        '${companyOneId}',
        '${companyOneItemId}',
        '${warehouseScopeNodeId}',
        'warehouse',
        '${companyOneLotId}',
        5,
        1,
        1,
        12.3456
      )
    `);

    const persistedInventory = await database.pool.query<{
      documentStatus: string;
      destinationScopeType: string | null;
      quantity: string;
      unitCost: string | null;
      quantQuantity: string;
      avgUnitCost: string | null;
      lotNumber: string;
    }>(`
      SELECT
        d.status::text AS "documentStatus",
        d.destination_scope_type AS "destinationScopeType",
        l.quantity::text AS quantity,
        l.unit_cost::text AS "unitCost",
        q.quantity::text AS "quantQuantity",
        q.avg_unit_cost::text AS "avgUnitCost",
        lot.lot_number AS "lotNumber"
      FROM stock_documents d
      JOIN stock_document_lines l
        ON l.document_id = d.id
       AND l.company_id = d.company_id
      JOIN stock_quants q
        ON q.item_id = l.item_id
       AND q.company_id = l.company_id
       AND q.scope_node_id = d.destination_scope_node_id
       AND q.lot_id = l.lot_id
      JOIN stock_lots lot
        ON lot.id = l.lot_id
       AND lot.company_id = l.company_id
      WHERE d.id = '00000000-0000-0000-0000-000000000501'
    `);

    expect(persistedInventory.rows).toEqual([
      {
        documentStatus: 'confirmed',
        destinationScopeType: 'warehouse',
        quantity: '5.000',
        unitCost: '12.3456',
        quantQuantity: '5.000',
        avgUnitCost: '12.3456',
        lotNumber: 'LOT-001',
      },
    ]);
  }, 30000);

  it('accepts valid transfer, adjustment, and loss document writes', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, baselineMigrationFile);
    await applyMigrationFile(database.pool, migrationFile);

    const { warehouseScopeNodeId, pointOfSaleScopeNodeId } = await seedInventoryFixture(database.pool);

    await insertStockDocument(database.pool, {
      id: '00000000-0000-0000-0000-000000000601',
      documentNo: 'DOC-TRANSFER-OK',
      type: 'transfer',
      originScopeNodeId: warehouseScopeNodeId,
      originScopeType: 'warehouse',
      destinationScopeNodeId: pointOfSaleScopeNodeId,
      destinationScopeType: 'point-of-sale',
      note: 'Warehouse to counter transfer',
    });

    await insertStockDocument(database.pool, {
      id: '00000000-0000-0000-0000-000000000602',
      documentNo: 'DOC-ADJUSTMENT-OK',
      type: 'adjustment',
      originScopeNodeId: warehouseScopeNodeId,
      originScopeType: 'warehouse',
      note: 'Cycle count adjustment',
    });

    await insertStockDocument(database.pool, {
      id: '00000000-0000-0000-0000-000000000603',
      documentNo: 'DOC-LOSS-OK',
      type: 'loss',
      originScopeNodeId: pointOfSaleScopeNodeId,
      originScopeType: 'point-of-sale',
      note: 'Shrinkage write-off',
    });

    const persistedDocuments = await database.pool.query<{
      documentNo: string;
      type: string;
      originScopeType: string | null;
      destinationScopeType: string | null;
    }>(`
      SELECT
        document_no AS "documentNo",
        type::text AS type,
        origin_scope_type AS "originScopeType",
        destination_scope_type AS "destinationScopeType"
      FROM stock_documents
      WHERE document_no IN ('DOC-TRANSFER-OK', 'DOC-ADJUSTMENT-OK', 'DOC-LOSS-OK')
      ORDER BY document_no ASC
    `);

    expect(persistedDocuments.rows).toEqual([
      {
        documentNo: 'DOC-ADJUSTMENT-OK',
        type: 'adjustment',
        originScopeType: 'warehouse',
        destinationScopeType: null,
      },
      {
        documentNo: 'DOC-LOSS-OK',
        type: 'loss',
        originScopeType: 'point-of-sale',
        destinationScopeType: null,
      },
      {
        documentNo: 'DOC-TRANSFER-OK',
        type: 'transfer',
        originScopeType: 'warehouse',
        destinationScopeType: 'point-of-sale',
      },
    ]);
  }, 30000);

  it('rejects reversal rows unless the reversal document is confirmed', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, baselineMigrationFile);
    await applyMigrationFile(database.pool, migrationFile);

    const { warehouseScopeNodeId } = await seedInventoryFixture(database.pool);

    await insertStockDocument(database.pool, {
      id: '00000000-0000-0000-0000-000000000701',
      documentNo: 'DOC-REVERSAL-BASE',
      type: 'receipt',
      status: 'confirmed',
      destinationScopeNodeId: warehouseScopeNodeId,
      destinationScopeType: 'warehouse',
      note: 'Base document for reversal checks',
    });

    await expect(
      insertStockDocument(database.pool, {
        id: '00000000-0000-0000-0000-000000000702',
        documentNo: 'DOC-REVERSAL-DRAFT',
        type: 'receipt',
        status: 'draft',
        destinationScopeNodeId: warehouseScopeNodeId,
        destinationScopeType: 'warehouse',
        reversalOfId: '00000000-0000-0000-0000-000000000701',
        note: 'Draft reversal should fail',
      }),
    ).rejects.toThrow(/stock_documents_reversal_confirmed_chk/);
  }, 30000);
});
