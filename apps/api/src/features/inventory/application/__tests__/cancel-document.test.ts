import { describe, expect, it } from 'vitest';

import {
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../../domain/stock-documents';
import { createCancelDocumentUseCase } from '../cancel-document';
import {
  InMemoryStockDocumentsGateway,
  buildDocument,
  buildLine,
} from './support';

describe('createCancelDocumentUseCase', () => {
  it('flips a draft document to cancelled without touching quants', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];

    const cancelDocument = createCancelDocumentUseCase({
      gateway,
      now: () => new Date('2026-08-20T10:00:00.000Z'),
    });

    const cancelled = await cancelDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
    });

    expect(cancelled.status).toBe('cancelled');
    expect(gateway.quants).toHaveLength(0);
  });

  it('compensates quants when cancelling a confirmed receipt', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({
        id: 'doc-1',
        type: 'receipt',
        status: 'confirmed',
        documentNo: 'ACME-RCV-00001',
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
      }),
    ];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1', quantity: '5.000', unitCost: '12.50' }),
    ];
    // Pre-existing quant driven by the confirmed receipt.
    gateway.quants.push({
      id: 'quant-1',
      companyId: 'company-1',
      itemId: 'item-1',
      scopeNodeId: 'wh-1',
      scopeType: 'warehouse',
      lotId: null,
      quantity: '5.000',
      reservedQuantity: '0.000',
      quarantineQuantity: '0.000',
      avgUnitCost: '12.5000',
      createdAt: new Date('2026-08-20T09:00:00.000Z'),
      updatedAt: new Date('2026-08-20T09:00:00.000Z'),
    });

    const cancelDocument = createCancelDocumentUseCase({ gateway });

    const cancelled = await cancelDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
    });

    expect(cancelled.status).toBe('cancelled');

    const quant = gateway.quants[0];
    expect(quant?.quantity).toBe('0.000');
    expect(quant?.avgUnitCost).toBeNull();
  });

  it('rejects cancelling an already-cancelled document', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'cancelled' })];

    const cancelDocument = createCancelDocumentUseCase({ gateway });

    await expect(
      cancelDocument({ companyId: 'company-1', documentId: 'doc-1' }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('throws when the document does not exist', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const cancelDocument = createCancelDocumentUseCase({ gateway });

    await expect(
      cancelDocument({ companyId: 'company-1', documentId: 'doc-missing' }),
    ).rejects.toBeInstanceOf(StockDocumentNotFoundError);
  });
});
