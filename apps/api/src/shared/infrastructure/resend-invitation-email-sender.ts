export type InvitationEmailInput = {
  invitationId: string;
  inviteeEmail: string;
  subject: string;
  html: string;
  text: string;
};

export type InvitationEmailDelivery = {
  status: 'sent' | 'failed' | 'skipped';
  message?: string;
};

export type InvitationEmailSender = {
  sendInvitationEmail: (
    input: InvitationEmailInput,
  ) => Promise<InvitationEmailDelivery>;
};

const RESEND_API_URL = 'https://api.resend.com/emails';

export const createResendInvitationEmailSender = ({
  apiKey,
  fromEmail,
  fetchFn = fetch,
}: {
  apiKey: string;
  fromEmail: string;
  fetchFn?: typeof fetch;
}): InvitationEmailSender => ({
  sendInvitationEmail: async (input) => {
    const response = await fetchFn(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.inviteeEmail],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (response.ok) {
      return { status: 'sent' };
    }

    const responseText = await response.text();
    return {
      status: 'failed',
      message:
        responseText.trim() ||
        `Resend request failed with status ${response.status}`,
    };
  },
});

export const createNoopInvitationEmailSender = ({
  reason = 'Invitation email delivery is not configured.',
}: { reason?: string } = {}): InvitationEmailSender => ({
  sendInvitationEmail: () => Promise.resolve({ status: 'skipped', message: reason }),
});
