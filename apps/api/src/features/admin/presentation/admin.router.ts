import { Router, type RequestHandler } from 'express';

import type {
  AdminCompanySummary,
  AdminNotification,
} from '../domain/admin';

export const createAdminRouter = ({
  getCompanySummary,
  listNotifications,
  requireAuth,
  requirePlatformAdmin,
}: {
  getCompanySummary: () => Promise<AdminCompanySummary>;
  listNotifications: () => Promise<AdminNotification[]>;
  requireAuth: RequestHandler;
  requirePlatformAdmin: RequestHandler;
}): Router => {
  const router = Router();

  router.get(
    '/admin/companies/summary',
    requireAuth,
    requirePlatformAdmin,
    async (_request, response, next) => {
      try {
        response.status(200).json(await getCompanySummary());
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/notifications',
    requireAuth,
    requirePlatformAdmin,
    async (_request, response, next) => {
      try {
        response.status(200).json({
          notifications: await listNotifications(),
        });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
