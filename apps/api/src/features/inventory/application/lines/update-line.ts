import {
  StockDocumentItemNotFoundError,
  StockDocumentLineLotInvalidError,
  StockDocumentLineNotFoundError,
  StockDocumentNotFoundError,
  assertCanEditLines,
  assertValidLineQuantity,
  assertValidLotForLine,
  type StockDocumentsGateway,
  type StockDocumentLine,
} from '../../domain/stock-documents';

export const createUpdateLineUseCase = ({
  gateway,
}: {
  gateway: StockDocumentsGateway;
}) => {
  return async (input: {
    companyId: string;
    lineId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }): Promise<StockDocumentLine> => {
    assertValidLineQuantity(input.quantity);

    const line = await gateway.getLine(input.companyId, input.lineId);
    if (!line) {
      throw new StockDocumentLineNotFoundError();
    }

    const document = await gateway.getDocument(input.companyId, line.documentId);
    if (!document) {
      throw new StockDocumentNotFoundError();
    }

    assertCanEditLines(document);

    const item = await gateway.findItem(input.companyId, input.itemId);
    if (!item) {
      throw new StockDocumentItemNotFoundError();
    }

    // Pure lot-mode check first so the user gets the most specific error.
    assertValidLotForLine({
      line: { quantity: input.quantity, lotId: input.lotId },
      trackBatchMode: item.trackBatchMode,
    });

    if (input.lotId !== null) {
      const lot = await gateway.findLot(input.companyId, input.lotId);
      if (!lot) {
        throw new StockDocumentLineLotInvalidError(
          'Lot does not belong to the active company.',
        );
      }
      if (lot.itemId !== input.itemId) {
        throw new StockDocumentLineLotInvalidError(
          'Lot does not belong to the line item.',
        );
      }
    }

    const updated = await gateway.updateLine({
      companyId: input.companyId,
      lineId: line.id,
      itemId: input.itemId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      lotId: input.lotId,
    });

    if (!updated) {
      throw new StockDocumentLineNotFoundError();
    }

    return updated;
  };
};
