import { describe, expect, it, vi } from 'vitest';

import { createCreateNodeManagementInvitationUseCase } from './create-node-management-invitation';
import {
  nodeManagementBaseMembershipRole,
  nodeManagementRoleKey,
  type NodeManagementGateway,
  type NodeManagementInvitationEmailSender,
} from '../domain/node-management';
import { hashNodeManagementInvitationToken } from './node-management-invitation-token';

const createGateway = (): NodeManagementGateway => ({
  listResponsibilitiesByCompany: vi.fn(),
  listPendingInvitationsByCompany: vi.fn(),
  getResponsibilityState: vi.fn(),
  findScopeNode: vi.fn(() => Promise.resolve({
    scopeNodeId: 'scope-node-1',
    scopeName: 'Main Local',
    companyName: 'Vimcore Labs',
  })),
  createInvitation: vi.fn((input) => Promise.resolve({
    ...input,
    managedRoleKey: nodeManagementRoleKey,
    baseMembershipRole: nodeManagementBaseMembershipRole,
    createdAt: new Date('2026-08-13T12:00:00.000Z'),
    acceptedAt: null,
    acceptedByUserId: null,
  })),
  findInvitationByTokenHash: vi.fn(),
  getInvitationDetailsByTokenHash: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserByIdentifier: vi.fn(),
  findUserMemberships: vi.fn(),
  acceptInvitation: vi.fn(),
});

describe('createCreateNodeManagementInvitationUseCase', () => {
  it('creates the invitation and reports sent delivery metadata', async () => {
    const gateway = createGateway();
    const emailSender: NodeManagementInvitationEmailSender = {
      sendInvitationEmail: vi.fn(() => Promise.resolve({ status: 'sent' as const })),
    };
    const useCase = createCreateNodeManagementInvitationUseCase({
      gateway,
      emailSender,
      buildInvitationLink: (token) => `https://app.vimcore.test/accept-invitation/${token}`,
      createId: () => 'inv-1',
      createToken: () => 'token-1',
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    });

    const result = await useCase({
      companyId: 'company-1',
      scopeType: 'local',
      scopeId: 'local-1',
      inviteeEmail: 'Manager@Vimcore.Test',
      createdByUserId: 'owner-1',
    });

    expect(gateway.createInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'inv-1',
        inviteeEmail: 'manager@vimcore.test',
        tokenHash: hashNodeManagementInvitationToken('token-1'),
      }),
    );
    expect(emailSender.sendInvitationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        invitationId: 'inv-1',
        inviteeEmail: 'manager@vimcore.test',
        invitationLink: 'https://app.vimcore.test/accept-invitation/token-1',
      }),
    );
    expect(result.delivery).toEqual({ status: 'sent' });
  });

  it('keeps the invitation when email delivery fails and reports the failure', async () => {
    const gateway = createGateway();
    const onEmailDeliveryFailure = vi.fn();
    const emailSender: NodeManagementInvitationEmailSender = {
      sendInvitationEmail: vi.fn(() => Promise.resolve({
        status: 'failed' as const,
        message: 'upstream timeout',
      })),
    };
    const useCase = createCreateNodeManagementInvitationUseCase({
      gateway,
      emailSender,
      buildInvitationLink: (token) => `https://app.vimcore.test/accept-invitation/${token}`,
      onEmailDeliveryFailure,
      createId: () => 'inv-2',
      createToken: () => 'token-2',
      now: () => new Date('2026-08-13T12:00:00.000Z'),
    });

    const result = await useCase({
      companyId: 'company-1',
      scopeType: 'local',
      scopeId: 'local-1',
      inviteeEmail: 'manager@vimcore.test',
      createdByUserId: 'owner-1',
    });

    expect(gateway.createInvitation).toHaveBeenCalledOnce();
    expect(result.delivery).toEqual({ status: 'failed', message: 'upstream timeout' });
    expect(onEmailDeliveryFailure).toHaveBeenCalledWith({
      invitationId: 'inv-2',
      inviteeEmail: 'manager@vimcore.test',
      errorMessage: 'upstream timeout',
    });
  });
});
