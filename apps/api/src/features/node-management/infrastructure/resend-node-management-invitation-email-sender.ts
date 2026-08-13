import type {
  NodeManagementInvitationDelivery,
  NodeManagementInvitationEmailSender,
  SendNodeManagementInvitationEmailInput,
} from '../domain/node-management';

const RESEND_API_URL = 'https://api.resend.com/emails';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildSubject = (input: SendNodeManagementInvitationEmailInput) => {
  return `Node management invitation for ${input.companyName}`;
};

const buildHtml = (input: SendNodeManagementInvitationEmailInput) => {
  const companyName = escapeHtml(input.companyName);
  const scopeName = escapeHtml(input.scopeName);
  const scopeType = escapeHtml(input.scopeType);
  const invitationLink = escapeHtml(input.invitationLink);
  const expiresAt = escapeHtml(input.expiresAt.toISOString());

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <p>You have been invited to manage a node in ${companyName}.</p>
      <p>
        Scope: <strong>${scopeType}</strong><br />
        Node: <strong>${scopeName}</strong>
      </p>
      <p>
        Accept the invitation here:<br />
        <a href="${invitationLink}">${invitationLink}</a>
      </p>
      <p>This invitation expires at ${expiresAt}.</p>
    </div>
  `.trim();
};

const buildText = (input: SendNodeManagementInvitationEmailInput) => {
  return [
    `You have been invited to manage a node in ${input.companyName}.`,
    `Scope: ${input.scopeType}`,
    `Node: ${input.scopeName}`,
    `Accept the invitation: ${input.invitationLink}`,
    `This invitation expires at ${input.expiresAt.toISOString()}.`,
  ].join('\n');
};

export const createResendNodeManagementInvitationEmailSender = ({
  apiKey,
  fromEmail,
  fetchFn = fetch,
}: {
  apiKey: string;
  fromEmail: string;
  fetchFn?: typeof fetch;
}): NodeManagementInvitationEmailSender => {
  return {
    sendInvitationEmail: async (
      input: SendNodeManagementInvitationEmailInput,
    ): Promise<NodeManagementInvitationDelivery> => {
      const response = await fetchFn(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [input.inviteeEmail],
          subject: buildSubject(input),
          html: buildHtml(input),
          text: buildText(input),
        }),
      });

      if (response.ok) {
        return { status: 'sent' };
      }

      const responseText = await response.text();
      const message = responseText.trim() || `Resend request failed with status ${response.status}`;

      return {
        status: 'failed',
        message,
      };
    },
  };
};

export const createNoopNodeManagementInvitationEmailSender = ({
  reason = 'Invitation email delivery is not configured.',
}: {
  reason?: string;
} = {}): NodeManagementInvitationEmailSender => ({
  sendInvitationEmail: async () => ({
    status: 'skipped',
    message: reason,
  }),
});
