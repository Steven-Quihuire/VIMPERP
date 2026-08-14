import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import {
  ForbiddenError,
  type AuthSession,
} from '../../identity/domain/auth';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const tokenParamsSchema = z.object({ token: z.string().min(1) });
const employeeParamsSchema = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
});
const createInvitationBodySchema = z.object({
  employeeId: z.string().min(1),
  inviteeEmail: z.string().trim().toLowerCase().email(),
});
const acceptInvitationBodySchema = z.object({
  password: z.string().min(8).optional(),
});

const getAuth = (response: Parameters<RequestHandler>[1]) =>
  (response.locals as { auth: AuthSession }).auth;

const ensureCompanyAccess = (auth: AuthSession, companyId: string) => {
  if (auth.activeCompany?.companyId !== companyId) {
    throw new ForbiddenError();
  }
};

const setSessionCookie = (
  response: import('express').Response,
  sessionCookieName: string,
  secureCookies: boolean,
  token: string,
) => {
  response.cookie(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
  });
};

export const createHrErpAccessRouter = ({
  requireAuth,
  requireHrCapability,
  createInvitation,
  listInvitations,
  acceptInvitation,
  revokeAccess,
  sessionCookieName,
  secureCookies,
}: {
  requireAuth: RequestHandler;
  requireHrCapability: (permissionKey: string) => RequestHandler;
  createInvitation: (input: {
    companyId: string;
    employeeId: string;
    inviteeEmail: string;
    createdByUserId: string;
  }) => Promise<unknown>;
  listInvitations: (input: { companyId: string }) => Promise<unknown>;
  acceptInvitation: (input: { token: string; password?: string }) => Promise<{ token: string }>;
  revokeAccess: (input: { companyId: string; employeeId: string }) => Promise<void>;
  sessionCookieName: string;
  secureCookies: boolean;
}): Router => {
  const router = Router();

  router.post('/companies/:companyId/hr-erp-access/invitations', requireAuth, requireHrCapability('hr.erp_access.invite'), async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      const body = createInvitationBodySchema.parse(request.body);
      const auth = getAuth(response);
      ensureCompanyAccess(auth, params.companyId);

      response.status(201).json(
        await createInvitation({
          companyId: params.companyId,
          employeeId: body.employeeId,
          inviteeEmail: body.inviteeEmail,
          createdByUserId: auth.user.id,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-erp-access/invitations', requireAuth, requireHrCapability('hr.erp_access.invite'), async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);

      response.status(200).json(await listInvitations({ companyId: params.companyId }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/hr-erp-access/invitations/:token/accept', async (request, response, next) => {
    try {
      const params = tokenParamsSchema.parse(request.params);
      const body = acceptInvitationBodySchema.parse(request.body);
      const result = await acceptInvitation({
        token: params.token,
        ...(body.password ? { password: body.password } : {}),
      });

      setSessionCookie(response, sessionCookieName, secureCookies, result.token);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/companies/:companyId/hr-erp-access/employees/:employeeId/revoke', requireAuth, requireHrCapability('hr.erp_access.revoke'), async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);

      await revokeAccess(params);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
