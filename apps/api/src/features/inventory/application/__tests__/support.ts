import type { StockDocument, StockDocumentLine, StockDocumentStatus, StockDocumentType, StockLot, StockQuant, StockScopeType } from '../../domain/stock-documents';

type ItemStub = {
  id: string;
  companyId: string;
  trackBatchMode: 'none' | 'batch' | 'serial';
};

type DocumentRecord = StockDocument;

const quantKey = (input: {
  companyId: string;
  itemId: string;
  scopeNodeId: string;
  lotId: string | null;
}) =>
  `${input.companyId}::${input.itemId}::${input.scopeNodeId}::${input.lotId ?? ''}`;

export const buildDocument = (
  overrides: Partial<StockDocument> = {},
): StockDocument => ({
  id: 'doc-1',
  companyId: 'company-1',
  documentNo: null,
  type: 'receipt',
  status: 'draft',
  originScopeNodeId: null,
  originScopeType: null,
  destinationScopeNodeId: 'wh-1',
  destinationScopeType: 'warehouse',
  occurredAt: new Date('2026-08-20T09:00:00.000Z'),
  createdByUserId: 'user-1',
  reversalOfId: null,
  note: null,
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  updatedAt: new Date('2026-08-20T09:00:00.000Z'),
  ...overrides,
});

export const buildLine = (
  overrides: Partial<StockDocumentLine> = {},
): StockDocumentLine => ({
  id: 'line-1',
  companyId: 'company-1',
  documentId: 'doc-1',
  itemId: 'item-1',
  quantity: '1.000',
  unitCost: null,
  lotId: null,
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  ...overrides,
});

export const buildLot = (overrides: Partial<StockLot> = {}): StockLot => ({
  id: 'lot-1',
  companyId: 'company-1',
  itemId: 'item-1',
  lotNumber: 'LOT-001',
  expiresAt: null,
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  updatedAt: new Date('2026-08-20T09:00:00.000Z'),
  ...overrides,
});

export const buildItem = (
  overrides: Partial<ItemStub> = {},
): ItemStub => ({
  id: 'item-1',
  companyId: 'company-1',
  trackBatchMode: 'none',
  ...overrides,
});

export const buildQuant = (
  overrides: Partial<StockQuant> = {},
): StockQuant => ({
  id: 'quant-1',
  companyId: 'company-1',
  itemId: 'item-1',
  scopeNodeId: 'wh-1',
  scopeType: 'warehouse',
  lotId: null,
  quantity: '0.000',
  reservedQuantity: '0.000',
  quarantineQuantity: '0.000',
  avgUnitCost: null,
  createdAt: new Date('2026-08-20T09:00:00.000Z'),
  updatedAt: new Date('2026-08-20T09:00:00.000Z'),
  ...overrides,
});

export const fullCapabilitySet = [
  'inventory.stock.read',
  'inventory.stock.write',
  'inventory.stock.adjust',
  'inventory.documents.read',
  'inventory.documents.write',
  'inventory.documents.confirm',
  'inventory.documents.cancel',
];

const documentNoCollision = (key: string, value: string) => {
  throw new Error(
    `InMemoryStockDocumentsGateway: conflicting documentNo (${key}=${value})`,
  );
};

/**
 * In-memory implementation of the StockDocumentsGateway port.
 *
 * Mocks the four behaviors the use cases depend on:
 *   1. Document lifecycle (CRUD on document and lines)
 *   2. Quant upsert with MWA (NULL avg when qty → 0)
 *   3. Cancel-of-confirmed compensation (negate lines)
 *   4. Reversal (clone confirmed with negated lines + reversalOfId)
 *
 * The mock is deliberately strict: transfers emit OUT + IN rows,
 * documents start with `documentNo = null` (assigned on confirm),
 * and `confirm` requires at least one line.
 */
export class InMemoryStockDocumentsGateway {
  documents: DocumentRecord[] = [];
  lines: StockDocumentLine[] = [];
  lots: StockLot[] = [];
  quants: StockQuant[] = [];
  items: ItemStub[] = [buildItem()];
  /**
   * Mock company code lookup; the real gateway will read it from the
   * companies table. Tests can override per-company.
   */
  companyCodes: Record<string, string> = { 'company-1': 'ACME' };
  /**
   * Tracks the next sequence to mint. Defaults to 1.
   */
  nextSequence = 1;
  /**
   * When set, confirm() throws on the next call before persisting anything.
   * Useful to test the 23505 retry path.
   */
  documentNoCollisionOnce = false;

