import { z } from 'zod';

import type { OrgTreeScopeType } from '@/features/org-tree/domain/org-tree';

export const approvalPolicyScopeTypes = [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
] as const satisfies readonly OrgTreeScopeType[];

export type ApprovalPolicy = {
  id: string;
  companyId: string;
  scopeType: OrgTreeScopeType;
  scopeNodeId: string | null;
  name: string;
  definition: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const approvalPolicyFormSchema = z
  .object({
    scopeType: z.enum(approvalPolicyScopeTypes),
    scopeNodeId: z.string().trim().default(''),
    name: z.string().trim().min(1, 'El nombre de la política es obligatorio.'),
    definitionJson: z.string().trim().min(1, 'El JSON de definición es obligatorio.'),
    isActive: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.scopeType !== 'company' && values.scopeNodeId.trim().length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scopeNodeId'],
        message: 'El nodo de alcance es obligatorio para las políticas con alcance de nodo.',
      });
    }

    try {
      JSON.parse(values.definitionJson);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['definitionJson'],
        message: 'El JSON de definición debe tener un formato válido.',
      });
    }
  });

export type ApprovalPolicyFormValues = z.output<typeof approvalPolicyFormSchema>;

export const getApprovalPolicySteps = (definition: unknown): string[] => {
  if (!definition || typeof definition !== 'object' || !('steps' in definition)) {
    return [];
  }

  const steps = (definition as { steps?: unknown }).steps;
  return Array.isArray(steps) && steps.every((step) => typeof step === 'string')
    ? steps
    : [];
};

export const toApprovalPolicyDefinition = (steps: string[]) => ({ steps });

export type CreateApprovalPolicyInput = {
  companyId: string;
  scopeType: OrgTreeScopeType;
  scopeNodeId: string | null;
  name: string;
  definition: unknown;
  isActive: boolean;
};

export type UpdateApprovalPolicyInput = CreateApprovalPolicyInput & {
  policyId: string;
};

const toDefinition = (definitionJson: string) => JSON.parse(definitionJson) as unknown;

const toScopeNodeId = (values: ApprovalPolicyFormValues) =>
  values.scopeType === 'company' ? null : values.scopeNodeId.trim();

export const toCreateApprovalPolicyInput = (
  companyId: string,
  values: ApprovalPolicyFormValues,
): CreateApprovalPolicyInput => ({
  companyId,
  scopeType: values.scopeType,
  scopeNodeId: toScopeNodeId(values),
  name: values.name.trim(),
  definition: toDefinition(values.definitionJson),
  isActive: values.isActive,
});

export const toUpdateApprovalPolicyInput = (
  companyId: string,
  policyId: string,
  values: ApprovalPolicyFormValues,
): UpdateApprovalPolicyInput => ({
  companyId,
  policyId,
  scopeType: values.scopeType,
  scopeNodeId: toScopeNodeId(values),
  name: values.name.trim(),
  definition: toDefinition(values.definitionJson),
  isActive: values.isActive,
});

export const sortApprovalPoliciesByUpdatedAtDesc = (policies: ApprovalPolicy[]) => {
  return [...policies].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
};

export const toPolicyFormValues = (
  policy?: ApprovalPolicy | null,
): ApprovalPolicyFormValues => ({
  scopeType: policy?.scopeType ?? 'company',
  scopeNodeId: policy?.scopeNodeId ?? '',
  name: policy?.name ?? '',
  definitionJson: policy ? JSON.stringify(policy.definition) : '{"steps":[]}',
  isActive: policy?.isActive ?? true,
});

export const getApprovalPolicyScopeLabel = (policy: ApprovalPolicy) =>
  policy.scopeType === 'company'
    ? 'Compañía'
    : `${policy.scopeType} · ${policy.scopeNodeId ?? 'unassigned'}`;
