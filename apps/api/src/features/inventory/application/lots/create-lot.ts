import {
  StockDocumentItemNotFoundError,
  StockDocumentValidationError,
  type StockDocumentsGateway,
  type StockLot,
  type StockLotsGateway,
} from '../../domain/stock-documents';

export const createCreateLotUseCase = ({
  documentsGateway,
  lotsGateway,
}: {
  documentsGateway: StockDocumentsGateway;
  lotsGateway: StockLotsGateway;
}) => {
  return async (input: {
    companyId: string;
    itemId: string;
    lotNumber: string;
    expiresAt: Date | null;
  }): Promise<StockLot> => {
    const trimmed = input.lotNumber.trim();

    if (trimmed.length === 0) {
      throw new StockDocumentValidationError('Lot number is required.');
    }

    const item = await documentsGateway.findItem(input.companyId, input.itemId);
    if (!item) {
      throw new StockDocumentItemNotFoundError();
    }

    if (item.trackBatchMode === 'none') {
      throw new StockDocumentValidationError(
        'Lots cannot be created for items configured with no lot tracking.',
      );
    }

    const existing = await lotsGateway.listLots(input.companyId);
    const duplicate = existing.find(
      (lot: StockLot) => lot.itemId === input.itemId && lot.lotNumber === trimmed,
    );
    if (duplicate) {
      throw new StockDocumentValidationError(
        'A lot with the same number already exists for the item.',
      );
    }

    return await lotsGateway.createLot({
      companyId: input.companyId,
      itemId: input.itemId,
      lotNumber: trimmed,
      expiresAt: input.expiresAt,
    });
  };
};
