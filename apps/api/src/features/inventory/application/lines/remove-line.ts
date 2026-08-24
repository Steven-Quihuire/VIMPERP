import {
  StockDocumentLineNotFoundError,
  StockDocumentNotFoundError,
  assertCanEditLines,
  type StockDocumentsGateway,
} from '../../domain/stock-documents';

export const createRemoveLineUseCase = ({
  gateway,
}: {
  gateway: StockDocumentsGateway;
}) => {
  return async (input: {
    companyId: string;
    lineId: string;
  }): Promise<void> => {
    const line = await gateway.getLine(input.companyId, input.lineId);
    if (!line) {
      throw new StockDocumentLineNotFoundError();
    }

    const document = await gateway.getDocument(input.companyId, line.documentId);
    if (!document) {
      throw new StockDocumentNotFoundError();
    }

    assertCanEditLines(document);

    const removed = await gateway.removeLine(input.companyId, line.id);
    if (!removed) {
      throw new StockDocumentLineNotFoundError();
    }
  };
};
