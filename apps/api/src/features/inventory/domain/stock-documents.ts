/**
 * Inventory domain — pure entities, errors, and helpers.
 *
 * This module is intentionally free of any Express, Drizzle, Zod, or PG
 * dependencies. All numerics are strings to match the database precision.
 */

import type { ItemTrackBatchMode } from '../../items/domain/item';

export const stockDocumentTypeValues = [
  'receipt',
  'transfer',
  'adjustment',
  'loss',
] as const;

export type StockDocumentType = (typeof stockDocumentTypeValues)[number];

export const stockDocumentStatusValues = [
  'draft',
  'confirmed',
  'cancelled',
] as const;

export type StockDocumentStatus = (typeof stockDocumentStatusValues)[number];

export const stockScopeTypeValues = ['warehouse', 'point-of-sale'] as const;
export type StockScopeType = (typeof stockScopeTypeValues)[number];

/**
 * Numeric strings are preserved as strings to keep DB precision.
 * `unitCost` and `avgUnitCost` use `numeric(14, 4)`; quantities use `numeric(14, 3)`.
 */
export type StockDocument = {
  id: string;
  companyId: string;
  documentNo: string | null;
  type: StockDocumentType;
  status: StockDocumentStatus;
  originScopeNodeId: string | null;
  originScopeType: StockScopeType | null;
  destinationScopeNodeId: string | null;
  destinationScopeType: StockScopeType | null;
  occurredAt: Date;
  createdByUserId: string;
  reversalOfId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StockDocumentLine = {
  id: string;
  companyId: string;
  documentId: string;
  itemId: string;
  quantity: string;
  unitCost: string | null;
  lotId: string | null;
  createdAt: Date;
};

export type StockLot = {
  id: string;
  companyId: string;
  itemId: string;
  lotNumber: string;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StockQuant = {
  id: string;
  companyId: string;
  itemId: string;
  scopeNodeId: string;
  scopeType: StockScopeType;
  lotId: string | null;
  quantity: string;
  reservedQuantity: string;
  quarantineQuantity: string;
  avgUnitCost: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Track-batch-mode re-export so consumers don't need to reach into items.
 */
export type StockItemTrackBatchMode = ItemTrackBatchMode;

export const adjustRequires = {
  stockAdjust: 'inventory.stock.adjust',
  documentsConfirm: 'inventory.documents.confirm',
} as const;

export type StockDocumentsGateway = {
  createDocument: (input: {
    companyId: string;
    type: StockDocumentType;
    originScopeNodeId: string | null;
    originScopeType: StockScopeType | null;
    destinationScopeNodeId: string | null;
    destinationScopeType: StockScopeType | null;
    occurredAt: Date;
    createdByUserId: string;
    note: string | null;
  }) => Promise<StockDocument>;
  getDocument: (
    companyId: string,
    documentId: string,
  ) => Promise<StockDocument | null>;
  listDocuments: (
    companyId: string,
    filters?: {
      type?: StockDocumentType;
      status?: StockDocumentStatus;
    },
  ) => Promise<StockDocument[]>;
  addLine: (input: {
    companyId: string;
    documentId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }) => Promise<StockDocumentLine>;
  getLine: (
    companyId: string,
    lineId: string,
  ) => Promise<StockDocumentLine | null>;
  updateLine: (input: {
    companyId: string;
    lineId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }) => Promise<StockDocumentLine | null>;
  removeLine: (companyId: string, lineId: string) => Promise<boolean>;
  listLines: (companyId: string, documentId: string) => Promise<StockDocumentLine[]>;
  confirmDocument: (input: {
    companyId: string;
    documentId: string;
    documentNo: string;
    at: Date;
    capabilities: readonly string[];
  }) => Promise<StockDocument | null>;
  cancelDocument: (input: {
    companyId: string;
    documentId: string;
    at: Date;
  }) => Promise<StockDocument | null>;
  reverseDocument: (input: {
    companyId: string;
    documentId: string;
    documentNo: string;
    at: Date;
    createdByUserId: string;
  }) => Promise<StockDocument | null>;
  findItem: (
    companyId: string,
    itemId: string,
  ) => Promise<{ id: string; trackBatchMode: StockItemTrackBatchMode } | null>;
  findLot: (
    companyId: string,
    lotId: string,
  ) => Promise<StockLot | null>;
  getNextDocumentSequence: (companyId: string) => Promise<number>;
  findCompanyCode: (companyId: string) => Promise<string | null>;
  listLots: (companyId: string) => Promise<StockLot[]>;
  listQuants: (companyId: string) => Promise<StockQuant[]>;
};

export type StockLotsGateway = {
  createLot: (input: {
    companyId: string;
    itemId: string;
    lotNumber: string;
    expiresAt: Date | null;
  }) => Promise<StockLot>;
  listLots: (companyId: string) => Promise<StockLot[]>;
};

export type StockQuantsGateway = {
  listQuants: (companyId: string) => Promise<StockQuant[]>;
};

/**
 * Compute the new moving weighted average.
 *
 * Pure function: returns the new average as a `numeric(14,4)` string.
 * Returns `null` when the resulting quantity is zero (no stock ⇒ no average).
 */
export const computeNewAvg = (input: {
  prevQuantity: string;
  prevAvgUnitCost: string | null;
  addQuantity: string;
  addUnitCost: string;
}): string | null => {
  const prevQty = Number(input.prevQuantity);
  const addQty = Number(input.addQuantity);
  const addCost = Number(input.addUnitCost);
  const newQty = prevQty + addQty;

  if (!Number.isFinite(prevQty) || !Number.isFinite(addQty) || !Number.isFinite(addCost)) {
    throw new StockDocumentValidationError(
      'Stock quantities and unit costs must be finite numbers.',
    );
  }

  if (newQty === 0) {
    return null;
  }

  if (addQty === 0) {
    if (input.prevAvgUnitCost === null) {
      return null;
    }
    return input.prevAvgUnitCost;
  }

  const prevAvg = input.prevAvgUnitCost === null ? 0 : Number(input.prevAvgUnitCost);
  const newAvg = (prevQty * prevAvg + addQty * addCost) / newQty;

  return newAvg.toFixed(4);
};

const companyCodePattern = /^[A-Z0-9]{2,12}$/;
const originShortPattern = /^[A-Za-z]{2,4}$/;

/**
 * Pure document-number generator.
 *
 * Format: `{COMPANY}-{ORIGIN}-{SEQ:05}` where COMPANY is uppercase and
 * ORIGIN is a 2–4 letter origin scope (e.g. WH, POS, ADJ, LOS).
 * The gateway is responsible for handling unique-constraint collisions (23505).
 */
export const generateDocumentNo = (input: {
  companyCode: string;
  originShort: string;
  seq: number;
}): string => {
  const companyCode = input.companyCode.toUpperCase();

  if (!companyCodePattern.test(companyCode)) {
    throw new StockDocumentValidationError(
      'Company code must be 2–12 uppercase letters or digits.',
    );
  }

  if (!originShortPattern.test(input.originShort)) {
    throw new StockDocumentValidationError(
      'Origin short must be 2–4 ASCII letters.',
    );
  }

  if (
    !Number.isInteger(input.seq) ||
    input.seq < 1 ||
    input.seq > 99_999
  ) {
    throw new StockDocumentValidationError(
      'Document sequence must be an integer between 1 and 99,999.',
    );
  }

  return `${companyCode}-${input.originShort.toUpperCase()}-${String(input.seq).padStart(5, '0')}`;
};

export const originShortFor = (type: StockDocumentType): string => {
  switch (type) {
    case 'receipt':
      return 'RCV';
    case 'transfer':
      return 'TRF';
    case 'adjustment':
      return 'ADJ';
    case 'loss':
      return 'LOS';
  }
};

export const assertValidLineQuantity = (value: string) => {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new StockDocumentLineQuantityError(
      'Line quantity must be a positive number.',
    );
  }
};

export type LotValidationInput = {
  line: Pick<StockDocumentLine, 'quantity' | 'lotId'>;
  trackBatchMode: StockItemTrackBatchMode;
};

export const assertValidLotForLine = ({
  line,
  trackBatchMode,
}: LotValidationInput) => {
  if (trackBatchMode === 'batch') {
    if (line.lotId === null) {
      throw new StockDocumentLineLotInvalidError(
        'Lot is required for items configured with batch tracking.',
      );
    }
    return;
  }

  if (trackBatchMode === 'serial') {
    if (line.lotId === null) {
      throw new StockDocumentLineLotInvalidError(
        'Lot is required for items configured with serial tracking.',
      );
    }
    if (Number(line.quantity) !== 1) {
      throw new StockDocumentLineQuantityError(
        'Serial-tracked items must use quantity 1 per line.',
      );
    }
    return;
  }

  // trackBatchMode === 'none'
  if (line.lotId !== null) {
    throw new StockDocumentLineLotInvalidError(
      'Lot is forbidden for items configured with no tracking.',
    );
  }
};

export const assertCanEditLines = (document: StockDocument) => {
  if (document.status !== 'draft') {
    throw new StockDocumentValidationError(
      'Stock document lines can only be edited while the document is in draft.',
    );
  }
};

export const assertCanConfirmDocument = (document: StockDocument) => {
  if (document.status !== 'draft') {
    throw new StockDocumentValidationError(
      `Cannot confirm a ${document.status} stock document.`,
    );
  }
};

export const assertCanCancelDocument = (document: StockDocument) => {
  if (document.status === 'cancelled') {
    throw new StockDocumentValidationError(
      'Stock document is already cancelled.',
    );
  }
};

export const assertCanReverseDocument = (document: StockDocument) => {
  if (document.status !== 'confirmed') {
    throw new StockDocumentValidationError(
      'Only confirmed stock documents can be reversed.',
    );
  }
};

/* --------------------------------------------------------------------------
 * Errors
 * -------------------------------------------------------------------------- */

export class StockDocumentValidationError extends Error {
  readonly code = 'STOCK_DOCUMENT_VALIDATION';

  constructor(message = 'Stock document input is invalid.') {
    super(message);
    this.name = 'StockDocumentValidationError';
  }
}

export class StockDocumentNotFoundError extends Error {
  readonly code = 'STOCK_DOCUMENT_NOT_FOUND';

  constructor(message = 'Stock document was not found.') {
    super(message);
    this.name = 'StockDocumentNotFoundError';
  }
}

export class StockDocumentLineNotFoundError extends Error {
  readonly code = 'STOCK_DOCUMENT_LINE_NOT_FOUND';

  constructor(message = 'Stock document line was not found.') {
    super(message);
    this.name = 'StockDocumentLineNotFoundError';
  }
}

export class StockDocumentItemNotFoundError extends Error {
  readonly code = 'STOCK_DOCUMENT_ITEM_NOT_FOUND';

  constructor(message = 'Item was not found for the active company.') {
    super(message);
    this.name = 'StockDocumentItemNotFoundError';
  }
}

export class StockDocumentLineLotInvalidError extends Error {
  readonly code = 'STOCK_DOCUMENT_LINE_LOT_INVALID';

  constructor(message = 'Stock document line violates the lot tracking mode.') {
    super(message);
    this.name = 'StockDocumentLineLotInvalidError';
  }
}

export class StockDocumentLineQuantityError extends Error {
  readonly code = 'STOCK_DOCUMENT_LINE_QUANTITY';

  constructor(message = 'Stock document line quantity is invalid.') {
    super(message);
    this.name = 'StockDocumentLineQuantityError';
  }
}
