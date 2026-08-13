import { describe, expect, it } from 'vitest';

import type {
  NodeManagementGateway,
  NodeManagementInvitation,
  NodeManagementInvitationDetails,
  NodeManagementMembership,
  NodeManagementUserAccount,
  NodeResponsibilityRecord,
  NodeResponsibilityState,
} from '../domain/node-management';
import { NodeManagementScopeNotFoundError } from '../domain/node-management';
import { createGetNodeResponsibilityStateUseCase } from './get-node-responsibility-state';

class InMemoryNodeManagementGateway implements NodeManagementGateway {
  state: NodeResponsibilityState | null = null;

  async listResponsibilitiesByCompany(): Promise<NodeResponsibilityRecord[]> {
    return await Promise.resolve([]);
  }

  async getResponsibilityState(): Promise<NodeResponsibilityState | null> {
    return await Promise.resolve(this.state);
  }

  async findScopeNode() {
    return await Promise.resolve(null);
  }

  async createInvitation(): Promise<NodeManagementInvitation> {
    throw new Error('not used');
  }

  async findInvitationByTokenHash(): Promise<NodeManagementInvitation | null> {
    return await Promise.resolve(null);
  }

  async getInvitationDetailsByTokenHash(): Promise<NodeManagementInvitationDetails | null> {
    return await Promise.resolve(null);
  }

  async findUserByEmail(): Promise<NodeManagementUserAccount | null> {
    return await Promise.resolve(null);
  }

  async findUserByIdentifier(): Promise<NodeManagementUserAccount | null> {
    return await Promise.resolve(null);
  }

  async findUserMemberships(): Promise<NodeManagementMembership[]> {
    return await Promise.resolve([]);
  }

  async acceptInvitation(): Promise<void> {
    await Promise.resolve();
  }
}

describe('createGetNodeResponsibilityStateUseCase', () => {
  it('returns the node responsibility state when the scope exists', async () => {
    const gateway = new InMemoryNodeManagementGateway();
    gateway.state = {
      companyId: 'company-1',
      scopeNodeId: 'scope-node-1',
      scopeType: 'local',
      scopeId: 'local-1',
      scopeName: 'Main Local',
      activeResponsibility: null,
      responsibilities: [],
    };

    const getResponsibilityState = createGetNodeResponsibilityStateUseCase({ gateway });

    await expect(
      getResponsibilityState({
        companyId: 'company-1',
        scopeType: 'local',
        scopeId: 'local-1',
      }),
    ).resolves.toEqual(gateway.state);
  });

  it('throws when the scope is missing', async () => {
    const gateway = new InMemoryNodeManagementGateway();
    const getResponsibilityState = createGetNodeResponsibilityStateUseCase({ gateway });

    await expect(
      getResponsibilityState({
        companyId: 'company-1',
        scopeType: 'local',
        scopeId: 'missing',
      }),
    ).rejects.toBeInstanceOf(NodeManagementScopeNotFoundError);
  });
});
