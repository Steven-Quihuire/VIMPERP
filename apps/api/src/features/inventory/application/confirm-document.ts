import {
  StockDocumentItemNotFoundError,
  StockDocumentLineLotInvalidError,
  StockDocumentNotFoundError,
  StockDocumentValidationError,
  adjustRequires,
  assertCanConfirmDocument,
  assertValidLotForLine,
  generateDocumentNo,
  originShortFor,
  type StockDocumentsGateway,
  type StockDocument,
  type StockDocumentLine,
} from '../domain/stock-documents';

const MAX_DOCUMENT_NO_RETRIES = 5;

const hasCapability = (
  capabilities: readonly string[],
  capability: string,
) => capabilities.includes(capability);

const assertValidExistingLinesForConfirm = async ({
  gateway,
  companyId,
  lines,
}: {
  gateway: StockDocumentsGateway;
  companyId: string;
  lines: readonly StockDocumentLine[];
}) => {
  for (const line of lines) {
    const item = await gateway.findItem(companyId, line.itemId);
    if (!item) {
      throw new StockDocumentItemNotFoundError();
    }

    assertValidLotForLine({
      line,
      trackBatchMode: item.trackBatchMode,
    });

    if (line.lotId === null) {
      continue;
    }

    const lot = await gateway.findLot(companyId, line.lotId);
    if (!lot) {
      throw new StockDocumentLineLotInvalidError(
        'Lot does not belong to the active company.',
      );
    }

    if (lot.itemId !== line.itemId) {
      throw new StockDocumentLineLotInvalidError(
        'Lot does not belong to the line item.',
      );
    }
  }
};

export const createConfirmDocumentUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: StockDocumentsGateway;
  now?: () => Date;
}) => {
  return async (input: {
    companyId: string;
    documentId: string;
    capabilities: readonly string[];
  }): Promise<StockDocument> => {
    if (!hasCapability(input.capabilities, adjustRequires.documentsConfirm)) {
      throw new StockDocumentValidationError(
        'Missing required capability: inventory.documents.confirm',
      );
    }

    const document = await gateway.getDocument(input.companyId, input.documentId);

    if (!document) {
      throw new StockDocumentNotFoundError();
    }

    if (document.type === 'adjustment' || document.type === 'loss') {
      if (!hasCapability(input.capabilities, adjustRequires.stockAdjust)) {
        throw new StockDocumentValidationError(
          'Adjustment confirm requires both inventory.documents.confirm and inventory.stock.adjust.',
        );
      }
    }

    assertCanConfirmDocument(document);

    const lines = await gateway.listLines(input.companyId, document.id);
    if (lines.length === 0) {
      throw new StockDocumentValidationError(
        'Cannot confirm a stock document with no lines.',
      );
    }

    await assertValidExistingLinesForConfirm({
      gateway,
      companyId: input.companyId,
      lines,
    });

    const companyCode = await gateway.findCompanyCode(input.companyId);
    if (!companyCode) {
      throw new StockDocumentValidationError(
        'Cannot derive document number: company code is missing.',
      );
    }

    const originShort = originShortFor(document.type);
    const at = now();

    for (let attempt = 0; attempt < MAX_DOCUMENT_NO_RETRIES; attempt += 1) {
      const seq = await gateway.getNextDocumentSequence(input.companyId);
      const documentNo = generateDocumentNo({
        companyCode,
        originShort,
        seq,
      });

      try {
        const confirmed = await gateway.confirmDocument({
          companyId: input.companyId,
          documentId: document.id,
          documentNo,
          at,
          capabilities: input.capabilities,
        });

        if (!confirmed) {
          throw new StockDocumentNotFoundError();
        }

        return confirmed;
      } catch (error) {
        // Only retry on the 23505 unique-collision sentinel surfaced by the
        // gateway. The InMemory helper throws an Error with a recognizable
        // message; the real gateway (S2) will surface an `isDocumentNoConflict`
        // predicate. Either way, retry with a fresh sequence.
        const isConflict =
          error instanceof Error &&
          (error.message.includes('conflicting documentNo') ||
            error.message.includes('confirm.duplicate'));

        if (!isConflict) {
          throw error;
        }
      }
    }

    throw new StockDocumentValidationError(
      'Failed to generate a unique document number after several retries.',
    );
  };
};
