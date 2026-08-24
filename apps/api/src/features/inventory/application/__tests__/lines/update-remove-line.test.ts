import { describe, expect, it } from 'vitest';

import {
  StockDocumentLineLotInvalidError,
  StockDocumentLineNotFoundError,
  StockDocumentValidationError,
} from '../../../domain/stock-documents';
import { createUpdateLineUseCase } from '../../lines/update-line';
import { createRemoveLineUseCase } from '../../lines/remove-line';
import {
  InMemoryStockDocumentsGateway,
  buildDocument,
  buildItem,
  buildLine,
} from '../support';

describe('createUpdateLineUseCase', () => {
  it('updates a draft line in place', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'none' })];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1', quantity: '3.000' })];

    const updateLine = createUpdateLineUseCase({ gateway });

    const updated = await updateLine({
      companyId: 'company-1',
      lineId: 'line-1',
      itemId: 'item-1',
      quantity: '7.000',
      unitCost: '4.50',
      lotId: null,
    });

    expect(updated.quantity).toBe('7.000');
    expect(updated.unitCost).toBe('4.50');
  });

  it('rejects updating a line on a non-draft document', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({ id: 'doc-1', status: 'confirmed', documentNo: 'ACME-RCV-00001' }),
    ];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1' })];

    const updateLine = createUpdateLineUseCase({ gateway });

    await expect(
      updateLine({
        companyId: 'company-1',
        lineId: 'line-1',
        itemId: 'item-1',
        quantity: '5.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('throws when the line is missing', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const updateLine = createUpdateLineUseCase({ gateway });

    await expect(
      updateLine({
        companyId: 'company-1',
        lineId: 'line-missing',
        itemId: 'item-1',
        quantity: '5.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineNotFoundError);
  });

  it('rejects updating a batch-tracked line without a lot', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-batch', trackBatchMode: 'batch' })];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1', itemId: 'item-batch' })];

    const updateLine = createUpdateLineUseCase({ gateway });

    await expect(
      updateLine({
        companyId: 'company-1',
        lineId: 'line-1',
        itemId: 'item-batch',
        quantity: '1.000',
        unitCost: '4.50',
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });
});

describe('createRemoveLineUseCase', () => {
  it('removes a draft line and leaves the rest untouched', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.lines = [
      buildLine({ id: 'line-1', documentId: 'doc-1' }),
      buildLine({ id: 'line-2', documentId: 'doc-1' }),
    ];

    const removeLine = createRemoveLineUseCase({ gateway });

    await removeLine({ companyId: 'company-1', lineId: 'line-1' });

    expect(gateway.lines).toHaveLength(1);
    expect(gateway.lines[0]?.id).toBe('line-2');
  });

  it('rejects removing a line from a non-draft document', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({ id: 'doc-1', status: 'confirmed', documentNo: 'ACME-RCV-00001' }),
    ];
    gateway.lines = [buildLine({ id: 'line-1', documentId: 'doc-1' })];

    const removeLine = createRemoveLineUseCase({ gateway });

    await expect(
      removeLine({ companyId: 'company-1', lineId: 'line-1' }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('throws when the line is missing', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const removeLine = createRemoveLineUseCase({ gateway });

    await expect(
      removeLine({ companyId: 'company-1', lineId: 'line-missing' }),
    ).rejects.toBeInstanceOf(StockDocumentLineNotFoundError);
  });
});