  private documentCounter = 1;
  private lineCounter = 1;
  private lotCounter = 1;
  private quantCounter = 1;

  async createDocument(input: {
    companyId: string;
    type: StockDocumentType;
    originScopeNodeId: string | null;
    originScopeType: StockScopeType | null;
    destinationScopeNodeId: string | null;
    destinationScopeType: StockScopeType | null;
    occurredAt: Date;
    createdByUserId: string;
    note: string | null;
  }): Promise<StockDocument> {
    const created = buildDocument({
      id: `doc-${++this.documentCounter}`,
      companyId: input.companyId,
      documentNo: null,
      type: input.type,
      originScopeNodeId: input.originScopeNodeId,
      originScopeType: input.originScopeType,
      destinationScopeNodeId: input.destinationScopeNodeId,
      destinationScopeType: input.destinationScopeType,
      occurredAt: input.occurredAt,
      createdByUserId: input.createdByUserId,
      note: input.note,
    });

    this.documents.push(created);
    return await Promise.resolve(created);
  }

  async getDocument(companyId: string, documentId: string) {
    return await Promise.resolve(
      this.documents.find(
        (doc) => doc.companyId === companyId && doc.id === documentId,
      ) ?? null,
    );
  }

  async listDocuments(
    companyId: string,
    filters?: { type?: StockDocumentType; status?: StockDocumentStatus },
  ) {
    return await Promise.resolve(
      this.documents
        .filter((doc) => doc.companyId === companyId)
        .filter((doc) => (filters?.type ? doc.type === filters.type : true))
        .filter((doc) => (filters?.status ? doc.status === filters.status : true)),
    );
  }

  async addLine(input: {
    companyId: string;
    documentId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }): Promise<StockDocumentLine> {
    const created = buildLine({
      id: `line-${++this.lineCounter}`,
      companyId: input.companyId,
      documentId: input.documentId,
      itemId: input.itemId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      lotId: input.lotId,
    });

    this.lines.push(created);
    return await Promise.resolve(created);
  }

  async getLine(companyId: string, lineId: string) {
    return await Promise.resolve(
      this.lines.find(
        (line) => line.companyId === companyId && line.id === lineId,
      ) ?? null,
    );
  }

  async updateLine(input: {
    companyId: string;
    lineId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }) {
    const line = this.lines.find(
      (candidate) =>
        candidate.companyId === input.companyId && candidate.id === input.lineId,
    );

    if (!line) {
      return await Promise.resolve(null);
    }

    line.itemId = input.itemId;
    line.quantity = input.quantity;
    line.unitCost = input.unitCost;
    line.lotId = input.lotId;
    return await Promise.resolve(line);
  }

  async removeLine(companyId: string, lineId: string) {
    const index = this.lines.findIndex(
      (line) => line.companyId === companyId && line.id === lineId,
    );

    if (index === -1) {
      return await Promise.resolve(false);
    }

    this.lines.splice(index, 1);
    return await Promise.resolve(true);
  }

  async listLines(companyId: string, documentId: string) {
    return await Promise.resolve(
      this.lines.filter(
        (line) => line.companyId === companyId && line.documentId === documentId,
      ),
    );
  }

