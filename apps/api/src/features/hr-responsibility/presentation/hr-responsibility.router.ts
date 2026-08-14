import { Router } from 'express';
import { z } from 'zod';

import type { AuthSession } from '../../identity/domain/auth';
import type {
  HrResponsibleUser,
  PendingHrResponsibilityInvitation,
} from '../domain/hr-responsibility';

const paramsSchema = z.object({ companyId: z.string().min(1) });
const bodySchema = z.object({ userId: z.string().min(1) });
const invitationBodySchema = z.object({ inviteeEmail: z.string().email() });
const tokenParamsSchema = z.object({ token: z.string().min(1) });
const userSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  username: z.string(),
});
const stateSchema = z.object({
  companyId: z.string(),
  hasResponsibles: z.boolean(),
  responsibles: z.array(userSchema),
  availableUsers: z.array(userSchema),
  pendingInvitations: z.array(
    z.object({
      id: z.string(),
      companyId: z.string(),
      inviteeEmail: z.string().email(),
      createdAt: z.coerce.date(),
      expiresAt: z.coerce.date(),
    }),
  ),
});

const canConfigure = (auth: AuthSession, companyId: string) =>
  auth.memberships.some(
    (membership) =>
      membership.role === 'platform-admin' ||
      (membership.role === 'company-owner' &&
        membership.companyId === companyId),
  );

const canView = (auth: AuthSession, companyId: string) =>
  canConfigure(auth, companyId) ||
  auth.memberships.some((membership) => membership.companyId === companyId);

export const createHrResponsibilityRouter = ({
  requireAuth,
  getState,
  assign,
  listPendingInvitations,
  createInvitation,
  getInvitation,
  acceptInvitation,
  sessionCookieName,
  secureCookies,
}: {
  requireAuth: import('express').RequestHandler;
  getState: (companyId: string) => Promise<{
    companyId: string;
    hasResponsibles: boolean;
    responsibles: HrResponsibleUser[];
    availableUsers: HrResponsibleUser[];
  }>;
  assign: (input: {
    companyId: string;
    userId: string;
  }) => Promise<HrResponsibleUser>;
  listPendingInvitations: (
    companyId: string,
  ) => Promise<PendingHrResponsibilityInvitation[]>;
  createInvitation: (input: {
    companyId: string;
    inviteeEmail: string;
    createdByUserId: string;
  }) => Promise<unknown>;
  getInvitation: (token: string) => Promise<unknown>;
  acceptInvitation: (input: {
    token: string;
    password?: string;
  }) => Promise<{ token: string }>;
  sessionCookieName: string;
  secureCookies: boolean;
}) => {
  const router = Router();

  const setSessionCookie = (
    response: import('express').Response,
    token: string,
  ) => {
    response.cookie(sessionCookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/',
    });
  };

  router.get(
    '/companies/:companyId/hr-responsibility',
    requireAuth,
    async (request, response, next) => {
      try {
        const { companyId } = paramsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;
        if (!canView(auth, companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }
        const state = stateSchema.parse(await getState(companyId));
        response.status(200).json(state);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-responsibility/pending-invitations',
    requireAuth,
    async (request, response, next) => {
      try {
        const { companyId } = paramsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;
        if (!canConfigure(auth, companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }
        response.status(200).json(await listPendingInvitations(companyId));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/hr-responsibility',
    requireAuth,
    async (request, response, next) => {
      try {
        const { companyId } = paramsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;
        if (!canConfigure(auth, companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }
        const user = await assign({
          companyId,
          ...bodySchema.parse(request.body),
        });
        response.status(201).json(user);
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/hr-responsibility/invitations',
    requireAuth,
    async (request, response, next) => {
      try {
        const { companyId } = paramsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;
        if (!canConfigure(auth, companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }
        const body = invitationBodySchema.parse(request.body);
        response.status(201).json(
          await createInvitation({
            companyId,
            inviteeEmail: body.inviteeEmail,
            createdByUserId: auth.user.id,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/hr-responsibility/invitations/:token',
    async (request, response, next) => {
      try {
        const { token } = tokenParamsSchema.parse(request.params);
        response.status(200).json(await getInvitation(token));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/hr-responsibility/invitations/:token/accept',
    async (request, response, next) => {
      try {
        const { token } = tokenParamsSchema.parse(request.params);
        const password =
          typeof request.body?.password === 'string'
            ? request.body.password
            : undefined;
        const result = await acceptInvitation({
          token,
          ...(password ? { password } : {}),
        });
        setSessionCookie(response, result.token);
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
