import { randomUUID } from 'node:crypto';

import type { InvitationEmailSender } from '../../../shared/infrastructure/resend-invitation-email-sender';
import type { HrResponsibilityGateway } from '../domain/hr-responsibility';
import {
  HrResponsibleAlreadyAssignedError,
  HrResponsibilityCompanyNotFoundError,
  HrResponsibilityInvitationDuplicateError,
} from '../domain/hr-responsibility';
import {
  createInvitationToken,
  hashInvitationToken,
} from '../../../shared/application/invitation-token';

export const defaultHrResponsibilityInvitationLifetimeMs =
  1000 * 60 * 60 * 24 * 7;

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const createHrResponsibilityInvitation = ({
  gateway,
  emailSender,
  buildInvitationLink,
  now = () => new Date(),
  createId = randomUUID,
  createToken = createInvitationToken,
  invitationLifetimeMs = defaultHrResponsibilityInvitationLifetimeMs,
}: {
  gateway: HrResponsibilityGateway;
  emailSender: InvitationEmailSender;
  buildInvitationLink: (token: string) => string;
  now?: () => Date;
  createId?: () => string;
  createToken?: () => string;
  invitationLifetimeMs?: number;
}) => {
  return async (input: {
    companyId: string;
    inviteeEmail: string;
    createdByUserId: string;
  }) => {
    const inviteeEmail = input.inviteeEmail.trim().toLowerCase();
    const company = await gateway.findCompany(input.companyId);
    if (!company) {
      throw new HrResponsibilityCompanyNotFoundError();
    }

    const existingUser = await gateway.findUserByEmail(inviteeEmail);
    if (existingUser) {
      const responsibilities = await gateway.listResponsibilities(
        input.companyId,
      );
      if (
        responsibilities.some(
          (responsible) => responsible.userId === existingUser.id,
        )
      ) {
        throw new HrResponsibleAlreadyAssignedError();
      }
    }

    const currentTime = now();
    if (
      await gateway.findActiveInvitation({
        companyId: input.companyId,
        inviteeEmail,
        now: currentTime,
      })
    ) {
      throw new HrResponsibilityInvitationDuplicateError();
    }

    const token = createToken();
    const expiresAt = new Date(currentTime.getTime() + invitationLifetimeMs);
    const invitation = await gateway.createInvitation({
      id: createId(),
      companyId: input.companyId,
      inviteeEmail,
      tokenHash: hashInvitationToken(token),
      createdByUserId: input.createdByUserId,
      expiresAt,
    });
    const invitationLink = buildInvitationLink(token);
    const delivery = await (async () => {
      try {
        return await emailSender.sendInvitationEmail({
          invitationId: invitation.id,
          inviteeEmail,
          subject: `Invitación como responsable de RRHH en ${company.name}`,
          html: `<p>Te invitaron como responsable de RRHH en <strong>${escapeHtml(company.name)}</strong>.</p><p>Aceptá la invitación: <a href="${escapeHtml(invitationLink)}">${escapeHtml(invitationLink)}</a></p><p>Vence el ${expiresAt.toISOString()}.</p>`,
          text: `Te invitaron como responsable de RRHH en ${company.name}.\nAceptá la invitación: ${invitationLink}\nVence el ${expiresAt.toISOString()}.`,
        });
      } catch (error) {
        return {
          status: 'failed' as const,
          message:
            error instanceof Error
              ? error.message
              : 'Unknown email delivery error',
        };
      }
    })();

    return {
      invitationId: invitation.id,
      invitationToken: token,
      companyId: input.companyId,
      inviteeEmail,
      expiresAt: invitation.expiresAt,
      delivery,
    };
  };
};
