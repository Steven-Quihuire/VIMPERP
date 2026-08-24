import {
  StockDocumentNotFoundError,
  StockDocumentValidationError,
  assertCanReverseDocument,
  generateDocumentNo,
  originShortFor,
  type StockDocumentsGateway,
  type StockDocument,
} from '../domain/stock-documents';

const MAX_DOCUMENT_NO_RETRIES = 5;

export const createReverseDocumentUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: StockDocumentsGateway;
  now?: () => Date;
}) => {
  return async (input: {
    companyId: string;
    documentId: string;
    createdByUserId: string;
  }): Promise<StockDocument> => {
    const original = await gateway.getDocument(input.companyId, input.documentId);

    if (!original) {
      throw new StockDocumentNotFoundError();
    }

    assertCanReverseDocument(original);

    const companyCode = await gateway.findCompanyCode(input.companyId);
    if (!companyCode) {
      throw new StockDocumentValidationError(
        'Cannot derive document number: company code is missing.',
      );
    }

    const originShort = originShortFor('adjustment');
    const at = now();

    for (let attempt = 0; attempt < MAX_DOCUMENT_NO_RETRIES; attempt += 1) {
      const seq = await gateway.getNextDocumentSequence(input.companyId);
      const documentNo = generateDocumentNo({
        companyCode,
        originShort,
        seq,
      });

      try {
        const reversal = await gateway.reverseDocument({
          companyId: input.companyId,
          documentId: original.id,
          documentNo,
          at,
          createdByUserId: input.createdByUserId,
        });

        if (!reversal) {
          throw new StockDocumentNotFoundError();
        }

        return reversal;
      } catch (error) {
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
