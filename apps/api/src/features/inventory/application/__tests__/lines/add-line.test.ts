import { describe, expect, it } from 'vitest';

import {
  StockDocumentItemNotFoundError,
  StockDocumentLineLotInvalidError,
  StockDocumentLineQuantityError,
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../../../domain/stock-documents';
import { createAddLineUseCase } from '../../lines/add-line';
import {
  InMemoryStockDocumentsGateway,
  buildDocument,
  buildItem,
  buildLot,
} from '../support';

describe('createAddLineUseCase', () => {
  it('adds a line when the document is in draft and the item is valid', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'none' })];

    const addLine = createAddLineUseCase({ gateway });

    const line = await addLine({
      companyId: 'company-1',
      documentId: 'doc-1',
      itemId: 'item-1',
      quantity: '5.000',
      unitCost: '12.50',
      lotId: null,
    });

    expect(line.documentId).toBe('doc-1');
    expect(line.quantity).toBe('5.000');
  });

  it('rejects adding a line when the document is not draft', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({ id: 'doc-1', status: 'confirmed', documentNo: 'ACME-RCV-00001' }),
    ];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-1',
        quantity: '5.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects serial items without a lot', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'serial' })];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-1',
        quantity: '1.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('rejects serial items when the quantity is not 1', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'serial' })];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-1',
        quantity: '2.000',
        unitCost: null,
        lotId: 'lot-1',
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineQuantityError);
  });

  it('rejects batch items without a lot', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'batch' })];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-1',
        quantity: '4.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('rejects items configured as none that come with a lot', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'none' })];
    gateway.lots = [buildLot({ id: 'lot-1' })];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-1',
        quantity: '3.000',
        unitCost: null,
        lotId: 'lot-1',
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('rejects lines with a lot that does not belong to the item', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'batch' })];
    gateway.lots = [buildLot({ id: 'lot-foreign', itemId: 'item-other' })];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-1',
        quantity: '3.000',
        unitCost: null,
        lotId: 'lot-foreign',
      }),
    ).rejects.toBeInstanceOf(StockDocumentLineLotInvalidError);
  });

  it('throws when the item does not exist in the company', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];

    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-1',
        itemId: 'item-missing',
        quantity: '5.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentItemNotFoundError);
  });

  it('throws when the document does not exist', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const addLine = createAddLineUseCase({ gateway });

    await expect(
      addLine({
        companyId: 'company-1',
        documentId: 'doc-missing',
        itemId: 'item-1',
        quantity: '5.000',
        unitCost: null,
        lotId: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentNotFoundError);
  });

  it('accepts serial items with a lot and quantity 1', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'serial' })];
    gateway.lots = [buildLot({ id: 'lot-1', itemId: 'item-1' })];

    const addLine = createAddLineUseCase({ gateway });

    const line = await addLine({
      companyId: 'company-1',
      documentId: 'doc-1',
      itemId: 'item-1',
      quantity: '1.000',
      unitCost: null,
      lotId: 'lot-1',
    });

    expect(line.lotId).toBe('lot-1');
  });
});
