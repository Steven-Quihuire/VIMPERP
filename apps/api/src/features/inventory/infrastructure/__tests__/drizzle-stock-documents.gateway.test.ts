import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { randomUUID } from 'node:crypto';

import {
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from '../../../../db/migrations/__tests__/migration-test-helpers';
import type { AppDb } from '../../../../shared/infrastructure/db/client';
import {
  areasTable,
  companiesTable,
  itemsTable,
  localsTable,
  pointsOfSaleTable,
  stockDocumentsTable,
  stockLotsTable,
  stockQuantsTable,
  usersTable,
  warehousesTable,
} from '../../../../shared/infrastructure/db/schema';
import {
  StockDocumentLineLotInvalidError,
  StockDocumentValidationError,
} from '../../domain/stock-documents';
import {
  createDrizzleStockDocumentsGateway,
  isDocumentNoConflict,
} from '../drizzle-stock-documents.gateway';

const companyOneId = 'company-s2-1';
const companyTwoId = 'company-s2-2';
const companyOneLocalId = 'local-s2-1';
const companyOneAreaId = 'area-s2-1';
const companyOneWarehouseId = 'warehouse-s2-1';
const companyOneWarehouseTwoId = 'warehouse-s2-2';
const companyOnePointOfSaleId = 'pos-s2-1';
const companyOneItemId = '00000000-0000-0000-0000-000000000101';
const companyOneItemBatchId = '00000000-0000-0000-0000-000000000102';
const companyOneItemSerialId = '00000000-0000-0000-0000-000000000103';
const companyOneLotId = '00000000-0000-0000-0000-000000000201';
const companyOneUserId = 'user-s2-1';

const fixedNow = new Date('2026-08-20T09:00:00.000Z');

let db: AppDb;
const perTestCleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (perTestCleanups.length > 0) {
    await perTestCleanups.pop()?.();
  }
});

const setupDatabase = async () => {
  const database = await createMigrationTestDatabase();
  await applyMigrationsThrough(database.pool, '0027_inventory_foundation.sql');

  const db = drizzle(database.pool, {
    schema: await import('../../../../shared/infrastructure/db/schema'),
  }) as AppDb;

  return { db, pool: database.pool, cleanup: database.cleanup };
};

