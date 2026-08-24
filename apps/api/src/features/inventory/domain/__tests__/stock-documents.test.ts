import { describe, expect, it } from 'vitest';

import {
  StockDocumentItemNotFoundError,
  StockDocumentLineLotInvalidError,
  StockDocumentLineQuantityError,
  StockDocumentNotFoundError,
  StockDocumentValidationError,
  assertCanCancelDocument,
  assertCanConfirmDocument,
  assertCanEditLines,
  assertValidLineQuantity,
  assertValidLotForLine,
  computeNewAvg,
  generateDocumentNo,
  type StockDocumentLine,
} from '../stock-documents';

describe('inventory domain — pure helpers', () => {
  describe('computeNewAvg', () => {
    it('returns null when the resulting quantity is zero (full drain)', () => {
      // prev=5, add=-5 → newQty=0
      const result = computeNewAvg({
        prevQuantity: '5',
        prevAvgUnitCost: '9.0000',
        addQuantity: '-5',
        addUnitCost: '9.0000',
      });

      expect(result).toBeNull();
    });

    it('returns null when both previous and added quantities are zero (cold stock, no movement)', () => {
      const result = computeNewAvg({
        prevQuantity: '0',
        prevAvgUnitCost: null,
        addQuantity: '0',
        addUnitCost: '8.00',
      });

      expect(result).toBeNull();
    });

    it('uses the added cost as the new average when the previous quantity is zero (cold stock, first receipt)', () => {
      const result = computeNewAvg({
        prevQuantity: '0',
        prevAvgUnitCost: null,
        addQuantity: '5',
        addUnitCost: '12.50',
      });

      expect(result).toBe('12.5000');
    });

    it('blends a known previous average with a new receipt using string math', () => {
      // (3 * 10 + 5 * 14) / 8 = (30 + 70) / 8 = 12.5
      const result = computeNewAvg({
        prevQuantity: '3',
        prevAvgUnitCost: '10.0000',
        addQuantity: '5',
        addUnitCost: '14.0000',
      });

      expect(result).toBe('12.5000');
    });

    it('keeps the previous average when the added quantity is zero', () => {
      const result = computeNewAvg({
        prevQuantity: '7',
        prevAvgUnitCost: '9.2500',
        addQuantity: '0',
        addUnitCost: '0',
      });

      expect(result).toBe('9.2500');
    });

    it('rounds to four decimal places using banker-safe rounding', () => {
      // (1 * 0.0001 + 1 * 0.0001) / 2 = 0.0001
      const result = computeNewAvg({
        prevQuantity: '1',
        prevAvgUnitCost: '0.0001',
        addQuantity: '1',
        addUnitCost: '0.0001',
      });

      expect(result).toBe('0.0001');
    });
  });

  describe('generateDocumentNo', () => {
    it('builds the document number from the uppercase company code, origin short, and 5-digit sequence', () => {
      const result = generateDocumentNo({
        companyCode: 'acme',
        originShort: 'wh',
        seq: 42,
      });

      expect(result).toBe('ACME-WH-00042');
    });

    it('zero-pads the sequence to exactly five digits', () => {
      const result = generateDocumentNo({
        companyCode: 'globex',
        originShort: 'pos',
        seq: 1,
      });

      expect(result).toBe('GLOBEX-POS-00001');
    });

    it('throws when the company code is not alphanumeric', () => {
      expect(() =>
        generateDocumentNo({
          companyCode: 'acme!',
          originShort: 'WH',
          seq: 1,
        }),
      ).toThrow(StockDocumentValidationError);
    });

    it('throws when the origin short is not 2 to 4 letters', () => {
      expect(() =>
        generateDocumentNo({
          companyCode: 'ACME',
          originShort: 'W',
          seq: 1,
        }),
      ).toThrow(StockDocumentValidationError);

      expect(() =>
        generateDocumentNo({
          companyCode: 'ACME',
          originShort: 'WAREHOUSE',
          seq: 1,
        }),
      ).toThrow(StockDocumentValidationError);
    });

    it('throws when the sequence is not a positive integer within the 5-digit window', () => {
      expect(() =>
        generateDocumentNo({
          companyCode: 'ACME',
          originShort: 'WH',
          seq: 0,
        }),
      ).toThrow(StockDocumentValidationError);

      expect(() =>
        generateDocumentNo({
          companyCode: 'ACME',
          originShort: 'WH',
          seq: 100_000,
        }),
      ).toThrow(StockDocumentValidationError);
    });
  });
});

