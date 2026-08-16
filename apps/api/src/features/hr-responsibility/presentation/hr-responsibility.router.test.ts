import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createErrorMiddleware } from '../../../shared/presentation/error.middleware';
import { createHrResponsibilityRouter } from './hr-responsibility.router';
import { HrResponsibilityInvitationDuplicateError } from '../domain/hr-responsibility';

const createTestApp = (
  overrides: Partial<Parameters<typeof createHrResponsibilityRouter>[0]> = {},
) => {
  const app = express();
  app.use(express.json());
  app.use(
    createHrResponsibilityRouter({
      requireAuth: (_request, response, next) => {
        response.locals.auth = {
          user: {
            id: 'owner-1',
            email: 'owner@example.com',
            username: 'owner',
          },
          memberships: [
            {
              companyId: 'company-1',
              role: 'company-owner',
              divisionId: null,
              localId: null,
            },
          ],
        };
        next();
      },
      getState: (companyId) => Promise.resolve({
        companyId,
        hasResponsibles: false,
        responsibles: [],
        availableUsers: [],
        pendingInvitations: [],
      }),
      assign: () => Promise.resolve({
        userId: 'user-1',
        email: 'user@example.com',
        username: 'user',
      }),
      listPendingInvitations: () => Promise.resolve([]),
      createInvitation: () => Promise.resolve({ invitationId: 'inv-1' }),
      getInvitation: () => Promise.resolve({ id: 'inv-1' }),
      acceptInvitation: () => Promise.resolve({ token: 'session-1' }),
      sessionCookieName: 'vimcore_session',
      secureCookies: false,
      ...overrides,
    }),
  );
  app.use(createErrorMiddleware());
  return app;
};

describe('HR responsibility invitation routes', () => {
  it('rejects invalid email and company-crossed owner access', async () => {
    const app = createTestApp();
    await request(app)
      .post('/companies/company-1/hr-responsibility/invitations')
      .send({ inviteeEmail: 'not-an-email' })
      .expect(400);
    await request(app)
      .post('/companies/company-2/hr-responsibility/invitations')
      .send({ inviteeEmail: 'external@example.com' })
      .expect(403);
  });

  it('maps an active duplicate to a conflict without creating permissions', async () => {
    const app = createTestApp({
      createInvitation: () => {
        throw new HrResponsibilityInvitationDuplicateError();
      },
    });
    const response = await request(app)
      .post('/companies/company-1/hr-responsibility/invitations')
      .send({ inviteeEmail: 'external@example.com' })
      .expect(409);
    expect(response.body.error.code).toBe(
      'HR_RESPONSIBILITY_INVITATION_DUPLICATE',
    );
  });
});
