import { describe, expect, it } from 'vitest';

import {
  StockDocumentItemNotFoundError,
  StockDocumentValidationError,
} from '../../../domain/stock-documents';
import { createCreateLotUseCase } from '../../lots/create-lot';
import { createListLotsUseCase } from '../../lots/list-lot';
import { createListQuantsUseCase } from '../../list-quants';
import {
  InMemoryStockDocumentsGateway,
  buildItem,
  buildLot,
  buildQuant,
} from '../support';

describe('createCreateLotUseCase', () => {
  it('creates a lot when the item is configured with batch tracking', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'batch' })];

    const createLot = createCreateLotUseCase({
      documentsGateway: gateway,
      lotsGateway: gateway,
    });

    const lot = await createLot({
      companyId: 'company-1',
      itemId: 'item-1',
      lotNumber: 'BATCH-001',
      expiresAt: null,
    });

    expect(lot.lotNumber).toBe('BATCH-001');
  });

  it('rejects empty lot numbers', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'batch' })];

    const createLot = createCreateLotUseCase({
      documentsGateway: gateway,
      lotsGateway: gateway,
    });

    await expect(
      createLot({
        companyId: 'company-1',
        itemId: 'item-1',
        lotNumber: '   ',
        expiresAt: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects lots for items configured as none', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'none' })];

    const createLot = createCreateLotUseCase({
      documentsGateway: gateway,
      lotsGateway: gateway,
    });

    await expect(
      createLot({
        companyId: 'company-1',
        itemId: 'item-1',
        lotNumber: 'BATCH-001',
        expiresAt: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects duplicate lot numbers per item', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.items = [buildItem({ id: 'item-1', trackBatchMode: 'batch' })];
    gateway.lots = [buildLot({ id: 'lot-1', itemId: 'item-1', lotNumber: 'BATCH-001' })];

    const createLot = createCreateLotUseCase({
      documentsGateway: gateway,
      lotsGateway: gateway,
    });

    await expect(
      createLot({
        companyId: 'company-1',
        itemId: 'item-1',
        lotNumber: 'BATCH-001',
        expiresAt: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects lots for missing items', async () => {
    const gateway = new InMemoryStockDocumentsGateway();

    const createLot = createCreateLotUseCase({
      documentsGateway: gateway,
      lotsGateway: gateway,
    });

    await expect(
      createLot({
        companyId: 'company-1',
        itemId: 'item-missing',
        lotNumber: 'BATCH-001',
        expiresAt: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentItemNotFoundError);
  });
});

describe('createListLotsUseCase', () => {
  it('returns the lots for the active company', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.lots = [
      buildLot({ id: 'lot-1', itemId: 'item-1', lotNumber: 'BATCH-001' }),
      buildLot({ id: 'lot-2', itemId: 'item-1', lotNumber: 'BATCH-002' }),
    ];

    const listLots = createListLotsUseCase({ gateway });

    const lots = await listLots({ companyId: 'company-1' });
    expect(lots).toHaveLength(2);
  });
});

describe('createListQuantsUseCase', () => {
  it('returns the quants for the active company', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.quants = [buildQuant({ id: 'quant-1' })];

    const listQuants = createListQuantsUseCase({ gateway });

    const quants = await listQuants({ companyId: 'company-1' });
    expect(quants).toHaveLength(1);
    expect(quants[0]?.quantity).toBe('0.000');
  });
});
