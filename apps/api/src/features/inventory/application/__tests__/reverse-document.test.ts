import { describe, expect, it } from 'vitest';

import {
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../../domain/stock-documents';
import { createReverseDocumentUseCase } from '../reverse-document';
import {
  InMemoryStockDocumentsGateway,
  buildDocument,
  buildLine,
} from './support';

describe('createReverseDocumentUseCase', () => {
  it('creates a chained adjustment document with reversalOfId', async () => {
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

    const reverseDocument = createReverseDocumentUseCase({
      gateway,
      now: () => new Date('2026-08-20T11:00:00.000Z'),
    });

    const reversal = await reverseDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      createdByUserId: 'user-2',
    });

    expect(reversal.status).toBe('confirmed');
    expect(reversal.type).toBe('adjustment');
    expect(reversal.reversalOfId).toBe('doc-1');
    expect(reversal.originScopeNodeId).toBe('wh-1');
    expect(reversal.destinationScopeNodeId).toBeNull();
    expect(reversal.documentNo).toBe('ACME-ADJ-00001');
  });

  it('rejects reversing a draft document', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [buildDocument({ id: 'doc-1', status: 'draft' })];

    const reverseDocument = createReverseDocumentUseCase({ gateway });

    await expect(
      reverseDocument({
        companyId: 'company-1',
        documentId: 'doc-1',
        createdByUserId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('throws when the original document is missing', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const reverseDocument = createReverseDocumentUseCase({ gateway });

    await expect(
      reverseDocument({
        companyId: 'company-1',
        documentId: 'doc-missing',
        createdByUserId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(StockDocumentNotFoundError);
  });

  it('supports chaining: reversing a reversal creates another linked adjustment', async () => {
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

    const reverseDocument = createReverseDocumentUseCase({
      gateway,
      now: () => new Date('2026-08-20T11:00:00.000Z'),
    });

    const first = await reverseDocument({
      companyId: 'company-1',
      documentId: 'doc-1',
      createdByUserId: 'user-2',
    });

    const second = await reverseDocument({
      companyId: 'company-1',
      documentId: first.id,
      createdByUserId: 'user-3',
    });

    expect(second.reversalOfId).toBe(first.id);
    expect(second.type).toBe('adjustment');
  });
});