describe('inventory domain — lot validators', () => {
  const baseLine = (
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

  it('rejects serial items that omit a lot', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '1.000', lotId: null }),
        trackBatchMode: 'serial',
      }),
    ).toThrow(StockDocumentLineLotInvalidError);
  });

  it('rejects serial items when the line quantity is not exactly one', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '2.000', lotId: 'lot-1' }),
        trackBatchMode: 'serial',
      }),
    ).toThrow(StockDocumentLineQuantityError);
  });

  it('accepts serial items with a lot and quantity 1', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '1.000', lotId: 'lot-1' }),
        trackBatchMode: 'serial',
      }),
    ).not.toThrow();
  });

  it('rejects batch items that omit a lot', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '4.000', lotId: null }),
        trackBatchMode: 'batch',
      }),
    ).toThrow(StockDocumentLineLotInvalidError);
  });

  it('accepts batch items with a lot regardless of quantity', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '12.500', lotId: 'lot-1' }),
        trackBatchMode: 'batch',
      }),
    ).not.toThrow();
  });

  it('rejects any lot when the item is configured as none', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '1.000', lotId: 'lot-1' }),
        trackBatchMode: 'none',
      }),
    ).toThrow(StockDocumentLineLotInvalidError);
  });

  it('accepts items configured as none without a lot', () => {
    expect(() =>
      assertValidLotForLine({
        line: baseLine({ quantity: '3.000', lotId: null }),
        trackBatchMode: 'none',
      }),
    ).not.toThrow();
  });
});

describe('inventory domain — state machine guards', () => {
  const baseDoc = (status: 'draft' | 'confirmed' | 'cancelled') => ({
    id: 'doc-1',
    companyId: 'company-1',
    documentNo: null,
    type: 'receipt' as const,
    status,
    originScopeNodeId: null,
    originScopeType: null,
    destinationScopeNodeId: 'wh-1',
    destinationScopeType: 'warehouse' as const,
    occurredAt: new Date('2026-08-20T09:00:00.000Z'),
    createdByUserId: 'user-1',
    reversalOfId: null,
    note: null,
    createdAt: new Date('2026-08-20T09:00:00.000Z'),
    updatedAt: new Date('2026-08-20T09:00:00.000Z'),
  });

  it('allows confirm from draft only', () => {
    expect(() => assertCanConfirmDocument(baseDoc('draft'))).not.toThrow();
    expect(() => assertCanConfirmDocument(baseDoc('confirmed'))).toThrow(
      StockDocumentValidationError,
    );
    expect(() => assertCanConfirmDocument(baseDoc('cancelled'))).toThrow(
      StockDocumentValidationError,
    );
  });

  it('allows cancel of drafts and confirmed documents but rejects double cancel', () => {
    expect(() => assertCanCancelDocument(baseDoc('draft'))).not.toThrow();
    expect(() => assertCanCancelDocument(baseDoc('confirmed'))).not.toThrow();
    expect(() => assertCanCancelDocument(baseDoc('cancelled'))).toThrow(
      StockDocumentValidationError,
    );
  });

  it('only draft documents can mutate their lines', () => {
    expect(() =>
      assertCanEditLines({
        ...baseDoc('draft'),
        type: 'transfer',
        originScopeNodeId: 'wh-1',
        originScopeType: 'warehouse',
        destinationScopeNodeId: 'wh-2',
        destinationScopeType: 'warehouse',
      }),
    ).not.toThrow();
    expect(() => assertCanEditLines(baseDoc('confirmed'))).toThrow(
      StockDocumentValidationError,
    );
    expect(() => assertCanEditLines(baseDoc('cancelled'))).toThrow(
      StockDocumentValidationError,
    );
  });
});

describe('inventory domain — quantity validation', () => {
  it('rejects non-positive line quantities', () => {
    expect(() => assertValidLineQuantity('0')).toThrow(
      StockDocumentLineQuantityError,
    );
    expect(() => assertValidLineQuantity('-1.000')).toThrow(
      StockDocumentLineQuantityError,
    );
  });

  it('accepts positive line quantities as strings', () => {
    expect(() => assertValidLineQuantity('1.000')).not.toThrow();
    expect(() => assertValidLineQuantity('1500.500')).not.toThrow();
  });
});

describe('inventory domain — error codes', () => {
  it('exposes stable machine-readable codes for downstream error middleware', () => {
    expect(new StockDocumentValidationError().code).toBe('STOCK_DOCUMENT_VALIDATION');
    expect(new StockDocumentNotFoundError().code).toBe('STOCK_DOCUMENT_NOT_FOUND');
    expect(new StockDocumentItemNotFoundError().code).toBe(
      'STOCK_DOCUMENT_ITEM_NOT_FOUND',
    );
    expect(new StockDocumentLineLotInvalidError().code).toBe(
      'STOCK_DOCUMENT_LINE_LOT_INVALID',
    );
    expect(new StockDocumentLineQuantityError().code).toBe(
      'STOCK_DOCUMENT_LINE_QUANTITY',
    );
  });
});
