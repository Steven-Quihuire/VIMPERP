import {
  StockDocumentNotFoundError,
  type StockDocumentsGateway,
  type StockDocument,
  type StockDocumentStatus,
  type StockDocumentType,
} from '../domain/stock-documents';

export const createListDocumentsUseCase = ({
  gateway,
}: {
  gateway: StockDocumentsGateway;
}) => {
  return async (input: {
    companyId: string;
    type?: StockDocumentType;
    status?: StockDocumentStatus;
  }): Promise<StockDocument[]> => {
    return await gateway.listDocuments(input.companyId, {
      ...(input.type ? { type: input.type } : {}),
      ...(input.status ? { status: input.status } : {}),
    });
  };
};

export const createGetDocumentUseCase = ({
  gateway,
}: {
  gateway: StockDocumentsGateway;
}) => {
  return async (input: {
    companyId: string;
    documentId: string;
  }): Promise<StockDocument> => {
    const document = await gateway.getDocument(input.companyId, input.documentId);

    if (!document) {
      throw new StockDocumentNotFoundError();
    }

    return document;
  };
};
