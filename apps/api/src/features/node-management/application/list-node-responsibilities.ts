import type { NodeManagementGateway, NodeResponsibility } from '../domain/node-management';

export type ListNodeResponsibilities = (input: {
  companyId: string;
}) => Promise<NodeResponsibility[]>;

export const createListNodeResponsibilitiesUseCase = ({
  gateway,
}: {
  gateway: NodeManagementGateway;
}): ListNodeResponsibilities => {
  return async ({ companyId }) => {
    return await gateway.listResponsibilitiesByCompany(companyId);
  };
};
