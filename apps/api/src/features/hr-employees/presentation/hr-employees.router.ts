import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import {
  ForbiddenError,
  type AuthSession,
} from '../../identity/domain/auth';
import {
  employmentStatusValues,
  type EmployeeIdentityInput,
} from '../domain/employees';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const employeeParamsSchema = z.object({ companyId: z.string().min(1), employeeId: z.string().min(1) });
const employeeFieldsSchema = {
  fullName: z.string().trim().min(1),
  documentType: z.string().trim().min(1).nullable(),
  documentNumber: z.string().trim().min(1).nullable(),
  email: z.string().trim().email().nullable(),
  employmentStatus: z.enum(employmentStatusValues),
  hiredAt: z.coerce.date().nullable(),
};
const createEmployeeBodySchema = z.object(employeeFieldsSchema).extend({
  employmentStatus: z.enum(employmentStatusValues).default('active'),
  documentType: z.string().trim().min(1).nullable().default(null),
  documentNumber: z.string().trim().min(1).nullable().default(null),
  email: z.string().trim().email().nullable().default(null),
  hiredAt: z.coerce.date().nullable().default(null),
});
const updateEmployeeBodySchema = z.object(employeeFieldsSchema).partial();
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
  if (auth.activeCompany?.companyId !== companyId) {
    throw new ForbiddenError();
  }
};

export const createHrEmployeesRouter = ({
  requireAuth,
  requireHrCapability,
  createEmployee,
  updateEmployee,
  listEmployees,
  getEmployee,
  createPosition,
  listPositions,
  createAssignment,
  resolveReportingLine,
  resolveDirectReports,
}: {
  requireAuth: RequestHandler;
  requireHrCapability: (permissionKey: string) => RequestHandler;
  createEmployee: (input: { companyId: string } & EmployeeIdentityInput) => Promise<unknown>;
  updateEmployee: (
    companyId: string,
    employeeId: string,
    input: Partial<EmployeeIdentityInput>,
  ) => Promise<unknown>;
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

  router.post('/companies/:companyId/hr-employees', requireAuth, requireHrCapability('hr.employees.write'), async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      const body = createEmployeeBodySchema.parse(request.body);
      ensureCompanyAccess(getAuth(response), params.companyId);
      const employee = await createEmployee({ companyId: params.companyId, ...body });
      response.status(201).json(employee);
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees', requireAuth, requireHrCapability('hr.employees.read'), async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await listEmployees({ companyId: params.companyId }));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/companies/:companyId/hr-employees/:employeeId', requireAuth, requireHrCapability('hr.employees.write'), async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      const body = updateEmployeeBodySchema.parse(request.body);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await updateEmployee(
        params.companyId,
        params.employeeId,
        body as Partial<EmployeeIdentityInput>,
      ));
    } catch (error) {
      next(error);
    }
  });

  router.post('/companies/:companyId/hr-employees/positions', requireAuth, requireHrCapability('hr.positions.write'), async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      const body = createPositionBodySchema.parse(request.body);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(201).json(await createPosition({ companyId: params.companyId, ...body }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/positions', requireAuth, requireHrCapability('hr.positions.read'), async (request, response, next) => {
    try {
      const params = companyParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await listPositions({ companyId: params.companyId }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/:employeeId', requireAuth, requireHrCapability('hr.employees.read'), async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await getEmployee(params));
    } catch (error) {
      next(error);
    }
  });

  router.post('/companies/:companyId/hr-employees/:employeeId/assignments', requireAuth, requireHrCapability('hr.employees.assign'), async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      const body = createAssignmentBodySchema.parse(request.body);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(201).json(await createAssignment({ ...params, ...body }));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/:employeeId/reports/manager', requireAuth, requireHrCapability('hr.employees.read'), async (request, response, next) => {
    try {
      const params = employeeParamsSchema.parse(request.params);
      ensureCompanyAccess(getAuth(response), params.companyId);
      response.status(200).json(await resolveReportingLine(params));
    } catch (error) {
      next(error);
    }
  });

  router.get('/companies/:companyId/hr-employees/:employeeId/reports/direct', requireAuth, requireHrCapability('hr.employees.read'), async (request, response, next) => {
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
