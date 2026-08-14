import { randomUUID } from 'node:crypto';

import { EmployeeNotFoundError } from '../../hr-employees/domain/employees';
import type { ErpAccessGateway } from '../domain/erp-access-invitations';
import {
  createErpAccessInvitationToken,
  hashErpAccessInvitationToken,
} from './erp-access-invitation-token';

export const defaultErpAccessInvitationLifetimeMs = 1000 * 60 * 60 * 24 * 7;

export const createCreateErpAccessInvitationUseCase = ({
  gateway,
  now = () => new Date(),
  createId = randomUUID,
  createToken = createErpAccessInvitationToken,
  invitationLifetimeMs = defaultErpAccessInvitationLifetimeMs,
}: {
  gateway: ErpAccessGateway;
  now?: () => Date;
  createId?: () => string;
  createToken?: () => string;
  invitationLifetimeMs?: number;
}) => {
  return async (input: {
    companyId: string;
    employeeId: string;
    inviteeEmail: string;
    createdByUserId: string;
  }) => {
    const employee = await gateway.getEmployeeById(input.companyId, input.employeeId);

    if (!employee) {
      throw new EmployeeNotFoundError();
    }

    const inviteeEmail = input.inviteeEmail.trim().toLowerCase();
    const invitationToken = createToken();
    const expiresAt = new Date(now().getTime() + invitationLifetimeMs);
    const invitation = await gateway.createInvitation({
      id: createId(),
      companyId: input.companyId,
      employeeId: input.employeeId,
      inviteeEmail,
      tokenHash: hashErpAccessInvitationToken(invitationToken),
      createdByUserId: input.createdByUserId,
      expiresAt,
    });

    return {
      invitationId: invitation.id,
      invitationToken,
      companyId: invitation.companyId,
      employeeId: invitation.employeeId,
      inviteeEmail: invitation.inviteeEmail,
      expiresAt: invitation.expiresAt,
    };
  };
};
