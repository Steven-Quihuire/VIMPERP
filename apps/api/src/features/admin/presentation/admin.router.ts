import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import type {
  AdminApplicationErrorDetail,
  AdminAuditEventDetail,
  AdminCompanySummary,
  AdminNotification,
  AdminProvisioningRunDetail,
} from '../domain/admin';
import { adminProvisioningRunStatusValues } from '../domain/admin';

const listProvisioningRunsQuerySchema = z.object({
  status: z.enum(adminProvisioningRunStatusValues).optional(),
  correlationId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

const listApplicationErrorsQuerySchema = z.object({
  fingerprint: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

const listAuditEventsQuerySchema = z.object({
  type: z.string().min(1).optional(),
  companyId: z.string().min(1).optional(),
  correlationId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

const detailParamsSchema = z.object({
  id: z.string().min(1),
});

export const createAdminRouter = ({
  getCompanySummary,
  listNotifications,
  listProvisioningRuns,
  getProvisioningRunDetail,
  listApplicationErrors,
  getApplicationErrorDetail,
  listAuditEvents,
  getAuditEventDetail,
  requireAuth,
  requirePlatformAdmin,
}: {
  getCompanySummary: () => Promise<AdminCompanySummary>;
  listNotifications: () => Promise<AdminNotification[]>;
  listProvisioningRuns: (input: {
    status?: (typeof adminProvisioningRunStatusValues)[number] | undefined;
    correlationId?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
  }) => Promise<{
    items: Array<Record<string, unknown>>;
    nextCursor: string | null;
  }>;
  getProvisioningRunDetail: (runId: string) => Promise<AdminProvisioningRunDetail>;
  listApplicationErrors: (input: {
    fingerprint?: string | undefined;
    correlationId?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
  }) => Promise<{
    items: Array<Record<string, unknown>>;
    nextCursor: string | null;
  }>;
  getApplicationErrorDetail: (errorId: string) => Promise<AdminApplicationErrorDetail>;
  listAuditEvents: (input: {
    type?: string | undefined;
    companyId?: string | undefined;
    correlationId?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
  }) => Promise<{
    items: Array<Record<string, unknown>>;
    nextCursor: string | null;
  }>;
  getAuditEventDetail: (eventId: string) => Promise<AdminAuditEventDetail>;
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

  router.get(
    '/admin/provisioning-runs',
    requireAuth,
    requirePlatformAdmin,
    async (request, response, next) => {
      try {
        const query = listProvisioningRunsQuerySchema.parse(request.query);
        const result = await listProvisioningRuns(query);

        response.status(200).json({
          provisioningRuns: result.items,
          nextCursor: result.nextCursor,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/provisioning-runs/:id',
    requireAuth,
    requirePlatformAdmin,
    async (request, response, next) => {
      try {
        const params = detailParamsSchema.parse(request.params);

        response.status(200).json(await getProvisioningRunDetail(params.id));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/application-errors',
    requireAuth,
    requirePlatformAdmin,
    async (request, response, next) => {
      try {
        const query = listApplicationErrorsQuerySchema.parse(request.query);
        const result = await listApplicationErrors(query);

        response.status(200).json({
          applicationErrors: result.items,
          nextCursor: result.nextCursor,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/application-errors/:id',
    requireAuth,
    requirePlatformAdmin,
    async (request, response, next) => {
      try {
        const params = detailParamsSchema.parse(request.params);

        response.status(200).json(await getApplicationErrorDetail(params.id));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/audit-events',
    requireAuth,
    requirePlatformAdmin,
    async (request, response, next) => {
      try {
        const query = listAuditEventsQuerySchema.parse(request.query);
        const result = await listAuditEvents(query);

        response.status(200).json({
          auditEvents: result.items,
          nextCursor: result.nextCursor,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/admin/audit-events/:id',
    requireAuth,
    requirePlatformAdmin,
    async (request, response, next) => {
      try {
        const params = detailParamsSchema.parse(request.params);

        response.status(200).json(await getAuditEventDetail(params.id));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
