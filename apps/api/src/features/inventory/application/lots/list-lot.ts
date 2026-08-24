import type { StockLot, StockLotsGateway } from '../../domain/stock-documents';

export const createListLotsUseCase = ({
  gateway,
}: {
  gateway: StockLotsGateway;
}) => {
  return async (input: { companyId: string }): Promise<StockLot[]> => {
    return await gateway.listLots(input.companyId);
  };
};
