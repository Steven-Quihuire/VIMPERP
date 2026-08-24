import { describe, expect, it } from 'vitest';

import {
  StockDocumentLineLotInvalidError,
  StockDocumentNotFoundError,
  StockDocumentLineQuantityError,
  StockDocumentValidationError,
} from '../../domain/stock-documents';
import { createConfirmDocumentUseCase } from '../confirm-document';
import {
  InMemoryStockDocumentsGateway,
  buildDocument,
  buildItem,
  buildLine,
  buildLot,
  fullCapabilitySet,
} from './support';

describe('createConfirmDocumentUseCase', () => {
  it('mints a unique documentNo and maintains the destination quant with MWA on a receipt', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({
        id: 'doc-1',
        type: 'receipt',
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        status: 'draft',
      }),
    ];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1', quantity: '5.000', unitCost: '12.50' }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({
      gateway,
      now: () => new Date('2026-08-20T10:00:00.000Z'),
    });

    const confirmed = await confirmDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      capabilities: fullCapabilitySet,
    });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.documentNo).toBe('ACME-RCV-00001');

    const quant = gateway.quants.find(
      (q) => q.itemId === 'item-1' && q.scopeNodeId === 'wh-1',
    );
    expect(quant?.quantity).toBe('5.000');
    expect(quant?.avgUnitCost).toBe('12.5000');
  });

  it('sets avg to null when the resulting quantity is zero (full cancel via negating lines)', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({
        id: 'doc-1',
        type: 'receipt',
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        status: 'draft',
      }),
    ];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1', quantity: '5.000', unitCost: '10.00' }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({
      gateway,
      now: () => new Date('2026-08-20T10:00:00.000Z'),
    });

    await confirmDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      capabilities: fullCapabilitySet,
    });

    // First the quant should have 5 at 10.00 average.
    let quant = gateway.quants.find(
      (q) => q.itemId === 'item-1' && q.scopeNodeId === 'wh-1',
    );
    expect(quant?.quantity).toBe('5.000');
    expect(quant?.avgUnitCost).toBe('10.0000');

    // Now create a loss of 5 against the same scope+item+lot; it should drive qty to 0 and null avg.
    const loss = buildDocument({
      id: 'doc-2',
      type: 'loss',
      status: 'draft',
      originScopeNodeId: 'wh-1',
      originScopeType: 'warehouse',
      destinationScopeNodeId: null,
      destinationScopeType: null,
    });
    gateway.documents.push(loss);
    gateway.lines.push(
      buildLine({ id: 'line-2', documentId: 'doc-2', quantity: '5.000', unitCost: '0' }),
    );

    await confirmDocument({
      companyId: 'company-1',
      documentId: 'doc-2',
      capabilities: fullCapabilitySet,
    });

    quant = gateway.quants.find(
      (q) => q.itemId === 'item-1' && q.scopeNodeId === 'wh-1',
    );
    expect(quant?.quantity).toBe('0.000');
    expect(quant?.avgUnitCost).toBeNull();
  });

  it('rejects confirmation when the document is already confirmed', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({ id: 'doc-1', status: 'confirmed', documentNo: 'ACME-RCV-00005' }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects confirmation when the document has no lines', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('throws when the document is missing', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-missing',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentNotFoundError);
  });

  it('enforces the inventory.documents.confirm capability', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1' })];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: ['inventory.documents.read'],
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects adjustment confirmation without inventory.stock.adjust (double gate)', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({
        id: 'doc-1',
        type: 'adjustment',
        status: 'draft',
        originScopeNodeId: 'wh-1',
        originScopeType: 'warehouse',
        destinationScopeNodeId: null,
        destinationScopeType: null,
      }),
    ];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1' })];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    // Has confirm, but lacks adjust → must be rejected
    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: [
          'inventory.documents.read',
          'inventory.documents.write',
          'inventory.documents.confirm',
        ],
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('accepts adjustment confirmation when both confirm and adjust are present', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({
        id: 'doc-1',
        type: 'adjustment',
        status: 'draft',
        originScopeNodeId: 'wh-1',
        originScopeType: 'warehouse',
        destinationScopeNodeId: null,
        destinationScopeType: null,
      }),
    ];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1', quantity: '2.000' }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    const confirmed = await confirmDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      capabilities: fullCapabilitySet,
    });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.documentNo).toBe('ACME-ADJ-00001');
  });

  it('retries the documentNo on a unique-collision signal', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1' })];

    gateway.documentNoCollisionOnce = true;

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    const confirmed = await confirmDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      capabilities: fullCapabilitySet,
    });

    // First call: collision at seq=1 → retry with seq=2 → succeeds
    expect(confirmed.documentNo).toBe('ACME-RCV-00002');
  });

  it('handles transfer confirm as an OUT at origin plus an IN at destination', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({
        id: 'doc-1',
        type: 'transfer',
        status: 'draft',
        originScopeNodeId: 'wh-1',
        originScopeType: 'warehouse',
        destinationScopeNodeId: 'wh-2',
        destinationScopeType: 'warehouse',
      }),
    ];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1', quantity: '3.000', unitCost: '20.00' }),
    ];

    // Pre-seed origin quant to 5 to exercise the OUT path against existing stock.
    gateway.quants.push({
      id: 'quant-seed',
      companyId: 'company-1',
      itemId: 'item-1',
      scopeNodeId: 'wh-1',
      scopeType: 'warehouse',
      lotId: null,
      quantity: '5.000',
      reservedQuantity: '0.000',
      quarantineQuantity: '0.000',
      avgUnitCost: '20.0000',
      createdAt: new Date('2026-08-20T08:00:00.000Z'),
      updatedAt: new Date('2026-08-20T08:00:00.000Z'),
    });

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    const confirmed = await confirmDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      capabilities: fullCapabilitySet,
    });

    expect(confirmed.status).toBe('confirmed');

    const originQuant = gateway.quants.find(
      (q) => q.itemId === 'item-1' && q.scopeNodeId === 'wh-1',
    );
    expect(originQuant?.quantity).toBe('2.000');

    const destQuant = gateway.quants.find(
      (q) => q.itemId === 'item-1' && q.scopeNodeId === 'wh-2',
    );
    expect(destQuant?.quantity).toBe('3.000');
    expect(destQuant?.avgUnitCost).toBe('20.0000');
  });

  it('rejects confirmation when a batch-tracked line is missing a lot', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-batch', trackBatchMode: 'batch' })];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1', itemId: 'item-batch', lotId: null }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('rejects confirmation when a serial-tracked line quantity is not one', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-serial', trackBatchMode: 'serial' })];
    gateway.lots = [buildLot({ id: 'lot-serial', itemId: 'item-serial' })];
    gateway.lines = [
      buildLine({
        id: 'line-1',
        documentId: 'doc-1',
        itemId: 'item-serial',
        quantity: '2.000',
        lotId: 'lot-serial',
      }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineQuantityError);
  });

  it('rejects confirmation when a none-tracked line uses a lot', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-none', trackBatchMode: 'none' })];
    gateway.lots = [buildLot({ id: 'lot-none', itemId: 'item-none' })];
    gateway.lines = [
      buildLine({
        id: 'line-1',
        documentId: 'doc-1',
        itemId: 'item-none',
        lotId: 'lot-none',
      }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('rejects confirmation when the line lot does not belong to the line item', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-batch', trackBatchMode: 'batch' })];
    gateway.lots = [buildLot({ id: 'lot-foreign', itemId: 'item-other' })];
    gateway.lines = [
      buildLine({
        id: 'line-1',
        documentId: 'doc-1',
        itemId: 'item-batch',
        lotId: 'lot-foreign',
      }),
    ];

    const confirmDocument = createConfirmDocumentUseCase({ gateway });

    await expect(
      confirmDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        capabilities: fullCapabilitySet,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });
});
