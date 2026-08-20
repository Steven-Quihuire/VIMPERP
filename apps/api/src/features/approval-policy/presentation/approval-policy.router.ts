import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { scopeTypeValues } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import type { PermissionScope } from '../../roles-management/domain/assignments';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const policyParamsSchema = z.object({
  companyId: z.string().min(1),
  policyId: z.string().min(1),
});
const approvalPolicyListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
});
const approvalPolicyBodySchema = z.object({
  scopeType: z.enum(scopeTypeValues),
  scopeNodeId: z.string().min(1).nullable(),
  name: z.string().min(1),
  definition: z.unknown(),
  isActive: z.boolean().optional(),
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

export const createApprovalPolicyRouter = ({
  requireAuth,
  requireHrCapability,
  resolvePermissionScope,
  createApprovalPolicy,
  listApprovalPolicies,
  getApprovalPolicy,
  updateApprovalPolicy,
  deactivateApprovalPolicy,
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
  createApprovalPolicy: (input: {
    companyId: string;
    scopeType: (typeof scopeTypeValues)[number];
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive?: boolean;
  }) => Promise<unknown>;
  listApprovalPolicies: (input: {
    companyId: string;
    auth: AuthSession;
    filters?: {
      page: number;
      pageSize: number;
      search?: string | undefined;
    };
  }) => Promise<unknown>;
  getApprovalPolicy: (input: { companyId: string; policyId: string }) => Promise<unknown>;
  updateApprovalPolicy: (input: {
    companyId: string;
    policyId: string;
    scopeType: (typeof scopeTypeValues)[number];
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) => Promise<unknown>;
  deactivateApprovalPolicy: (input: {
    companyId: string;
    policyId: string;
  }) => Promise<unknown>;
}) => {
  const router = Router();
  const requirePolicyCapability = (permissionKey: string) =>
    requireHrCapability(permissionKey, resolvePermissionScope);

  router.post(
    '/companies/:companyId/approval-policies',
    requireAuth,
    requirePolicyCapability('hr.approval_policy.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = approvalPolicyBodySchema.parse(request.body);
        ensureCompanyAccess(getAuth(response), params.companyId);

        response.status(201).json(
          await createApprovalPolicy({
            companyId: params.companyId,
            scopeType: body.scopeType,
            scopeNodeId: body.scopeNodeId,
            name: body.name,
            definition: body.definition,
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/approval-policies',
    requireAuth,
    requirePolicyCapability('hr.approval_policy.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        const filters = Object.keys(request.query).length
          ? approvalPolicyListQuerySchema.parse(request.query)
          : undefined;

        response.status(200).json(
          await listApprovalPolicies({
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

  router.get(
    '/companies/:companyId/approval-policies/:policyId',
    requireAuth,
    requirePolicyCapability('hr.approval_policy.read'),
    async (request, response, next) => {
      try {
        const params = policyParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await getApprovalPolicy(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/companies/:companyId/approval-policies/:policyId',
    requireAuth,
    requirePolicyCapability('hr.approval_policy.write'),
    async (request, response, next) => {
      try {
        const params = policyParamsSchema.parse(request.params);
        const body = approvalPolicyBodySchema.extend({
          isActive: z.boolean(),
        }).parse(request.body);

        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(
          await updateApprovalPolicy({
            ...params,
            ...body,
          }),
        );
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/companies/:companyId/approval-policies/:policyId/deactivate',
    requireAuth,
    requirePolicyCapability('hr.approval_policy.write'),
    async (request, response, next) => {
      try {
        const params = policyParamsSchema.parse(request.params);
        ensureCompanyAccess(getAuth(response), params.companyId);
        response.status(200).json(await deactivateApprovalPolicy(params));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
