import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import {
  ForbiddenError,
  requireTenantCapability,
  type AuthSession,
} from '../../identity/domain/auth';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const employeeParamsSchema = z.object({ companyId: z.string().min(1), employeeId: z.string().min(1) });
const createPositionBodySchema = z.object({
  name: z.string().min(1),
  reportsToPositionId: z.string().min(1).nullable(),
  headcount: z.number().int().nonnegative(),
  isActive: z.boolean(),
});
const createAssignmentBodySchema = z.object({
  scopeNodeId: z.string().min(1),
  positionId: z.string().min(1),
  startedAt: z.coerce.date(),
});

const getAuth = (response: Parameters<RequestHandler>[1]) =>
  (response.locals as { auth: AuthSession }).auth;

const ensureCompanyAccess = (auth: AuthSession, companyId: string) => {
  const tenant = requireTenantCapability(auth, 'catalog.read');

  if (tenant.companyId !== companyId) {
    throw new ForbiddenError();
  }
};

export const createHrEmployeesRouter = ({
  requireAuth,
  createEmployee,
  listEmployees,
  getEmployee,
  createPosition,
  listPositions,
  createAssignment,
  resolveReportingLine,
  resolveDirectReports,
}: {
  requireAuth: RequestHandler;
  createEmployee: (input: { companyId: string }) => Promise<unknown>;
  listEmployees: (input: { companyId: string }) => Promise<unknown>;
  getEmployee: (input: { companyId: string; employeeId: string }) => Promise<unknown>;
  createPosition: (input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) => Promise<unknown>;
  listPositions: (input: { companyId: string }) => Promise<unknown>;
  createAssignment: (input: {
    companyId: string;
    employeeId: string;
    scopeNodeId: string;
    positionId: string;
    startedAt: Date;
  }) => Promise<unknown>;
  resolveReportingLine: (input: {
    companyId: string;
    employeeId: string;
  }) => Promise<unknown>;
  resolveDirectReports: (input: {
    companyId: string;
    employeeId: string;
  }) => Promise<unknown>;
}): Router => {
  const router = Router();

  router.post('/companies/:companyId/hr-employees', requireAuth, async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      const employee = await createEmployee({ companyId: params.companyId });
      response.status(201).json(employee);
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees', requireAuth, async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await listEmployees({ companyId: params.companyId }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/:employeeId', requireAuth, async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await getEmployee(params));
    } catch (error) {
      next(error);
    }
  });

  router.post('/companies/:companyId/hr-employees/positions', requireAuth, async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      const body = createPositionBodySchema.parse(request.body);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(201).json(await createPosition({ companyId: params.companyId, ...body }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/positions', requireAuth, async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await listPositions({ companyId: params.companyId }));
    } catch (error) {
      next(error);
    }
  });

  router.post('/companies/:companyId/hr-employees/:employeeId/assignments', requireAuth, async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      const body = createAssignmentBodySchema.parse(request.body);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(201).json(await createAssignment({ ...params, ...body }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/:employeeId/reports/manager', requireAuth, async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await resolveReportingLine(params));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/:employeeId/reports/direct', requireAuth, async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await resolveDirectReports(params));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