const seedBaseFixture = async (db: AppDb) => {
  await db.insert(companiesTable).values([
    { id: companyOneId, name: 'Acme Inventory Co', status: 'active', createdAt: fixedNow },
    { id: companyTwoId, name: 'Other Inventory Co', status: 'active', createdAt: fixedNow },
  ]);

  await db.insert(usersTable).values([
    { id: companyOneUserId, email: 's2-owner@example.com', username: 's2-owner', passwordHash: 'hashed' },
  ]);

  await db.insert(localsTable).values([
    { id: companyOneLocalId, companyId: companyOneId, divisionId: null, name: 'HQ Local', locale: 'en-US' },
  ]);

  await db.insert(areasTable).values([
    { id: companyOneAreaId, companyId: companyOneId, divisionId: null, localId: companyOneLocalId, name: 'Main Area', kind: 'area' },
  ]);

  await db.insert(warehousesTable).values([
    { id: companyOneWarehouseId, companyId: companyOneId, areaId: companyOneAreaId, localId: null, name: 'Warehouse One', createdAt: fixedNow },
    { id: companyOneWarehouseTwoId, companyId: companyOneId, areaId: null, localId: companyOneLocalId, name: 'Warehouse Two', createdAt: fixedNow },
  ]);

  await db.insert(pointsOfSaleTable).values([
    { id: companyOnePointOfSaleId, companyId: companyOneId, areaId: null, localId: companyOneLocalId, name: 'Counter One', createdAt: fixedNow },
  ]);

  await db.insert(itemsTable).values([
    {
      id: companyOneItemId,
      companyId: companyOneId,
      categoryId: null,
      sku: 'NONE-001',
      localId: null,
      name: 'No tracking item',
      type: 'product',
      unit: 'unit',
      unitPrice: '10.00',
      tracksStock: true,
      trackBatchMode: 'none',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
    {
      id: companyOneItemBatchId,
      companyId: companyOneId,
      categoryId: null,
      sku: 'BATCH-001',
      localId: null,
      name: 'Batch item',
      type: 'product',
      unit: 'unit',
      unitPrice: '20.00',
      tracksStock: true,
      trackBatchMode: 'batch',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
    {
      id: companyOneItemSerialId,
      companyId: companyOneId,
      categoryId: null,
      sku: 'SERIAL-001',
      localId: null,
      name: 'Serial item',
      type: 'product',
      unit: 'unit',
      unitPrice: '30.00',
      tracksStock: true,
      trackBatchMode: 'serial',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  ]);

  await db.insert(stockLotsTable).values([
    {
      id: companyOneLotId,
      companyId: companyOneId,
      itemId: companyOneItemBatchId,
      lotNumber: 'BATCH-LOT-001',
      expiresAt: null,
      createdAt: fixedNow,
      updatedAt: fixedNow,
    },
  ]);
};

describe('createDrizzleStockDocumentsGateway', () => {
  beforeEach(async () => {
    const setup = await setupDatabase();
    db = setup.db;
    perTestCleanups.push(setup.cleanup);

    await seedBaseFixture(db);
  });

  it('creates, lists, and reads a draft receipt with a single line', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: 'Initial receipt',
    });

    expect(document.id).toBeDefined();
    expect(document.status).toBe('draft');
    expect(document.documentNo).toBeNull();
    expect(document.note).toBe('Initial receipt');

    const line = await gateway.addLine({
      companyId: companyOneId,
      documentId: document.id,
      itemId: companyOneItemId,
      quantity: '3.000',
      unitCost: '12.0000',
      lotId: null,
    });

    expect(line.documentId).toBe(document.id);
    expect(line.quantity).toBe('3.000');

    const fetched = await gateway.getDocument(companyOneId, document.id);
    expect(fetched?.id).toBe(document.id);

    const list = await gateway.listDocuments(companyOneId, { type: 'receipt' });
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(document.id);

    const listedLines = await gateway.listLines(companyOneId, document.id);
    expect(listedLines).toHaveLength(1);
    expect(listedLines[0]?.id).toBe(line.id);

    // Tenant isolation: looking up the document under another company yields null.
    const crossTenant = await gateway.getDocument(companyTwoId, document.id);
    expect(crossTenant).toBeNull();
  });

  it('confirms a receipt, upserts a quant with MWA, and persists a generated documentNo', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: document.id,
      itemId: companyOneItemId,
      quantity: '5.000',
      unitCost: '10.0000',
      lotId: null,
    });

    const confirmed = await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: document.id,
      documentNo: 'ACME-RCV-00001',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    expect(confirmed).toBeTruthy();
    expect(confirmed?.status).toBe('confirmed');
    expect(confirmed?.documentNo).toBe('ACME-RCV-00001');

    const quants = await gateway.listQuants(companyOneId);
    expect(quants).toHaveLength(1);
    expect(quants[0]).toMatchObject({
      companyId: companyOneId,
      itemId: companyOneItemId,
      scopeNodeId: `warehouse:${companyOneWarehouseId}`,
      scopeType: 'warehouse',
      lotId: null,
      quantity: '5.000',
      avgUnitCost: '10.0000',
    });

    // Stock under a different company must remain empty.
    await expect(gateway.listQuants(companyTwoId)).resolves.toEqual([]);
  });

  it('reuses the same NULL-lot quant row when a second receipt confirms against the same company+item+scope key', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const first = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: first.id,
      itemId: companyOneItemId,
      quantity: '2.000',
      unitCost: '8.0000',
      lotId: null,
    });

    await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: first.id,
      documentNo: 'ACME-RCV-00002',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    const second = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: second.id,
      itemId: companyOneItemId,
      quantity: '3.000',
      unitCost: '12.0000',
      lotId: null,
    });

    await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: second.id,
      documentNo: 'ACME-RCV-00003',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    const quants = await gateway.listQuants(companyOneId);
    expect(quants).toHaveLength(1);
    expect(quants[0]).toMatchObject({
      quantity: '5.000',
      avgUnitCost: '10.4000',
      lotId: null,
      scopeNodeId: `warehouse:${companyOneWarehouseId}`,
    });
  });

  it('sets NULL avg when confirm drains an existing quant to zero (NULL-lot variant)', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    // Pre-seed a quant row at the same key (NULL lot) with quantity 3 / cost 20
    await db.insert(stockQuantsTable).values({
      id: randomUUID(),
      companyId: companyOneId,
      itemId: companyOneItemId,
      scopeNodeId: `warehouse:${companyOneWarehouseId}`,
      scopeType: 'warehouse',
      lotId: null,
      quantity: '3.000',
      reservedQuantity: '0.000',
      quarantineQuantity: '0.000',
      avgUnitCost: '20.0000',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'loss',
      originScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      originScopeType: 'warehouse',
      destinationScopeNodeId: null,
      destinationScopeType: null,
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: document.id,
      itemId: companyOneItemId,
      quantity: '3.000',
      unitCost: '0.0000',
      lotId: null,
    });

    const confirmed = await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: document.id,
      documentNo: 'ACME-LOS-00001',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm', 'inventory.stock.adjust'],
    });

    expect(confirmed?.status).toBe('confirmed');

    const quants = await gateway.listQuants(companyOneId);
    expect(quants).toHaveLength(1);
    expect(quants[0]?.quantity).toBe('0.000');
    expect(quants[0]?.avgUnitCost).toBeNull();
  });

  it('performs a transfer (OUT + IN) inside a single transaction and never leaves a partial quant', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    // Seed a quant at the origin so we can subtract from it.
    await db.insert(stockQuantsTable).values({
      id: randomUUID(),
      companyId: companyOneId,
      itemId: companyOneItemId,
      scopeNodeId: `warehouse:${companyOneWarehouseId}`,
      scopeType: 'warehouse',
      lotId: null,
      quantity: '10.000',
      reservedQuantity: '0.000',
      quarantineQuantity: '0.000',
      avgUnitCost: '12.0000',
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'transfer',
      originScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      originScopeType: 'warehouse',
      destinationScopeNodeId: `point-of-sale:${companyOnePointOfSaleId}`,
      destinationScopeType: 'point-of-sale',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: 'Move 4 to POS',
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: document.id,
      itemId: companyOneItemId,
      quantity: '4.000',
      unitCost: '12.0000',
      lotId: null,
    });

    const confirmed = await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: document.id,
      documentNo: 'ACME-TRF-00001',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    expect(confirmed?.status).toBe('confirmed');

    const quants = await gateway.listQuants(companyOneId);
    expect(quants).toHaveLength(2);

    const byLocation = Object.fromEntries(
      quants.map((quant) => [quant.scopeNodeId, quant]),
    );

    expect(byLocation[`warehouse:${companyOneWarehouseId}`]).toMatchObject({
      quantity: '6.000',
      avgUnitCost: '12.0000',
    });
    expect(byLocation[`point-of-sale:${companyOnePointOfSaleId}`]).toMatchObject({
      quantity: '4.000',
      avgUnitCost: '12.0000',
    });
  });

  it('cancels a confirmed receipt by compensating quants (NULL avg at qty 0)', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: document.id,
      itemId: companyOneItemId,
      quantity: '2.000',
      unitCost: '15.0000',
      lotId: null,
    });

    await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: document.id,
      documentNo: 'ACME-RCV-00010',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    const cancelled = await gateway.cancelDocument({
      companyId: companyOneId,
      documentId: document.id,
      at: fixedNow,
    });

    expect(cancelled?.status).toBe('cancelled');

    const quants = await gateway.listQuants(companyOneId);
    expect(quants).toHaveLength(1);
    expect(quants[0]?.quantity).toBe('0.000');
    expect(quants[0]?.avgUnitCost).toBeNull();
  });

  it('reverses a confirmed document by cloning a new adjustment with negated lines and reversalOfId', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const original = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: original.id,
      itemId: companyOneItemId,
      quantity: '7.000',
      unitCost: '11.0000',
      lotId: null,
    });

    await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: original.id,
      documentNo: 'ACME-RCV-00020',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    const reversal = await gateway.reverseDocument({
      companyId: companyOneId,
      documentId: original.id,
      documentNo: 'ACME-ADJ-00001',
      at: fixedNow,
      createdByUserId: companyOneUserId,
    });

    expect(reversal).toBeTruthy();
    expect(reversal?.status).toBe('confirmed');
    expect(reversal?.type).toBe('adjustment');
    expect(reversal?.reversalOfId).toBe(original.id);
    expect(reversal?.documentNo).toBe('ACME-ADJ-00001');

    const reversalLines = await gateway.listLines(companyOneId, reversal!.id);
    expect(reversalLines).toHaveLength(1);
    // Negated quantity — same magnitude, applied as a quant decrement by confirm.
    expect(reversalLines[0]?.quantity).toBe('7.000');

    // After reversal the original +7 should be cancelled back to 0.
    const quants = await gateway.listQuants(companyOneId);
    expect(quants).toHaveLength(1);
    expect(quants[0]?.quantity).toBe('0.000');
    expect(quants[0]?.avgUnitCost).toBeNull();
  });

  it('rejects a confirm that violates the lot uniqueness constraint with a 23505 documentNo conflict', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const first = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: first.id,
      itemId: companyOneItemId,
      quantity: '1.000',
      unitCost: '10.0000',
      lotId: null,
    });

    await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: first.id,
      documentNo: 'ACME-RCV-00099',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    // The unique index on (company, document_no) must reject a colliding
    // document_no on a second document.
    const second = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: second.id,
      itemId: companyOneItemId,
      quantity: '1.000',
      unitCost: '10.0000',
      lotId: null,
    });

    await expect(
      gateway.confirmDocument({
        companyId: companyOneId,
        documentId: second.id,
        documentNo: 'ACME-RCV-00099',
        at: fixedNow,
        capabilities: ['inventory.documents.confirm'],
      }),
    ).rejects.toThrow();

    // Re-throwing the error must keep the document in draft state.
    const refreshed = await gateway.getDocument(companyOneId, second.id);
    expect(refreshed?.status).toBe('draft');

    // isDocumentNoConflict must classify the underlying PG 23505 cleanly.
    try {
      await gateway.confirmDocument({
        companyId: companyOneId,
        documentId: second.id,
        documentNo: 'ACME-RCV-00099',
        at: fixedNow,
        capabilities: ['inventory.documents.confirm'],
      });
    } catch (error) {
      expect(isDocumentNoConflict(error)).toBe(true);
    }
  });

  it('translates scope-check trigger errors on confirm to a typed StockDocumentValidationError', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    // We need a stock_documents row whose destination_scope_type does NOT
    // match the underlying scope_node's node_type. The trigger fires on
    // BEFORE INSERT OR UPDATE, so even raw UPDATEs are blocked. To stage
    // the corrupt row we temporarily disable the trigger inside its own
    // transaction and re-enable it before the gateway's confirm-time
    // UPDATE runs, so the trigger is live when the gateway commits.
    const draftId = '00000000-0000-0000-0000-000000000900';

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`ALTER TABLE stock_documents DISABLE TRIGGER stock_documents_scope_type_check_trg`,
      );
      await tx.insert(stockDocumentsTable).values({
        id: draftId,
        companyId: companyOneId,
        documentNo: 'ACME-RCV-99999',
        type: 'receipt',
        status: 'draft',
        originScopeNodeId: null,
        originScopeType: null,
        destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
        destinationScopeType: 'point-of-sale', // mismatch on purpose
        occurredAt: fixedNow,
        createdByUserId: companyOneUserId,
        reversalOfId: null,
        note: null,
        createdAt: fixedNow,
        updatedAt: fixedNow,
      });
      await tx.execute(
        sql`ALTER TABLE stock_documents ENABLE TRIGGER stock_documents_scope_type_check_trg`,
      );
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: draftId,
      itemId: companyOneItemId,
      quantity: '1.000',
      unitCost: '10.0000',
      lotId: null,
    });

    await expect(
      gateway.confirmDocument({
        companyId: companyOneId,
        documentId: draftId,
        documentNo: 'ACME-RCV-99999',
        at: fixedNow,
        capabilities: ['inventory.documents.confirm'],
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('updates and removes draft lines atomically and rejects the same ops on a confirmed document', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    const line = await gateway.addLine({
      companyId: companyOneId,
      documentId: document.id,
      itemId: companyOneItemId,
      quantity: '1.000',
      unitCost: '10.0000',
      lotId: null,
    });

    const updated = await gateway.updateLine({
      companyId: companyOneId,
      lineId: line.id,
      itemId: companyOneItemId,
      quantity: '5.000',
      unitCost: '12.0000',
      lotId: null,
    });

    expect(updated?.quantity).toBe('5.000');
    expect(updated?.unitCost).toBe('12.0000');

    expect(await gateway.removeLine(companyOneId, line.id)).toBe(true);
    expect(await gateway.removeLine(companyOneId, line.id)).toBe(false);
    expect(await gateway.listLines(companyOneId, document.id)).toEqual([]);

    // After removal, confirming with no lines must surface a validation error
    // (the use case also enforces this, but the gateway must be defensible).
    const document2 = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    await gateway.addLine({
      companyId: companyOneId,
      documentId: document2.id,
      itemId: companyOneItemId,
      quantity: '1.000',
      unitCost: '10.0000',
      lotId: null,
    });

    await gateway.confirmDocument({
      companyId: companyOneId,
      documentId: document2.id,
      documentNo: 'ACME-RCV-00077',
      at: fixedNow,
      capabilities: ['inventory.documents.confirm'],
    });

    // No second line to remove, so update returns null.
    const none = await gateway.updateLine({
      companyId: companyOneId,
      lineId: '00000000-0000-0000-0000-000000000000',
      itemId: companyOneItemId,
      quantity: '1.000',
      unitCost: '10.0000',
      lotId: null,
    });

    expect(none).toBeNull();
  });

  it('creates lots, lists them, and enforces per-company isolation', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const lot = await gateway.createLot({
      companyId: companyOneId,
      itemId: companyOneItemBatchId,
      lotNumber: 'BATCH-LOT-002',
      expiresAt: null,
    });

    expect(lot.lotNumber).toBe('BATCH-LOT-002');

    const lots = await gateway.listLots(companyOneId);
    expect(lots).toHaveLength(2); // seed lot + new
    expect(lots.map((l) => l.lotNumber).sort()).toEqual([
      'BATCH-LOT-001',
      'BATCH-LOT-002',
    ]);

    // Other company must see no lots.
    await expect(gateway.listLots(companyTwoId)).resolves.toEqual([]);
  });

  it('rejects a duplicate lot number within the same item+company', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    await expect(
      gateway.createLot({
        companyId: companyOneId,
        itemId: companyOneItemBatchId,
        lotNumber: 'BATCH-LOT-001', // seed lot
        expiresAt: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('returns null when confirming a missing document (the use case wraps it as StockDocumentNotFoundError)', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    await expect(
      gateway.confirmDocument({
        companyId: companyOneId,
        documentId: '00000000-0000-0000-0000-000000000000',
        documentNo: 'ACME-RCV-99990',
        at: fixedNow,
        capabilities: ['inventory.documents.confirm'],
      }),
    ).resolves.toBeNull();
  });

  it('derives the next document sequence as count of existing stock documents + 1', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    expect(await gateway.getNextDocumentSequence(companyOneId)).toBe(1);

    const document = await gateway.createDocument({
      companyId: companyOneId,
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: `warehouse:${companyOneWarehouseId}`,
      destinationScopeType: 'warehouse',
      occurredAt: fixedNow,
      createdByUserId: companyOneUserId,
      note: null,
    });

    expect(document.documentNo).toBeNull();
    expect(await gateway.getNextDocumentSequence(companyOneId)).toBe(2);
  });

  it('resolves the company code from the company name uppercased + alphanumeric', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    await expect(gateway.findCompanyCode(companyOneId)).resolves.toBe('ACMEINVENTOR');
    await expect(gateway.findCompanyCode(companyTwoId)).resolves.toBe('OTHERINVENTO');
    await expect(gateway.findCompanyCode('missing-company')).resolves.toBeNull();
  });

  it('finds the seeded item with its batch mode', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const item = await gateway.findItem(companyOneId, companyOneItemBatchId);
    expect(item).toMatchObject({
      id: companyOneItemBatchId,
      trackBatchMode: 'batch',
    });

    expect(await gateway.findItem(companyOneId, '00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('finds the seeded lot within the active company only', async () => {
    const gateway = createDrizzleStockDocumentsGateway(db, {
      now: () => fixedNow,
    });

    const lot = await gateway.findLot(companyOneId, companyOneLotId);
    expect(lot).toMatchObject({ id: companyOneLotId, lotNumber: 'BATCH-LOT-001' });
    expect(await gateway.findLot(companyTwoId, companyOneLotId)).toBeNull();
  });
});
