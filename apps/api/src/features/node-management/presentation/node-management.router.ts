import { Router, type RequestHandler, type Response } from 'express';
import { z } from 'zod';

import type { AuthSession } from '../../identity/domain/auth';
import { nodeManagementScopeTypeValues, type NodeManagementScopeType } from '../domain/node-management';

const createInvitationParamsSchema = z.object({
  companyId: z.string().min(1),
});

const companyResponsibilitiesParamsSchema = z.object({
  companyId: z.string().min(1),
});

const pendingInvitationSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  scopeNodeId: z.string().min(1),
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
  scopeName: z.string().min(1),
  inviteeEmail: z.string().email(),
  createdAt: z.date(),
  expiresAt: z.date(),
});

const responsibilityStateParamsSchema = z.object({
  companyId: z.string().min(1),
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
});

const createInvitationBodySchema = z.object({
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
  inviteeEmail: z.string().trim().toLowerCase().email(),
});

const invitationTokenParamsSchema = z.object({
  token: z.string().min(1),
});

const acceptInvitationBodySchema = z.object({
  password: z.string().min(8).optional(),
});

const createInvitationResponseSchema = z.object({
  invitationId: z.string().min(1),
  invitationToken: z.string().min(1),
  inviteeEmail: z.string().email(),
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  scopeNodeId: z.string().min(1),
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
  scopeName: z.string().min(1),
  expiresAt: z.date(),
  delivery: z
    .object({
      status: z.enum(['sent', 'failed', 'skipped']),
      message: z.string().min(1).optional(),
    })
    .optional(),
});

const getInvitationResponseSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  scopeNodeId: z.string().min(1),
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
  scopeName: z.string().min(1),
  inviteeEmail: z.string().email(),
  managedRoleKey: z.literal('node-manager'),
  baseMembershipRole: z.literal('company-user'),
  expiresAt: z.date(),
  status: z.enum(['pending', 'accepted', 'expired']),
  userExists: z.boolean(),
});

const nodeResponsibilityRecordSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().min(1),
  scopeNodeId: z.string().min(1),
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
  scopeName: z.string().min(1),
  responsibleUserId: z.string().min(1),
  responsibleUserEmail: z.string().email(),
  responsibleUsername: z.string().min(1),
  managedRoleKey: z.literal('node-manager'),
  assignmentMode: z.literal('subtree_inclusive'),
  baseMembershipRole: z.literal('company-user'),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  endedAt: z.date().nullable(),
});

const nodeResponsibilityStateSchema = z.object({
  companyId: z.string().min(1),
  scopeNodeId: z.string().min(1),
  scopeType: z.enum(nodeManagementScopeTypeValues),
  scopeId: z.string().min(1),
  scopeName: z.string().min(1),
  activeResponsibility: nodeResponsibilityRecordSchema.nullable(),
  responsibilities: z.array(nodeResponsibilityRecordSchema),
});

const hasCompanyOwnerMembership = (auth: AuthSession, companyId: string) => {
  return auth.memberships.some(
    (membership) =>
      membership.companyId === companyId && membership.role === 'company-owner',
  );
};

const setSessionCookie = (
  response: Response,
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

export const createNodeManagementRouter = ({
  requireAuth,
  createInvitation,
  listResponsibilities,
  listPendingInvitations,
  getResponsibilityState,
  getInvitation,
  acceptInvitation,
  sessionCookieName,
  secureCookies,
}: {
  requireAuth: RequestHandler;
  createInvitation: (input: {
    companyId: string;
    scopeType: NodeManagementScopeType;
    scopeId: string;
    inviteeEmail: string;
    createdByUserId: string;
  }) => Promise<z.infer<typeof createInvitationResponseSchema>>;
  listResponsibilities: (input: {
    companyId: string;
  }) => Promise<Array<z.infer<typeof nodeResponsibilityRecordSchema>>>;
  listPendingInvitations: (input: {
    companyId: string;
  }) => Promise<Array<z.infer<typeof pendingInvitationSchema>>>;
  getResponsibilityState: (input: {
    companyId: string;
    scopeType: NodeManagementScopeType;
    scopeId: string;
  }) => Promise<z.infer<typeof nodeResponsibilityStateSchema>>;
  getInvitation: (token: string) => Promise<z.infer<typeof getInvitationResponseSchema>>;
  acceptInvitation: (input: {
    token: string;
    password?: string;
  }) => Promise<{ token: string }>;
  sessionCookieName: string;
  secureCookies: boolean;
}): Router => {
  const router = Router();

  router.post(
    '/companies/:companyId/node-management/invitations',
    requireAuth,
    async (request, response, next) => {
      try {
        const params = createInvitationParamsSchema.parse(request.params);
        const body = createInvitationBodySchema.parse(request.body);
        const auth = (response.locals as { auth: AuthSession }).auth;

        if (!hasCompanyOwnerMembership(auth, params.companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }

        const invitation = createInvitationResponseSchema.parse(
          await createInvitation({
            companyId: params.companyId,
            scopeType: body.scopeType,
            scopeId: body.scopeId,
            inviteeEmail: body.inviteeEmail,
            createdByUserId: auth.user.id,
          }),
        );

        response.status(201).json(invitation);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/node-management/responsibilities',
    requireAuth,
    async (request, response, next) => {
      try {
        const params = companyResponsibilitiesParamsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;

        if (!hasCompanyOwnerMembership(auth, params.companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }

        const responsibilities = z.array(nodeResponsibilityRecordSchema).parse(
          await listResponsibilities({ companyId: params.companyId }),
        );

        response.status(200).json(responsibilities);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/node-management/pending-invitations',
    requireAuth,
    async (request, response, next) => {
      try {
        const params = companyResponsibilitiesParamsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;

        if (!hasCompanyOwnerMembership(auth, params.companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }

        const invitations = z.array(pendingInvitationSchema).parse(
          await listPendingInvitations({ companyId: params.companyId }),
        );

        response.status(200).json(invitations);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/node-management/responsibilities/:scopeType/:scopeId',
    requireAuth,
    async (request, response, next) => {
      try {
        const params = responsibilityStateParamsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;

        if (!hasCompanyOwnerMembership(auth, params.companyId)) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }

        const state = nodeResponsibilityStateSchema.parse(
          await getResponsibilityState({
            companyId: params.companyId,
            scopeType: params.scopeType,
            scopeId: params.scopeId,
          }),
        );

        response.status(200).json(state);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get('/node-management/invitations/:token', async (request, response, next) => {
    try {
      const params = invitationTokenParamsSchema.parse(request.params);
      const invitation = getInvitationResponseSchema.parse(
        await getInvitation(params.token),
      );

      response.status(200).json(invitation);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/node-management/invitations/:token/accept',
    async (request, response, next) => {
      try {
        const params = invitationTokenParamsSchema.parse(request.params);
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
    },
  );

  return router;
};
