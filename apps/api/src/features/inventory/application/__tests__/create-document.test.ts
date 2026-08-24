import { describe, expect, it } from 'vitest';

import {
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../../domain/stock-documents';
import { createCreateDocumentUseCase } from '../create-document';
import { InMemoryStockDocumentsGateway, buildDocument } from './support';

describe('createCreateDocumentUseCase', () => {
  it('creates a receipt document with a destination scope', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const createDocument = createCreateDocumentUseCase({ gateway });

    const created = await createDocument({
      companyId: 'company-1',
      type: 'receipt',
      originScopeNodeId: null,
      originScopeType: null,
      destinationScopeNodeId: 'wh-1',
      destinationScopeType: 'warehouse',
      occurredAt: new Date('2026-08-20T09:00:00.000Z'),
      createdByUserId: 'user-1',
      note: null,
    });

    expect(created.status).toBe('draft');
    expect(created.type).toBe('receipt');
    expect(created.documentNo).toBeNull();
  });

  it('rejects unknown document types', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const createDocument = createCreateDocumentUseCase({ gateway });

    await expect(
      createDocument({
        companyId: 'company-1',
        type: 'phantom',
        originScopeNodeId: null,
        originScopeType: null,
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        occurredAt: new Date('2026-08-20T09:00:00.000Z'),
        createdByUserId: 'user-1',
        note: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects mismatched scope pairs', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const createDocument = createCreateDocumentUseCase({ gateway });

    await expect(
      createDocument({
        companyId: 'company-1',
        type: 'receipt',
        originScopeNodeId: 'wh-1',
        originScopeType: null,
        destinationScopeNodeId: 'wh-2',
        destinationScopeType: 'warehouse',
        occurredAt: new Date('2026-08-20T09:00:00.000Z'),
        createdByUserId: 'user-1',
        note: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects transfers that share origin and destination', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const createDocument = createCreateDocumentUseCase({ gateway });

    await expect(
      createDocument({
        companyId: 'company-1',
        type: 'transfer',
        originScopeNodeId: 'wh-1',
        originScopeType: 'warehouse',
        destinationScopeNodeId: 'wh-1',
        destinationScopeType: 'warehouse',
        occurredAt: new Date('2026-08-20T09:00:00.000Z'),
        createdByUserId: 'user-1',
        note: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('rejects adjustment documents that miss the origin scope', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const createDocument = createCreateDocumentUseCase({ gateway });

    await expect(
      createDocument({
        companyId: 'company-1',
        type: 'adjustment',
        originScopeNodeId: null,
        originScopeType: null,
        destinationScopeNodeId: null,
        destinationScopeType: null,
        occurredAt: new Date('2026-08-20T09:00:00.000Z'),
        createdByUserId: 'user-1',
        note: null,
      }),
    ).rejects.toBeInstanceOf(StockDocumentValidationError);
  });

  it('returns the document untouched when reading it back via the same gateway', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    const createDocument = createCreateDocumentUseCase({ gateway });

    const created = await createDocument({
      companyId: 'company-1',
      type: 'adjustment',
      originScopeNodeId: 'wh-1',
      originScopeType: 'warehouse',
      destinationScopeNodeId: null,
      destinationScopeType: null,
      occurredAt: new Date('2026-08-20T09:00:00.000Z'),
      createdByUserId: 'user-1',
      note: 'spoil count',
    });

    const found = await gateway.getDocument('company-1', created.id);
    expect(found?.id).toBe(created.id);
    expect(found?.note).toBe('spoil count');
  });
});

describe('createListDocumentsUseCase / createGetDocumentUseCase', () => {
  it('returns the document when present and throws when missing', async () => {
    const gateway = new InMemoryStockDocumentsGateway();
    gateway.documents = [
      buildDocument({ id: 'doc-a', type: 'receipt', status: 'draft' }),
      buildDocument({ id: 'doc-b', type: 'adjustment', status: 'confirmed' }),
    ];

    const { createGetDocumentUseCase } = await import('../list-document');
    const getDocument = createGetDocumentUseCase({ gateway });
    const { createListDocumentsUseCase } = await import('../list-document');
    const listDocuments = createListDocumentsUseCase({ gateway });

    const found = await getDocument({ companyId: 'company-1', documentId: 'doc-a' });
    expect(found.id).toBe('doc-a');

    await expect(
      getDocument({ companyId: 'company-1', documentId: 'doc-missing' }),
    ).rejects.toBeInstanceOf(StockDocumentNotFoundError);

    const all = await listDocuments({ companyId: 'company-1' });
    expect(all).toHaveLength(2);

    const onlyConfirmed = await listDocuments({
      companyId: 'company-1',
      status: 'confirmed',
    });
    expect(onlyConfirmed).toHaveLength(1);
    expect(onlyConfirmed[0]?.id).toBe('doc-b');
  });
});
