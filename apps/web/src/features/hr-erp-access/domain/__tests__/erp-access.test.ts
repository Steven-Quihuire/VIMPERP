import { describe, expect, it } from 'vitest';

import {
  acceptInvitationFormSchema,
  createAcceptInvitationInput,
  invitationFormSchema,
  sortInvitationsByExpiresAt,
  toCreateErpAccessInvitationInput,
} from '../erp-access';

describe('hr-erp-access domain helpers', () => {
  it('normalizes invitation payloads and sorts invitations by nearest expiry', () => {
    const parsed = invitationFormSchema.parse({
      employeeId: ' employee-1 ',
      inviteeEmail: ' PERSON@VIMCORE.TEST ',
    });

    expect(toCreateErpAccessInvitationInput('company-1', parsed)).toEqual({
      companyId: 'company-1',
      employeeId: 'employee-1',
      inviteeEmail: 'person@vimcore.test',
    });

    expect(
      sortInvitationsByExpiresAt([
        {
          id: 'invitation-2',
          companyId: 'company-1',
          employeeId: 'employee-2',
          inviteeEmail: 'person-2@vimcore.test',
          createdAt: '2026-08-13T12:00:00.000Z',
          expiresAt: '2026-08-15T12:00:00.000Z',
        },
        {
          id: 'invitation-1',
          companyId: 'company-1',
          employeeId: 'employee-1',
          inviteeEmail: 'person-1@vimcore.test',
          createdAt: '2026-08-13T12:00:00.000Z',
          expiresAt: '2026-08-14T12:00:00.000Z',
        },
      ]).map((invitation) => invitation.id),
    ).toEqual(['invitation-1', 'invitation-2']);
  });

  it('builds accept-invitation input for existing and new users', () => {
    expect(
      createAcceptInvitationInput(
        'token-existing',
        acceptInvitationFormSchema.parse({ password: '', confirmPassword: '' }),
      ),
    ).toEqual({ token: 'token-existing' });

    expect(
      createAcceptInvitationInput(
        'token-new',
        acceptInvitationFormSchema.parse({
          password: 'secret123',
          confirmPassword: 'secret123',
        }),
      ),
    ).toEqual({ token: 'token-new', password: 'secret123' });
  });
});