  async confirmDocument(input: {
    companyId: string;
    documentId: string;
    documentNo: string;
    at: Date;
    capabilities: readonly string[];
  }): Promise<StockDocument | null> {
    const document = this.documents.find(
      (doc) => doc.companyId === input.companyId && doc.id === input.documentId,
    );

    if (!document) {
      return await Promise.resolve(null);
    }

    if (document.status !== 'draft') {
      throw new Error(
        `InMemoryStockDocumentsGateway: cannot confirm a ${document.status} document`,
      );
    }

    if (this.documentNoCollisionOnce) {
      this.documentNoCollisionOnce = false;
      documentNoCollision('confirm', input.documentNo);
    }

    const duplicate = this.documents.find(
      (doc) =>
        doc.companyId === input.companyId && doc.documentNo === input.documentNo,
    );

    if (duplicate) {
      documentNoCollision('confirm.duplicate', input.documentNo);
    }

    const lines = this.lines.filter(
      (line) => line.documentId === document.id,
    );

    if (lines.length === 0) {
      throw new Error('InMemoryStockDocumentsGateway: cannot confirm a document with no lines');
    }

    document.status = 'confirmed';
    document.documentNo = input.documentNo;
    document.updatedAt = input.at;

    // Apply quants per document type.
    if (document.type === 'receipt') {
      for (const line of lines) {
        this.applyQuant({
          companyId: input.companyId,
          itemId: line.itemId,
          scopeNodeId: document.destinationScopeNodeId!,
          scopeType: document.destinationScopeType!,
          lotId: line.lotId,
          delta: Number(line.quantity),
          unitCost: line.unitCost,
        });
      }
    } else if (document.type === 'transfer') {
      for (const line of lines) {
        this.applyQuant({
          companyId: input.companyId,
          itemId: line.itemId,
          scopeNodeId: document.originScopeNodeId!,
          scopeType: document.originScopeType!,
          lotId: line.lotId,
          delta: -Number(line.quantity),
          unitCost: line.unitCost,
        });

        this.applyQuant({
          companyId: input.companyId,
          itemId: line.itemId,
          scopeNodeId: document.destinationScopeNodeId!,
          scopeType: document.destinationScopeType!,
          lotId: line.lotId,
          delta: Number(line.quantity),
          unitCost: line.unitCost,
        });
      }
    } else if (document.type === 'adjustment' || document.type === 'loss') {
      for (const line of lines) {
        this.applyQuant({
          companyId: input.companyId,
          itemId: line.itemId,
          scopeNodeId: document.originScopeNodeId!,
          scopeType: document.originScopeType!,
          lotId: line.lotId,
          delta: -Number(line.quantity),
          unitCost: line.unitCost,
        });
      }
    }

    return await Promise.resolve(document);
  }

  async cancelDocument(input: {
    companyId: string;
    documentId: string;
    at: Date;
  }): Promise<StockDocument | null> {
    const document = this.documents.find(
      (doc) => doc.companyId === input.companyId && doc.id === input.documentId,
    );

    if (!document) {
      return await Promise.resolve(null);
    }

    if (document.status === 'cancelled') {
      return await Promise.resolve(document);
    }

    if (document.status === 'confirmed') {
      // Compensate by negating the original lines.
      const lines = this.lines.filter(
        (line) => line.documentId === document.id,
      );

      if (document.type === 'receipt') {
        for (const line of lines) {
          this.applyQuant({
            companyId: input.companyId,
            itemId: line.itemId,
            scopeNodeId: document.destinationScopeNodeId!,
            scopeType: document.destinationScopeType!,
            lotId: line.lotId,
            delta: -Number(line.quantity),
            unitCost: line.unitCost,
          });
        }
      } else if (document.type === 'transfer') {
        for (const line of lines) {
          this.applyQuant({
            companyId: input.companyId,
            itemId: line.itemId,
            scopeNodeId: document.originScopeNodeId!,
            scopeType: document.originScopeType!,
            lotId: line.lotId,
            delta: Number(line.quantity),
            unitCost: line.unitCost,
          });
          this.applyQuant({
            companyId: input.companyId,
            itemId: line.itemId,
            scopeNodeId: document.destinationScopeNodeId!,
            scopeType: document.destinationScopeType!,
            lotId: line.lotId,
            delta: -Number(line.quantity),
            unitCost: line.unitCost,
          });
        }
      } else {
        for (const line of lines) {
          this.applyQuant({
            companyId: input.companyId,
            itemId: line.itemId,
            scopeNodeId: document.originScopeNodeId!,
            scopeType: document.originScopeType!,
            lotId: line.lotId,
            delta: Number(line.quantity),
            unitCost: line.unitCost,
          });
        }
      }
    }

    document.status = 'cancelled';
    document.updatedAt = input.at;
    return await Promise.resolve(document);
  }

