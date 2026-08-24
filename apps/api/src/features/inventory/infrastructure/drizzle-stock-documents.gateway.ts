import { randomUUID } from 'node:crypto';

import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';

import type { AppDb } from '../../../shared/infrastructure/db/client';
import {
  companiesTable,
  itemsTable,
  stockDocumentLinesTable,
  stockDocumentsTable,
  stockLotsTable,
  stockQuantsTable,
} from '../../../shared/infrastructure/db/schema';
import {
  type StockDocument,
  type StockDocumentLine,
  type StockDocumentsGateway,
  type StockLot,
  type StockLotsGateway,
  type StockQuant,
  type StockQuantsGateway,
  StockDocumentLineLotInvalidError,
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../domain/stock-documents';
import { translateStockScopeTriggerError } from './translate-stock-scope-trigger-error';

const buildPendingDocumentNo = (id: string) => `__pending__:${id}`;

const unwrapCause = (error: unknown): unknown => {
  let candidate = error;

  while (typeof candidate === 'object' && candidate !== null && 'cause' in candidate) {
    const next = (candidate as { cause?: unknown }).cause;

    if (!next) {
      break;
    }

    candidate = next;
  }

  return candidate;
};

const readErrorCode = (error: unknown): string | null => {
  const candidate = unwrapCause(error);

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const { code } = candidate as { code?: unknown };

  return typeof code === 'string' ? code : null;
};

const readErrorMessage = (error: unknown): string | null => {
  const candidate = unwrapCause(error);

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const { message } = candidate as { message?: unknown };

  return typeof message === 'string' ? message : null;
};

const readErrorConstraint = (error: unknown): string | null => {
  const candidate = unwrapCause(error);

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const { constraint } = candidate as { constraint?: unknown };

  return typeof constraint === 'string' ? constraint : null;
};

/**
 * Returns `true` when the given error corresponds to a `23505` unique violation
 * on the `stock_documents_company_document_no_idx` index. The confirm/reverse
 * use cases use this predicate to decide whether to retry the document-number
 * generation loop.
 */
export const isDocumentNoConflict = (error: unknown): boolean => {
  if (readErrorCode(error) !== '23505') {
    return false;
  }

  const constraint = readErrorConstraint(error);
  const message = readErrorMessage(error);

  return (
    constraint === 'stock_documents_company_document_no_idx' ||
    (message ?? '').includes('stock_documents_company_document_no_idx')
  );
};

const isLotUniqViolation = (error: unknown): boolean => {
  if (readErrorCode(error) !== '23505') {
    return false;
  }

  const constraint = readErrorConstraint(error);

  return constraint === 'stock_lots_company_item_lot_idx';
};

const isPendingDocumentNo = (value: string) =>
  value.startsWith('__pending__:');

const toDocument = (
  row: typeof stockDocumentsTable.$inferSelect,
): StockDocument => ({
  id: row.id,
  companyId: row.companyId,
  documentNo: isPendingDocumentNo(row.documentNo) ? null : row.documentNo,
  type: row.type,
  status: row.status,
  originScopeNodeId: row.originScopeNodeId,
  originScopeType: row.originScopeType as StockDocument['originScopeType'],
  destinationScopeNodeId: row.destinationScopeNodeId,
  destinationScopeType: row.destinationScopeType as StockDocument['destinationScopeType'],
  occurredAt: row.occurredAt,
  createdByUserId: row.createdByUserId,
  reversalOfId: row.reversalOfId,
  note: row.note,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toLine = (
  row: typeof stockDocumentLinesTable.$inferSelect,
): StockDocumentLine => ({
  id: row.id,
  companyId: row.companyId,
  documentId: row.documentId,
  itemId: row.itemId,
  quantity: row.quantity,
  unitCost: row.unitCost,
  lotId: row.lotId,
  createdAt: row.createdAt,
});

const toQuant = (
  row: typeof stockQuantsTable.$inferSelect,
): StockQuant => ({
  id: row.id,
  companyId: row.companyId,
  itemId: row.itemId,
  scopeNodeId: row.scopeNodeId,
  scopeType: row.scopeType as StockQuant['scopeType'],
  lotId: row.lotId,
  quantity: row.quantity,
  reservedQuantity: row.reservedQuantity,
  quarantineQuantity: row.quarantineQuantity,
  avgUnitCost: row.avgUnitCost,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

const toLot = (row: typeof stockLotsTable.$inferSelect): StockLot => ({
  id: row.id,
  companyId: row.companyId,
  itemId: row.itemId,
  lotNumber: row.lotNumber,
  expiresAt: fromDateOnly(row.expiresAt),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

type QuantKey = {
  companyId: string;
  itemId: string;
  scopeNodeId: string;
  lotId: string | null;
};

const buildQuantKey = ({
  companyId,
  itemId,
  scopeNodeId,
  lotId,
}: QuantKey) =>
  `${companyId}::${itemId}::${scopeNodeId}::${lotId ?? ''}`;

const scopeTypeToColumnValue = (scopeType: 'warehouse' | 'point-of-sale') =>
  scopeType;

const deriveCompanyCode = (name: string): string => {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleaned.length < 2) {
    throw new StockDocumentValidationError(
      'Company name must contain at least two alphanumeric characters to derive a document-number prefix.',
    );
  }

  return cleaned.slice(0, 12);
};

const toDateOnly = (value: Date | null): string | null => {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 10);
};

const fromDateOnly = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
};

export const createDrizzleStockDocumentsGateway = (
  db: AppDb,
  {
    createId = randomUUID,
    now = () => new Date(),
  }: {
    createId?: () => string;
    now?: () => Date;
  } = {},
): StockDocumentsGateway & StockLotsGateway & StockQuantsGateway => {
  const generateId = createId;

  const fetchDocument = async (companyId: string, documentId: string) => {
    const [row] = await db
      .select()
      .from(stockDocumentsTable)
      .where(
        and(
          eq(stockDocumentsTable.companyId, companyId),
          eq(stockDocumentsTable.id, documentId),
        ),
      )
      .limit(1);

    return row ? toDocument(row) : null;
  };

  const fetchLineRows = async (companyId: string, documentId: string) => {
    return await db
      .select()
      .from(stockDocumentLinesTable)
      .where(
        and(
          eq(stockDocumentLinesTable.companyId, companyId),
          eq(stockDocumentLinesTable.documentId, documentId),
        ),
      )
      .orderBy(asc(stockDocumentLinesTable.createdAt));
  };

  /**
   * Upsert a quant row at the given key. `delta` is the signed quantity change
   * (positive for receipts/transfer-in, negative for losses/transfer-out).
   * `unitCost` is the cost applied to the add. When the new quantity drops to
   * zero, the average is reset to `NULL` per migration 0027 semantics.
   */
  const upsertQuant = async (input: {
    tx: AppDb;
    companyId: string;
    itemId: string;
    scopeNodeId: string;
    scopeType: 'warehouse' | 'point-of-sale';
    lotId: string | null;
    delta: string;
    unitCost: string;
    at: Date;
  }) => {
    const { tx, companyId, itemId, scopeNodeId, scopeType, lotId, delta, unitCost, at } = input;
    const deltaNumber = Number(delta);
    const unitCostNumber = Number(unitCost);

    if (!Number.isFinite(deltaNumber)) {
      throw new StockDocumentValidationError(
        `Quant delta must be a finite number, received "${delta}".`,
      );
    }

    if (!Number.isFinite(unitCostNumber)) {
      throw new StockDocumentValidationError(
        `Quant unit cost must be a finite number, received "${unitCost}".`,
      );
    }

    if (deltaNumber === 0) {
      return;
    }

    if (deltaNumber < 0) {
      const existing = await tx
        .select()
        .from(stockQuantsTable)
        .where(
          and(
            eq(stockQuantsTable.companyId, companyId),
            eq(stockQuantsTable.itemId, itemId),
            eq(stockQuantsTable.scopeNodeId, scopeNodeId),
            lotId === null
              ? isNull(stockQuantsTable.lotId)
              : eq(stockQuantsTable.lotId, lotId),
          ),
        )
        .limit(1);

      const current = existing[0];

      if (!current) {
        throw new StockDocumentValidationError(
          'Cannot apply a negative quant delta to a non-existent quant row.',
        );
      }

      const nextQuantityNumber = Number(current.quantity) + deltaNumber;

      if (nextQuantityNumber < 0) {
        throw new StockDocumentValidationError(
          `Quant would go negative: ${current.quantity} + ${delta} < 0.`,
        );
      }

      const nextQuantity = nextQuantityNumber.toFixed(3);
      const nextAvgUnitCost = nextQuantityNumber === 0 ? null : current.avgUnitCost;

      try {
        await tx
          .update(stockQuantsTable)
          .set({
            quantity: nextQuantity,
            avgUnitCost: nextAvgUnitCost,
            updatedAt: at,
          })
          .where(eq(stockQuantsTable.id, current.id));
      } catch (error) {
        const translated = translateStockScopeTriggerError(error);

        if (translated) {
          throw translated;
        }

        throw error;
      }

      return;
    }

    try {
      await tx.execute(sql`
        INSERT INTO stock_quants (
          id,
          company_id,
          item_id,
          scope_node_id,
          scope_type,
          lot_id,
          quantity,
          reserved_quantity,
          quarantine_quantity,
          avg_unit_cost,
          created_at,
          updated_at
        )
        VALUES (
          ${generateId()},
          ${companyId},
          ${itemId},
          ${scopeNodeId},
          ${scopeTypeToColumnValue(scopeType)},
          ${lotId},
          ${deltaNumber.toFixed(3)},
          ${'0.000'},
          ${'0.000'},
          ${unitCostNumber.toFixed(4)},
          ${at},
          ${at}
        )
        ON CONFLICT (company_id, item_id, scope_node_id, lot_id)
        DO UPDATE SET
          quantity = ROUND((stock_quants.quantity + EXCLUDED.quantity)::numeric, 3),
          avg_unit_cost = CASE
            WHEN stock_quants.quantity + EXCLUDED.quantity = 0 THEN NULL
            WHEN EXCLUDED.quantity < 0 THEN stock_quants.avg_unit_cost
            ELSE ROUND(
              (
                stock_quants.quantity * COALESCE(stock_quants.avg_unit_cost, 0)
                + EXCLUDED.quantity * COALESCE(EXCLUDED.avg_unit_cost, 0)
              ) / NULLIF(stock_quants.quantity + EXCLUDED.quantity, 0),
              4
            )
          END,
          updated_at = EXCLUDED.updated_at
      `);
    } catch (error) {
      const translated = translateStockScopeTriggerError(error);

      if (translated) {
        throw translated;
      }

      throw error;
    }
  };

  const applyQuantForLine = async (input: {
    tx: AppDb;
    companyId: string;
    document: StockDocument;
    line: StockDocumentLine;
    direction: 'in' | 'out';
    at: Date;
  }) => {
    const { tx, companyId, document, line, direction, at } = input;

    if (direction === 'in') {
      if (!document.destinationScopeNodeId || !document.destinationScopeType) {
        return;
      }

      await upsertQuant({
        tx,
        companyId,
        itemId: line.itemId,
        scopeNodeId: document.destinationScopeNodeId,
        scopeType: document.destinationScopeType,
        lotId: line.lotId,
        delta: line.quantity,
        unitCost: line.unitCost ?? '0.0000',
        at,
      });
      return;
    }

    if (!document.originScopeNodeId || !document.originScopeType) {
      return;
    }

    // For the loss / transfer-out path, the line quantity is always positive
    // (DB check constraint `quantity > 0`); we negate it here to produce a
    // negative delta for the quant upsert.
    const negatedQuantity = (Number(line.quantity) * -1).toFixed(3);

    await upsertQuant({
      tx,
      companyId,
      itemId: line.itemId,
      scopeNodeId: document.originScopeNodeId,
      scopeType: document.originScopeType,
      lotId: line.lotId,
      delta: negatedQuantity,
      unitCost: line.unitCost ?? '0.0000',
      at,
    });
  };

  const applyQuantsForDocument = async (input: {
    tx: AppDb;
    companyId: string;
    document: StockDocument;
    lines: StockDocumentLine[];
    at: Date;
  }) => {
    const { tx, companyId, document, lines, at } = input;

    if (document.type === 'receipt') {
      for (const line of lines) {
        await applyQuantForLine({
          tx,
          companyId,
          document,
          line,
          direction: 'in',
          at,
        });
      }
      return;
    }

    if (document.type === 'transfer') {
      for (const line of lines) {
        await applyQuantForLine({
          tx,
          companyId,
          document,
          line,
          direction: 'out',
          at,
        });
        await applyQuantForLine({
          tx,
          companyId,
          document,
          line,
          direction: 'in',
          at,
        });
      }
      return;
    }

    // adjustment | loss
    for (const line of lines) {
      await applyQuantForLine({
        tx,
        companyId,
        document,
        line,
        direction: 'out',
        at,
      });
    }
  };

  const compensateQuantsForDocument = async (input: {
    tx: AppDb;
    companyId: string;
    document: StockDocument;
    lines: StockDocumentLine[];
    at: Date;
  }) => {
    const { tx, companyId, document, lines, at } = input;

    if (document.type === 'receipt') {
      // Original added +qty at destination. Compensation removes -qty at
      // destination.
      for (const line of lines) {
        if (!document.destinationScopeNodeId || !document.destinationScopeType) {
          continue;
        }

        const negated = (Number(line.quantity) * -1).toFixed(3);

        await upsertQuant({
          tx,
          companyId,
          itemId: line.itemId,
          scopeNodeId: document.destinationScopeNodeId,
          scopeType: document.destinationScopeType,
          lotId: line.lotId,
          delta: negated,
          unitCost: line.unitCost ?? '0.0000',
          at,
        });
      }
      return;
    }

    if (document.type === 'transfer') {
      // Original added -qty at origin, +qty at destination. Compensation
      // adds +qty at origin and -qty at destination (i.e. reverses the flow).
      for (const line of lines) {
        if (document.originScopeNodeId && document.originScopeType) {
          await upsertQuant({
            tx,
            companyId,
            itemId: line.itemId,
            scopeNodeId: document.originScopeNodeId,
            scopeType: document.originScopeType,
            lotId: line.lotId,
            delta: line.quantity,
            unitCost: line.unitCost ?? '0.0000',
            at,
          });
        }

        if (document.destinationScopeNodeId && document.destinationScopeType) {
          const negated = (Number(line.quantity) * -1).toFixed(3);

          await upsertQuant({
            tx,
            companyId,
            itemId: line.itemId,
            scopeNodeId: document.destinationScopeNodeId,
            scopeType: document.destinationScopeType,
            lotId: line.lotId,
            delta: negated,
            unitCost: line.unitCost ?? '0.0000',
            at,
          });
        }
      }
      return;
    }

    // adjustment | loss: original removed -qty at origin. Compensation adds
    // +qty at origin.
    for (const line of lines) {
      if (!document.originScopeNodeId || !document.originScopeType) {
        continue;
      }

      await upsertQuant({
        tx,
        companyId,
        itemId: line.itemId,
        scopeNodeId: document.originScopeNodeId,
        scopeType: document.originScopeType,
        lotId: line.lotId,
        delta: line.quantity,
        unitCost: line.unitCost ?? '0.0000',
        at,
      });
    }
  };

  const confirmInTransaction = async (input: {
    companyId: string;
    documentId: string;
    documentNo: string;
    at: Date;
  }): Promise<StockDocument | null> => {
    try {
      return await db.transaction(async (tx) => {
        const [lockedRow] = await tx
          .select()
          .from(stockDocumentsTable)
          .where(
            and(
              eq(stockDocumentsTable.companyId, input.companyId),
              eq(stockDocumentsTable.id, input.documentId),
            ),
          )
          .for('update')
          .limit(1);

        if (!lockedRow) {
          return null;
        }

        const document = toDocument(lockedRow);

        if (document.status !== 'draft') {
          throw new StockDocumentValidationError(
            `Cannot confirm a ${document.status} stock document.`,
          );
        }

        const lines = (await tx
          .select()
          .from(stockDocumentLinesTable)
          .where(
            and(
              eq(stockDocumentLinesTable.companyId, input.companyId),
              eq(stockDocumentLinesTable.documentId, document.id),
            ),
          )).map(toLine);

        if (lines.length === 0) {
          throw new StockDocumentValidationError(
            'Cannot confirm a stock document with no lines.',
          );
        }

        await tx
          .update(stockDocumentsTable)
          .set({
            status: 'confirmed',
            documentNo: input.documentNo,
            updatedAt: input.at,
          })
          .where(
            and(
              eq(stockDocumentsTable.companyId, input.companyId),
              eq(stockDocumentsTable.id, document.id),
            ),
          );

        await applyQuantsForDocument({
          tx,
          companyId: input.companyId,
          document: { ...document, status: 'confirmed' },
          lines,
          at: input.at,
        });

        const [updatedRow] = await tx
          .select()
          .from(stockDocumentsTable)
          .where(
            and(
              eq(stockDocumentsTable.companyId, input.companyId),
              eq(stockDocumentsTable.id, document.id),
            ),
          )
          .limit(1);

        return updatedRow ? toDocument(updatedRow) : null;
      });
    } catch (error) {
      if (isDocumentNoConflict(error)) {
        throw error;
      }

      const translated = translateStockScopeTriggerError(error);

      if (translated) {
        throw translated;
      }

      throw error;
    }
  };

  const cancelInTransaction = async (input: {
    companyId: string;
    documentId: string;
    at: Date;
  }): Promise<StockDocument | null> => {
    return await db.transaction(async (tx) => {
      const [lockedRow] = await tx
        .select()
        .from(stockDocumentsTable)
        .where(
          and(
            eq(stockDocumentsTable.companyId, input.companyId),
            eq(stockDocumentsTable.id, input.documentId),
          ),
        )
        .for('update')
        .limit(1);

      if (!lockedRow) {
        return null;
      }

      const document = toDocument(lockedRow);

      if (document.status === 'cancelled') {
        return document;
      }

      if (document.status === 'confirmed') {
        const lines = (await tx
          .select()
          .from(stockDocumentLinesTable)
          .where(
            and(
              eq(stockDocumentLinesTable.companyId, input.companyId),
              eq(stockDocumentLinesTable.documentId, document.id),
            ),
          )).map(toLine);

        await compensateQuantsForDocument({
          tx,
          companyId: input.companyId,
          document,
          lines,
          at: input.at,
        });
      }

      try {
        await tx
          .update(stockDocumentsTable)
          .set({
            status: 'cancelled',
            updatedAt: input.at,
          })
          .where(
            and(
              eq(stockDocumentsTable.companyId, input.companyId),
              eq(stockDocumentsTable.id, document.id),
            ),
          );
      } catch (error) {
        const translated = translateStockScopeTriggerError(error);

        if (translated) {
          throw translated;
        }

        throw error;
      }

      const [updatedRow] = await tx
        .select()
        .from(stockDocumentsTable)
        .where(
          and(
            eq(stockDocumentsTable.companyId, input.companyId),
            eq(stockDocumentsTable.id, document.id),
          ),
        )
        .limit(1);

      return updatedRow ? toDocument(updatedRow) : null;
    });
  };

  const reverseInTransaction = async (input: {
    companyId: string;
    documentId: string;
    documentNo: string;
    at: Date;
    createdByUserId: string;
  }): Promise<StockDocument | null> => {
    return await db.transaction(async (tx) => {
      const [originalRow] = await tx
        .select()
        .from(stockDocumentsTable)
        .where(
          and(
            eq(stockDocumentsTable.companyId, input.companyId),
            eq(stockDocumentsTable.id, input.documentId),
          ),
        )
        .for('update')
        .limit(1);

      if (!originalRow || originalRow.status !== 'confirmed') {
        return null;
      }

      const original = toDocument(originalRow);

      const originalLines = (await tx
        .select()
        .from(stockDocumentLinesTable)
        .where(
          and(
            eq(stockDocumentLinesTable.companyId, input.companyId),
            eq(stockDocumentLinesTable.documentId, original.id),
          ),
        )).map(toLine);

      const reversalId = generateId();

      try {
        await tx.insert(stockDocumentsTable).values({
          id: reversalId,
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
      } catch (error) {
        if (isDocumentNoConflict(error)) {
          throw error;
        }

        const translated = translateStockScopeTriggerError(error);

        if (translated) {
          throw translated;
        }

        throw error;
      }

      const reversalLines: StockDocumentLine[] = originalLines.map((line) => ({
        ...line,
        id: generateId(),
        documentId: reversalId,
      }));

      for (const line of reversalLines) {
        await tx.insert(stockDocumentLinesTable).values({
          id: line.id,
          companyId: line.companyId,
          documentId: line.documentId,
          itemId: line.itemId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          lotId: line.lotId,
          createdAt: input.at,
        });
      }

      const reversal: StockDocument = {
        ...original,
        id: reversalId,
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
      };

      await applyQuantsForDocument({
        tx,
        companyId: input.companyId,
        document: reversal,
        lines: reversalLines,
        at: input.at,
      });

      const [refreshed] = await tx
        .select()
        .from(stockDocumentsTable)
        .where(eq(stockDocumentsTable.id, reversalId))
        .limit(1);

      return refreshed ? toDocument(refreshed) : reversal;
    });
  };

  return {
    createDocument: async (input) => {
      const at = now();
      const id = generateId();

      try {
        await db.insert(stockDocumentsTable).values({
          id,
          companyId: input.companyId,
          documentNo: buildPendingDocumentNo(id),
          type: input.type,
          status: 'draft',
          originScopeNodeId: input.originScopeNodeId,
          originScopeType: input.originScopeType,
          destinationScopeNodeId: input.destinationScopeNodeId,
          destinationScopeType: input.destinationScopeType,
          occurredAt: input.occurredAt,
          createdByUserId: input.createdByUserId,
          reversalOfId: null,
          note: input.note,
          createdAt: at,
          updatedAt: at,
        });
      } catch (error) {
        const translated = translateStockScopeTriggerError(error);

        if (translated) {
          throw translated;
        }

        throw error;
      }

      const created = await fetchDocument(input.companyId, id);

      if (!created) {
        throw new StockDocumentNotFoundError(
          `Stock document ${id} disappeared after insert.`,
        );
      }

      return created;
    },

    getDocument: async (companyId, documentId) => {
      return await fetchDocument(companyId, documentId);
    },

    listDocuments: async (companyId, filters) => {
      const conditions = [eq(stockDocumentsTable.companyId, companyId)];

      if (filters?.type) {
        conditions.push(eq(stockDocumentsTable.type, filters.type));
      }

      if (filters?.status) {
        conditions.push(eq(stockDocumentsTable.status, filters.status));
      }

      const rows = await db
        .select()
        .from(stockDocumentsTable)
        .where(and(...conditions))
        .orderBy(asc(stockDocumentsTable.occurredAt), asc(stockDocumentsTable.createdAt));

      return rows.map(toDocument);
    },

    addLine: async (input) => {
      const id = generateId();
      const at = now();

      try {
        await db.insert(stockDocumentLinesTable).values({
          id,
          companyId: input.companyId,
          documentId: input.documentId,
          itemId: input.itemId,
          quantity: input.quantity,
          unitCost: input.unitCost,
          lotId: input.lotId,
          createdAt: at,
        });
      } catch (error) {
        const translated = translateStockScopeTriggerError(error);

        if (translated) {
          throw translated;
        }

        throw error;
      }

      const [row] = await db
        .select()
        .from(stockDocumentLinesTable)
        .where(eq(stockDocumentLinesTable.id, id))
        .limit(1);

      if (!row) {
        throw new StockDocumentNotFoundError(
          `Stock document line ${id} disappeared after insert.`,
        );
      }

      return toLine(row);
    },

    getLine: async (companyId, lineId) => {
      const [row] = await db
        .select()
        .from(stockDocumentLinesTable)
        .where(
          and(
            eq(stockDocumentLinesTable.companyId, companyId),
            eq(stockDocumentLinesTable.id, lineId),
          ),
        )
        .limit(1);

      return row ? toLine(row) : null;
    },

    updateLine: async (input) => {
      const at = now();

      try {
        const [updated] = await db
          .update(stockDocumentLinesTable)
          .set({
            itemId: input.itemId,
            quantity: input.quantity,
            unitCost: input.unitCost,
            lotId: input.lotId,
            createdAt: at,
          })
          .where(
            and(
              eq(stockDocumentLinesTable.companyId, input.companyId),
              eq(stockDocumentLinesTable.id, input.lineId),
            ),
          )
          .returning();

        return updated ? toLine(updated) : null;
      } catch (error) {
        const translated = translateStockScopeTriggerError(error);

        if (translated) {
          throw translated;
        }

        throw error;
      }
    },

    removeLine: async (companyId, lineId) => {
      const rows = await db
        .delete(stockDocumentLinesTable)
        .where(
          and(
            eq(stockDocumentLinesTable.companyId, companyId),
            eq(stockDocumentLinesTable.id, lineId),
          ),
        )
        .returning({ id: stockDocumentLinesTable.id });

      return rows.length > 0;
    },

    listLines: async (companyId, documentId) => {
      const rows = await fetchLineRows(companyId, documentId);
      return rows.map(toLine);
    },

    confirmDocument: async (input) => {
      return await confirmInTransaction(input);
    },

    cancelDocument: async (input) => {
      return await cancelInTransaction(input);
    },

    reverseDocument: async (input) => {
      return await reverseInTransaction(input);
    },

    findItem: async (companyId, itemId) => {
      const [row] = await db
        .select({
          id: itemsTable.id,
          trackBatchMode: itemsTable.trackBatchMode,
        })
        .from(itemsTable)
        .where(
          and(
            eq(itemsTable.companyId, companyId),
            eq(itemsTable.id, itemId),
            isNull(itemsTable.deletedAt),
          ),
        )
        .limit(1);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        trackBatchMode: row.trackBatchMode,
      };
    },

    findLot: async (companyId, lotId) => {
      const [row] = await db
        .select()
        .from(stockLotsTable)
        .where(
          and(
            eq(stockLotsTable.companyId, companyId),
            eq(stockLotsTable.id, lotId),
          ),
        )
        .limit(1);

      return row ? toLot(row) : null;
    },

    getNextDocumentSequence: async (companyId) => {
      const [result] = await db
        .select({ value: count() })
        .from(stockDocumentsTable)
        .where(eq(stockDocumentsTable.companyId, companyId));

      return Number(result?.value ?? 0) + 1;
    },

    findCompanyCode: async (companyId) => {
      const [row] = await db
        .select({ name: companiesTable.name })
        .from(companiesTable)
        .where(eq(companiesTable.id, companyId))
        .limit(1);

      if (!row) {
        return null;
      }

      return deriveCompanyCode(row.name);
    },

    listLots: async (companyId) => {
      const rows = await db
        .select()
        .from(stockLotsTable)
        .where(eq(stockLotsTable.companyId, companyId))
        .orderBy(asc(stockLotsTable.lotNumber));

      return rows.map(toLot);
    },

    createLot: async (input) => {
      const id = generateId();
      const at = now();

      try {
        await db.insert(stockLotsTable).values({
          id,
          companyId: input.companyId,
          itemId: input.itemId,
          lotNumber: input.lotNumber,
          expiresAt: toDateOnly(input.expiresAt),
          createdAt: at,
          updatedAt: at,
        });
      } catch (error) {
        if (isLotUniqViolation(error)) {
          throw new StockDocumentLineLotInvalidError(
            `Lot number "${input.lotNumber}" already exists for this item.`,
          );
        }

        throw error;
      }

      const [row] = await db
        .select()
        .from(stockLotsTable)
        .where(eq(stockLotsTable.id, id))
        .limit(1);

      if (!row) {
        throw new StockDocumentNotFoundError(
          `Stock lot ${id} disappeared after insert.`,
        );
      }

      return toLot(row);
    },

    listQuants: async (companyId) => {
      const rows = await db
        .select()
        .from(stockQuantsTable)
        .where(eq(stockQuantsTable.companyId, companyId))
        .orderBy(asc(stockQuantsTable.scopeNodeId));

      return rows.map(toQuant);
    },
  };
};

export const _internal = {
  buildQuantKey,
  deriveCompanyCode,
  isDocumentNoConflict,
  translateStockScopeTriggerError,
};

// Helper used by tests only; export to assert introspection.
export const __testHooks = {
  buildQuantKey,
  deriveCompanyCode,
  isDocumentNoConflict,
  translateStockScopeTriggerError,
};
