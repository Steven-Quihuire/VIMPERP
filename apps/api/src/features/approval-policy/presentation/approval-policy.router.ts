import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import { scopeTypeValues } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

const companyParamsSchema = z.object({ companyId: z.string().min(1) });
const policyParamsSchema = z.object({
  companyId: z.string().min(1),
  policyId: z.string().min(1),
});
const approvalPolicyBodySchema = z.object({
  scopeType: z.enum(scopeTypeValues),
  scopeNodeId: z.string().min(1).nullable(),
  name: z.string().min(1),
  definition: z.unknown(),
  isActive: z.boolean().optional(),
});

export const createApprovalPolicyRouter = ({
  requireAuth,
  requireHrCapability,
  createApprovalPolicy,
  listApprovalPolicies,
  getApprovalPolicy,
  updateApprovalPolicy,
  deactivateApprovalPolicy,
}: {
  requireAuth: RequestHandler;
  requireHrCapability: (permissionKey: string) => RequestHandler;
  createApprovalPolicy: (input: {
    companyId: string;
    scopeType: (typeof scopeTypeValues)[number];
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive?: boolean;
  }) => Promise<unknown>;
  listApprovalPolicies: (companyId: string) => Promise<unknown>;
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

  router.post(
    '/companies/:companyId/approval-policies',
    requireAuth,
    requireHrCapability('hr.approval_policy.write'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        const body = approvalPolicyBodySchema.parse(request.body);

        response.status(201).json(
          await createApprovalPolicy({
            companyId: params.companyId,
            ...body,
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
    requireHrCapability('hr.approval_policy.read'),
    async (request, response, next) => {
      try {
        const params = companyParamsSchema.parse(request.params);
        response.status(200).json(await listApprovalPolicies(params.companyId));
      } catch (error) {
        next(error);
      }
    },
  );

  router.get(
    '/companies/:companyId/approval-policies/:policyId',
    requireAuth,
    requireHrCapability('hr.approval_policy.read'),
    async (request, response, next) => {
      try {
        const params = policyParamsSchema.parse(request.params);
        response.status(200).json(await getApprovalPolicy(params));
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/companies/:companyId/approval-policies/:policyId',
    requireAuth,
    requireHrCapability('hr.approval_policy.write'),
    async (request, response, next) => {
      try {
        const params = policyParamsSchema.parse(request.params);
        const body = approvalPolicyBodySchema.extend({
          isActive: z.boolean(),
        }).parse(request.body);

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
    requireHrCapability('hr.approval_policy.write'),
    async (request, response, next) => {
      try {
        const params = policyParamsSchema.parse(request.params);
        response.status(200).json(await deactivateApprovalPolicy(params));
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
