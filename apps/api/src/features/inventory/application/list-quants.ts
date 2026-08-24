import type { StockQuant, StockQuantsGateway } from '../domain/stock-documents';

export const createListQuantsUseCase = ({
  gateway,
}: {
  gateway: StockQuantsGateway;
}) => {
  return async (input: { companyId: string }): Promise<StockQuant[]> => {
    return await gateway.listQuants(input.companyId);
  };
};
