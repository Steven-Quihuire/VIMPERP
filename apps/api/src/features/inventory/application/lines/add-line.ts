import {
  StockDocumentItemNotFoundError,
  StockDocumentLineLotInvalidError,
  StockDocumentNotFoundError,
  assertCanEditLines,
  assertValidLineQuantity,
  assertValidLotForLine,
  type StockDocumentsGateway,
  type StockDocumentLine,
} from '../../domain/stock-documents';

export const createAddLineUseCase = ({
  gateway,
}: {
  gateway: StockDocumentsGateway;
}) => {
  return async (input: {
    companyId: string;
    documentId: string;
    itemId: string;
    quantity: string;
    unitCost: string | null;
    lotId: string | null;
  }): Promise<StockDocumentLine> => {
    assertValidLineQuantity(input.quantity);

    const document = await gateway.getDocument(input.companyId, input.documentId);
    if (!document) {
      throw new StockDocumentNotFoundError();
    }

    assertCanEditLines(document);

    const item = await gateway.findItem(input.companyId, input.itemId);
    if (!item) {
      throw new StockDocumentItemNotFoundError();
    }

    // Pure lot-mode check first so the user gets the most specific error
    // (e.g. serial with qty=2 → LineQuantityError, not a missing-lot lookup).
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

    return await gateway.addLine({
      companyId: input.companyId,
      documentId: document.id,
      itemId: input.itemId,
      quantity: input.quantity,
      unitCost: input.unitCost,
      lotId: input.lotId,
    });
  };
};
