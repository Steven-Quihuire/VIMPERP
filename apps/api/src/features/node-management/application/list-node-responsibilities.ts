import type {
  NodeManagementGateway,
  NodeResponsibilityRecord,
} from '../domain/node-management';

export type ListNodeResponsibilities = (input: {
  companyId: string;
}) => Promise<NodeResponsibilityRecord[]>;

export const createListNodeResponsibilitiesUseCase = ({
  gateway,
}: {
  gateway: NodeManagementGateway;
}): ListNodeResponsibilities => {
  return async ({ companyId }) => {
    return await gateway.listResponsibilitiesByCompany(companyId);
  };
};
