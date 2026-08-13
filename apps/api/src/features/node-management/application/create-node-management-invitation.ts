import { randomUUID } from 'node:crypto';

import type {
  NodeManagementGateway,
  NodeManagementInvitationEmailSender,
  NodeManagementScopeType,
} from '../domain/node-management';
import { NodeManagementScopeNotFoundError } from '../domain/node-management';
import {
  createNodeManagementInvitationToken,
  hashNodeManagementInvitationToken,
} from './node-management-invitation-token';

type CreateNodeManagementInvitationInput = {
  companyId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  inviteeEmail: string;
  createdByUserId: string;
};

export const defaultNodeManagementInvitationLifetimeMs =
  1000 * 60 * 60 * 24 * 7;

export const createCreateNodeManagementInvitationUseCase = ({
  gateway,
  emailSender,
  buildInvitationLink,
  onEmailDeliveryFailure,
  now = () => new Date(),
  createId = randomUUID,
  createToken = createNodeManagementInvitationToken,
  invitationLifetimeMs = defaultNodeManagementInvitationLifetimeMs,
}: {
  gateway: NodeManagementGateway;
  emailSender: NodeManagementInvitationEmailSender;
  buildInvitationLink: (token: string) => string;
  onEmailDeliveryFailure?: (input: {
    invitationId: string;
    inviteeEmail: string;
    errorMessage: string;
  }) => void;
  now?: () => Date;
  createId?: () => string;
  createToken?: () => string;
  invitationLifetimeMs?: number;
}) => {
  return async (input: CreateNodeManagementInvitationInput) => {
    const inviteeEmail = input.inviteeEmail.trim().toLowerCase();
    const scopeNode = await gateway.findScopeNode({
      companyId: input.companyId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
    });

    if (!scopeNode) {
      throw new NodeManagementScopeNotFoundError();
    }

    const token = createToken();
    const expiresAt = new Date(now().getTime() + invitationLifetimeMs);
    const invitationLink = buildInvitationLink(token);
    const invitation = await gateway.createInvitation({
      id: createId(),
      companyId: input.companyId,
      scopeNodeId: scopeNode.scopeNodeId,
      scopeType: input.scopeType,
      scopeId: input.scopeId,
      inviteeEmail,
      tokenHash: hashNodeManagementInvitationToken(token),
      createdByUserId: input.createdByUserId,
      expiresAt,
    });

    const delivery = await (async () => {
      try {
        return await emailSender.sendInvitationEmail({
          invitationId: invitation.id,
          inviteeEmail,
          companyName: scopeNode.companyName,
          scopeName: scopeNode.scopeName,
          scopeType: input.scopeType,
          invitationLink,
          expiresAt: invitation.expiresAt,
        });
      } catch (error) {
        return {
          status: 'failed' as const,
          message: error instanceof Error ? error.message : 'Unknown email delivery error',
        };
      }
    })();

    if (delivery.status === 'failed' && delivery.message) {
      onEmailDeliveryFailure?.({
        invitationId: invitation.id,
        inviteeEmail,
        errorMessage: delivery.message,
      });
    }

    return {
      invitationId: invitation.id,
      invitationToken: token,
      inviteeEmail,
      companyId: invitation.companyId,
      companyName: scopeNode.companyName,
      scopeNodeId: invitation.scopeNodeId,
      scopeType: invitation.scopeType,
      scopeId: invitation.scopeId,
      scopeName: scopeNode.scopeName,
      expiresAt: invitation.expiresAt,
      delivery,
    };
  };
};