  async reverseDocument(input: {
    companyId: string;
    documentId: string;
    documentNo: string;
    at: Date;
    createdByUserId: string;
  }): Promise<StockDocument | null> {
    const original = this.documents.find(
      (doc) => doc.companyId === input.companyId && doc.id === input.documentId,
    );

    if (!original || original.status !== 'confirmed') {
      return await Promise.resolve(null);
    }

    const originalLines = this.lines.filter(
      (line) => line.documentId === original.id,
    );

    const reversal = buildDocument({
      id: `doc-${++this.documentCounter}`,
      companyId: input.companyId,
      documentNo: input.documentNo,
      type: 'adjustment',
      status: 'confirmed',
      originScopeNodeId: original.destinationScopeNodeId,
      originScopeType: original.destinationScopeType,
      destinationScopeNodeId: null,
      destinationScopeType: null,
      occurredAt: input.at,
      createdByUserId: input.createdByUserId,
      reversalOfId: original.id,
      note: `Reversal of ${original.id}`,
      createdAt: input.at,
      updatedAt: input.at,
    });

    this.documents.push(reversal);

    for (const originalLine of originalLines) {
      const negated = buildLine({
        id: `line-${++this.lineCounter}`,
        companyId: input.companyId,
        documentId: reversal.id,
        itemId: originalLine.itemId,
        quantity: originalLine.quantity,
        unitCost: originalLine.unitCost,
        lotId: originalLine.lotId,
      });

      this.lines.push(negated);
    }

    return await Promise.resolve(reversal);
  }

  async findItem(companyId: string, itemId: string) {
    return await Promise.resolve(
      this.items.find(
        (item) => item.companyId === companyId && item.id === itemId,
      ) ?? null,
    );
  }

  async findLot(companyId: string, lotId: string) {
    return await Promise.resolve(
      this.lots.find(
        (lot) => lot.companyId === companyId && lot.id === lotId,
      ) ?? null,
    );
  }

  async getNextDocumentSequence() {
    return await Promise.resolve(this.nextSequence++);
  }

  async findCompanyCode(companyId: string) {
    return await Promise.resolve(this.companyCodes[companyId] ?? null);
  }

  async listLots(companyId: string) {
    return await Promise.resolve(
      this.lots.filter((lot) => lot.companyId === companyId),
    );
  }

  async createLot(input: {
    companyId: string;
    itemId: string;
    lotNumber: string;
    expiresAt: Date | null;
  }): Promise<StockLot> {
    const created = buildLot({
      id: `lot-${++this.lotCounter}`,
      companyId: input.companyId,
      itemId: input.itemId,
      lotNumber: input.lotNumber,
      expiresAt: input.expiresAt,
    });
    this.lots.push(created);
    return await Promise.resolve(created);
  }

  async listQuants(companyId: string) {
    return await Promise.resolve(
      this.quants.filter((quant) => quant.companyId === companyId),
    );
  }

  private applyQuant(input: {
    companyId: string;
    itemId: string;
    scopeNodeId: string;
    scopeType: StockScopeType;
    lotId: string | null;
    delta: number;
    unitCost: string | null;
  }) {
    const key = quantKey(input);
    let quant = this.quants.find((q) => quantKey(q) === key);

    if (!quant) {
      quant = buildQuant({
        id: `quant-${++this.quantCounter}`,
        companyId: input.companyId,
        itemId: input.itemId,
        scopeNodeId: input.scopeNodeId,
        scopeType: input.scopeType,
        lotId: input.lotId,
        quantity: '0.000',
        avgUnitCost: null,
        reservedQuantity: '0.000',
        quarantineQuantity: '0.000',
      });

      this.quants.push(quant);
    }

    const newQty = Number(quant.quantity) + input.delta;
    const unitCost = input.unitCost ?? quant.avgUnitCost ?? '0';

    if (newQty === 0) {
      quant.quantity = '0.000';
      quant.avgUnitCost = null;
    } else {
      const prevQty = Number(quant.quantity);
      const prevAvg = quant.avgUnitCost === null ? 0 : Number(quant.avgUnitCost);
      const addCost = Number(unitCost);
      // MWA when adding; simple price when removing (we use prevAvg since
      // we are reducing at the known cost layer).
      const nextAvg =
        input.delta >= 0
          ? (prevQty * prevAvg + input.delta * addCost) / newQty
          : prevAvg;
      quant.quantity = newQty.toFixed(3);
      quant.avgUnitCost = nextAvg.toFixed(4);
    }

    quant.updatedAt = new Date('2026-08-21T09:00:00.000Z');
  }
}
