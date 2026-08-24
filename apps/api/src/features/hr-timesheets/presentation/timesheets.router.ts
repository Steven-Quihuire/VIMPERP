import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import {
  timesheetPeriodStatusValues,
  type PeriodDate,
} from '../domain/timesheets';
import type { PermissionScope } from '../../roles-management/domain/assignments';

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const nonEmptyPathParam = z.string().trim().min(1);

const companyParamsSchema = z.object({ companyId: nonEmptyPathParam });
const periodParamsSchema = z.object({
  companyId: nonEmptyPathParam,
  periodId: nonEmptyPathParam,
});
const entryParamsSchema = z.object({
  companyId: nonEmptyPathParam,
  periodId: nonEmptyPathParam,
  entryId: nonEmptyPathParam,
});
const listPeriodsQuerySchema = z.object({
  status: z.enum(timesheetPeriodStatusValues).optional(),
});
const createPeriodBodySchema = z.object({
  employeeAssignmentId: z.string().min(1),
  periodStart: z.string().regex(isoDatePattern),
  periodEnd: z.string().regex(isoDatePattern),
});
const patchPeriodBodySchema = z.object({
  periodStart: z.string().regex(isoDatePattern),
  periodEnd: z.string().regex(isoDatePattern),
});
const entryBodySchema = z.object({
  entryDate: z.string().regex(isoDatePattern),
  hours: z.number().gt(0).max(24),
  projectId: z.string().min(1).nullable().optional().transform((value) => value ?? null),
  taskLabel: z.string().trim().min(1),
  note: z.string().nullable().optional().transform((value) => value ?? null),
});
const rejectionBodySchema = z.object({
  rejectionReason: z.string(),
});

const getAuth = (response: Parameters<RequestHandler>[1]) =>
  (response.locals as { auth: AuthSession }).auth;

const ensureCompanyAccess = (auth: AuthSession, companyId: string) => {
  if (auth.activeCompany?.companyId !== companyId) {
    throw new ForbiddenError();
  }

  if (auth.activeCompany.status !== 'active') {
    throw new ForbiddenError('Company access unavailable');
  }
};

type ResolvePermissionScope = (input: {
  request: Parameters<RequestHandler>[0];
  response: Parameters<RequestHandler>[1];
  auth: AuthSession;
}) => PermissionScope | undefined | Promise<PermissionScope | undefined>;

export const createTimesheetsRouter = ({
  requireAuth,
  requireHrCapability,
  resolvePermissionScope,
  createPeriod,
  listPeriods,
  getPeriod,
  patchPeriod,
  createEntry,
  listEntries,
  updateEntry,
  deleteEntry,
  submitPeriod,
  approvePeriod,
  rejectPeriod,
  reopenPeriod,
}: {
  requireAuth: RequestHandler;
  requireHrCapability: (
    permissionKey: string,
    resolvePermissionScope?: ResolvePermissionScope,
  ) => RequestHandler;
  resolvePermissionScope: ResolvePermissionScope;
  createPeriod: (input: {
    companyId: string;
    employeeAssignmentId: string;
    periodStart: PeriodDate;
    periodEnd: PeriodDate;
    auth: AuthSession;
  }) => Promise<unknown>;
  listPeriods: (input: {
    companyId: string;
    status?: (typeof timesheetPeriodStatusValues)[number];
    auth: AuthSession;
  }) => Promise<unknown>;
  getPeriod: (input: {
    companyId: string;
    periodId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  patchPeriod: (input: {
    companyId: string;
    periodId: string;
    periodStart: PeriodDate;
    periodEnd: PeriodDate;
    auth: AuthSession;
  }) => Promise<unknown>;
  createEntry: (input: {
    companyId: string;
    periodId: string;
    entryDate: PeriodDate;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
    auth: AuthSession;
  }) => Promise<unknown>;
  listEntries: (input: {
    companyId: string;
    periodId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  updateEntry: (input: {
    companyId: string;
    periodId: string;
    entryId: string;
    entryDate: PeriodDate;
    hours: number;
    projectId: string | null;
    taskLabel: string;
    note: string | null;
    auth: AuthSession;
  }) => Promise<unknown>;
  deleteEntry: (input: {
    companyId: string;
    periodId: string;
    entryId: string;
    auth: AuthSession;
  }) => Promise<void>;
  submitPeriod: (input: {
    companyId: string;
    periodId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  approvePeriod: (input: {
    companyId: string;
    periodId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  rejectPeriod: (input: {
    companyId: string;
    periodId: string;
    rejectionReason: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  reopenPeriod: (input: {
    companyId: string;
    periodId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
}) => {
  const router = Router();
  const requireTimesheetCapability = (permissionKey: string) =>
    requireHrCapability(permissionKey, resolvePermissionScope);

  router.post(
    '/companies/:companyId/timesheets',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = createPeriodBodySchema.parse(request.body);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(201).json(
          await createPeriod({
            companyId: params.companyId,
            employeeAssignmentId: body.employeeAssignmentId,
            periodStart: body.periodStart,
            periodEnd: body.periodEnd,
            auth,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/timesheets',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const query = listPeriodsQuerySchema.parse(request.query);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(
          await listPeriods({
            companyId: params.companyId,
            ...(query.status ? { status: query.status } : {}),
            auth,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/timesheets/:periodId',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.read'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(await getPeriod({ ...params, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/timesheets/:periodId/entries',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.read'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(await listEntries({ ...params, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/companies/:companyId/timesheets/:periodId',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.write'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const body = patchPeriodBodySchema.parse(request.body);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(
          await patchPeriod({
            ...params,
            periodStart: body.periodStart,
            periodEnd: body.periodEnd,
            auth,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/timesheets/:periodId/entries',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.write'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const body = entryBodySchema.parse(request.body);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(201).json(await createEntry({ ...params, ...body, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/companies/:companyId/timesheets/:periodId/entries/:entryId',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.write'),
    async (request, response, next) => {
      try {
        const params = entryParamsSchema.parse(request.params);
        const body = entryBodySchema.parse(request.body);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(await updateEntry({ ...params, ...body, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/companies/:companyId/timesheets/:periodId/entries/:entryId',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.write'),
    async (request, response, next) => {
      try {
        const params = entryParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        await deleteEntry({ ...params, auth });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/timesheets/:periodId/submit',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.submit'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(await submitPeriod({ ...params, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/timesheets/:periodId/approve',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.approve'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(await approvePeriod({ ...params, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/timesheets/:periodId/reject',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.approve'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const body = rejectionBodySchema.parse(request.body);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(
          await rejectPeriod({
            ...params,
            rejectionReason: body.rejectionReason,
            auth,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/timesheets/:periodId/reopen',
    requireAuth,
    requireTimesheetCapability('hr.timesheets.write'),
    async (request, response, next) => {
      try {
        const params = periodParamsSchema.parse(request.params);
        const auth = getAuth(response);

        ensureCompanyAccess(auth, params.companyId);
        response.status(200).json(await reopenPeriod({ ...params, auth }));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
