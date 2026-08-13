import { Router } from 'express';
import { z } from 'zod';

import {
  ForbiddenError,
  hasAuthCapability,
  type AuthSession,
} from '../../identity/domain/auth';

const companyIdParamsSchema = z.object({
  companyId: z.string().min(1),
});

const requireOrgTreeAccess = (auth: AuthSession, companyId: string) => {
  if (auth.activeCompany?.companyId !== companyId) {
    throw new ForbiddenError('Active company required');
  }

  if (auth.activeCompany.status !== 'active') {
    throw new ForbiddenError('Company access unavailable');
  }

  if (auth.activeScope === null) {
    throw new ForbiddenError('Active scope required');
  }

  if (!hasAuthCapability(auth.capabilities, 'catalog.read')) {
    throw new ForbiddenError();
  }
};

export const createOrgTreeRouter = ({
  requireAuth,
  listOrgTree,
}: {
  requireAuth: import('express').RequestHandler;
  listOrgTree: (input: { companyId: string; actorUserId: string }) => Promise<unknown>;
}): Router => {
  const router = Router();

  router.get(
    '/companies/:companyId/org-tree',
    requireAuth,
    async (request, response, next) => {
      try {
        const params = companyIdParamsSchema.parse(request.params);
        const auth = (response.locals as { auth: AuthSession }).auth;
        requireOrgTreeAccess(auth, params.companyId);

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
