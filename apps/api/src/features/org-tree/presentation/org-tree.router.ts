import { Router } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthRole, type AuthSession } from '../../identity/domain/auth';

const companyIdParamsSchema = z.object({
  companyId: z.string().min(1),
});

const requireCompanyMembership = (
  auth: AuthSession,
  companyId: string,
  roles: AuthRole[],
) => {
  const membership = auth.memberships.find(
    (candidate) => candidate.companyId === companyId && roles.includes(candidate.role),
  );

  if (!membership) {
    throw new ForbiddenError();
  }
};

export const createOrgTreeRouter = ({
  requireAuth,
  requireRole,
  listOrgTree,
}: {
  requireAuth: import('express').RequestHandler;
  requireRole: (...roles: AuthRole[]) => import('express').RequestHandler;
  listOrgTree: (input: { companyId: string; actorUserId: string }) => Promise<unknown>;
}): Router => {
  const router = Router();

  router.get(
    '/companies/:companyId/org-tree',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;
        requireCompanyMembership(auth, params.companyId, ['company-owner', 'company-user']);

        const tree = await listOrgTree({
          companyId: params.companyId,
          actorUserId: auth.user.id,
        });

        response.status(200).json(tree);
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
