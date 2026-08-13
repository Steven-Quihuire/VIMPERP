import type {
  NodeManagementGateway,
  NodeManagementScopeType,
  NodeResponsibilityState,
} from '../domain/node-management';
import { NodeManagementScopeNotFoundError } from '../domain/node-management';

export type GetNodeResponsibilityState = (input: {
  companyId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
}) => Promise<NodeResponsibilityState>;

export const createGetNodeResponsibilityStateUseCase = ({
  gateway,
}: {
  gateway: NodeManagementGateway;
}): GetNodeResponsibilityState => {
  return async (input) => {
    const state = await gateway.getResponsibilityState(input);

    if (!state) {
      throw new NodeManagementScopeNotFoundError();
    }

    return state;
  };
};
