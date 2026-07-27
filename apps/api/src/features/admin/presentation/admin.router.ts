import { Router, type RequestHandler } from 'express';

export const createAdminRouter = ({
  requireAuth,
  requirePlatformAdmin,
}: {
  requireAuth: RequestHandler;
  requirePlatformAdmin: RequestHandler;
}): Router => {
  const router = Router();

  router.get('/admin/companies/summary', requireAuth, requirePlatformAdmin, (_request, response) => {
    response.status(200).json({ companies: [], totalCompanies: 0 });
  });

  return router;
};
