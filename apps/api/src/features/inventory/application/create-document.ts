import {
  StockDocumentValidationError,
  type StockDocumentsGateway,
  type StockDocument,
  type StockDocumentType,
  type StockScopeType,
} from '../domain/stock-documents';

const validTypes: readonly StockDocumentType[] = [
  'receipt',
  'transfer',
  'adjustment',
  'loss',
];

const validScopeTypes: readonly StockScopeType[] = ['warehouse', 'point-of-sale'];

const assertValidDocumentType = (type: string): StockDocumentType => {
  if (!validTypes.includes(type as StockDocumentType)) {
    throw new StockDocumentValidationError(
      `Unknown stock document type: ${type}`,
    );
  }

  return type as StockDocumentType;
};

const assertValidScopeType = (
  label: string,
  value: string,
): StockScopeType => {
  if (!validScopeTypes.includes(value as StockScopeType)) {
    throw new StockDocumentValidationError(
      `${label} must be a warehouse or point-of-sale node.`,
    );
  }

  return value as StockScopeType;
};

export const createCreateDocumentUseCase = ({
  gateway,
}: {
  gateway: StockDocumentsGateway;
}) => {
  return async (input: {
    companyId: string;
    type: string;
    originScopeNodeId: string | null;
    originScopeType: string | null;
    destinationScopeNodeId: string | null;
    destinationScopeType: string | null;
    occurredAt: Date;
    createdByUserId: string;
    note: string | null;
  }): Promise<StockDocument> => {
    const type = assertValidDocumentType(input.type);

    const originScopeType =
      input.originScopeType === null
        ? null
        : assertValidScopeType('originScopeType', input.originScopeType);
    const destinationScopeType =
      input.destinationScopeType === null
        ? null
        : assertValidScopeType('destinationScopeType', input.destinationScopeType);

    if (input.originScopeNodeId === null && originScopeType !== null) {
      throw new StockDocumentValidationError(
        'Origin scope type requires an origin scope node id.',
      );
    }

    if (input.originScopeNodeId !== null && originScopeType === null) {
      throw new StockDocumentValidationError(
        'Origin scope node id requires an origin scope type.',
      );
    }

    if (
      input.destinationScopeNodeId === null &&
      destinationScopeType !== null
    ) {
      throw new StockDocumentValidationError(
        'Destination scope type requires a destination scope node id.',
      );
    }

    if (
      input.destinationScopeNodeId !== null &&
      destinationScopeType === null
    ) {
      throw new StockDocumentValidationError(
        'Destination scope node id requires a destination scope type.',
      );
    }

    if (type === 'receipt' && input.destinationScopeNodeId === null) {
      throw new StockDocumentValidationError(
        'Receipt documents must have a destination scope.',
      );
    }

    if (
      type === 'transfer' &&
      (input.originScopeNodeId === null || input.destinationScopeNodeId === null)
    ) {
      throw new StockDocumentValidationError(
        'Transfer documents must have both origin and destination scopes.',
      );
    }

    if (
      type === 'transfer' &&
      input.originScopeNodeId === input.destinationScopeNodeId
    ) {
      throw new StockDocumentValidationError(
        'Transfer origin and destination scopes must differ.',
      );
    }

    if (
      (type === 'adjustment' || type === 'loss') &&
      input.originScopeNodeId === null
    ) {
      throw new StockDocumentValidationError(
        'Adjustment and loss documents must have an origin scope.',
      );
    }

    return await gateway.createDocument({
      companyId: input.companyId,
      type,
      originScopeNodeId: input.originScopeNodeId,
      originScopeType,
      destinationScopeNodeId: input.destinationScopeNodeId,
      destinationScopeType,
      occurredAt: input.occurredAt,
      createdByUserId: input.createdByUserId,
      note: input.note,
    });
  };
};
