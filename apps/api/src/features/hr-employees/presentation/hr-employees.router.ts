import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import {
  employmentStatusValues,
  type EmployeeIdentityInput,
} from '../domain/employees';
import type { PermissionScope } from '../../roles-management/domain/assignments';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const employeeParamsSchema = z.object({
  companyId: z.string().min(1),
  employeeId: z.string().min(1),
});
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
const employeeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(10).default(10),
  search: z.string().trim().max(100).optional(),
  status: z.enum(employmentStatusValues).optional(),
});

const getAuth = (response: Parameters<RequestHandler>[1]) =>
  (response.locals as { auth: AuthSession }).auth;

const ensureCompanyAccess = (auth: AuthSession, companyId: string) => {
  if (auth.activeCompany?.companyId !== companyId) {
    throw new ForbiddenError();
  }
};

type ResolvePermissionScope = (input: {
  request: Parameters<RequestHandler>[0];
  response: Parameters<RequestHandler>[1];
  auth: AuthSession;
}) => PermissionScope | undefined | Promise<PermissionScope | undefined>;

export const createHrEmployeesRouter = ({
  requireAuth,
  requireHrCapability,
  resolvePermissionScope,
  createEmployee,
  updateEmployee,
  listEmployees,
  getEmployee,
  createPosition,
  listPositions,
  createAssignment,
  listAssignmentHistory,
  resolveReportingLine,
  resolveDirectReports,
}: {
  requireAuth: RequestHandler;
  requireHrCapability: (
    permissionKey: string,
    resolvePermissionScope?: ResolvePermissionScope,
  ) => RequestHandler;
  resolvePermissionScope?: (input: {
    request: Parameters<RequestHandler>[0];
    response: Parameters<RequestHandler>[1];
    auth: AuthSession;
  }) => PermissionScope | undefined | Promise<PermissionScope | undefined>;
  createEmployee: (
    input: { companyId: string } & EmployeeIdentityInput,
  ) => Promise<unknown>;
  updateEmployee: (
    companyId: string,
    employeeId: string,
    input: Partial<EmployeeIdentityInput>,
  ) => Promise<unknown>;
  listEmployees: (input: {
    companyId: string;
    auth: AuthSession;
    filters?: {
      page: number;
      pageSize: number;
      search?: string | undefined;
      status?: (typeof employmentStatusValues)[number] | undefined;
    };
  }) => Promise<unknown>;
  getEmployee: (input: {
    companyId: string;
    employeeId: string;
  }) => Promise<unknown>;
  createPosition: (input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) => Promise<unknown>;
  listPositions: (input: {
    companyId: string;
    auth: AuthSession;
  }) => Promise<unknown>;
  createAssignment: (input: {
    companyId: string;
    employeeId: string;
    scopeNodeId: string;
    positionId: string;
    startedAt: Date;
  }) => Promise<unknown>;
  listAssignmentHistory: (input: {
    companyId: string;
    employeeId: string;
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
  const requireEmployeeCapability = (permissionKey: string) =>
    requireHrCapability(permissionKey, resolvePermissionScope);

  router.post(
    '/companies/:companyId/hr-employees',
    requireAuth,
    requireEmployeeCapability('hr.employees.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = createEmployeeBodySchema.parse(request.body);
        ensureCompanyAccess(getAuth(response), params.companyId);
        const employee = await createEmployee({
          companyId: params.companyId,
          ...body,
        });
        response.status(201).json(employee);
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-employees',
    requireAuth,
    requireEmployeeCapability('hr.employees.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        const filters = Object.keys(request.query).length
          ? employeeListQuerySchema.parse(request.query)
          : undefined;
        response.status(200).json(
          await listEmployees({
            companyId: params.companyId,
            auth: getAuth(response),
            ...(filters ? { filters } : {}),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/companies/:companyId/hr-employees/:employeeId',
    requireAuth,
    requireEmployeeCapability('hr.employees.write'),
    async (request, response, next) => {
      try {
        const params = employeeParamsSchema.parse(request.params);
        const body = updateEmployeeBodySchema.parse(request.body);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response
          .status(200)
          .json(
            await updateEmployee(
              params.companyId,
              params.employeeId,
              body as Partial<EmployeeIdentityInput>,
            ),
          );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/hr-employees/positions',
    requireAuth,
    requireEmployeeCapability('hr.positions.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = createPositionBodySchema.parse(request.body);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response
          .status(201)
          .json(await createPosition({ companyId: params.companyId, ...body }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-employees/positions',
    requireAuth,
    requireEmployeeCapability('hr.positions.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(
          await listPositions({
            companyId: params.companyId,
            auth: getAuth(response),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-employees/:employeeId',
    requireAuth,
    requireEmployeeCapability('hr.employees.read'),
    async (request, response, next) => {
      try {
        const params = employeeParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await getEmployee(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/hr-employees/:employeeId/assignments',
    requireAuth,
    requireEmployeeCapability('hr.employees.assign'),
    async (request, response, next) => {
      try {
        const params = employeeParamsSchema.parse(request.params);
        const body = createAssignmentBodySchema.parse(request.body);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response
          .status(201)
          .json(await createAssignment({ ...params, ...body }));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-employees/:employeeId/assignments',
    requireAuth,
    requireEmployeeCapability('hr.employees.read'),
    async (request, response, next) => {
      try {
        const params = employeeParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await listAssignmentHistory(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-employees/:employeeId/reports/manager',
    requireAuth,
    requireEmployeeCapability('hr.employees.read'),
    async (request, response, next) => {
      try {
        const params = employeeParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await resolveReportingLine(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/hr-employees/:employeeId/reports/direct',
    requireAuth,
    requireEmployeeCapability('hr.employees.read'),
    async (request, response, next) => {
      try {
        const params = employeeParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await resolveDirectReports(params));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
