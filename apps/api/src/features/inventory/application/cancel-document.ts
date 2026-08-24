import {
  StockDocumentNotFoundError,
  assertCanCancelDocument,
  type StockDocumentsGateway,
  type StockDocument,
} from '../domain/stock-documents';

export const createCancelDocumentUseCase = ({
  gateway,
  now = () => new Date(),
}: {
  gateway: StockDocumentsGateway;
  now?: () => Date;
}) => {
  return async (input: {
    companyId: string;
    documentId: string;
  }): Promise<StockDocument> => {
    const document = await gateway.getDocument(input.companyId, input.documentId);

    if (!document) {
      throw new StockDocumentNotFoundError();
    }

    assertCanCancelDocument(document);

    const cancelled = await gateway.cancelDocument({
      companyId: input.companyId,
      documentId: document.id,
      at: now(),
    });

    if (!cancelled) {
      throw new StockDocumentNotFoundError();
    }

    return cancelled;
  };
};
