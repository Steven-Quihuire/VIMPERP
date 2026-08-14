import { describe, expect, it } from 'vitest';

import {
  approvalPolicyFormSchema,
  sortApprovalPoliciesByUpdatedAtDesc,
  toCreateApprovalPolicyInput,
  toUpdateApprovalPolicyInput,
} from '../approval-policy';

describe('approval-policy domain', () => {
  it('normalizes company-scoped form values into a create payload', () => {
    const values = approvalPolicyFormSchema.parse({
      scopeType: 'company',
      scopeNodeId: '   ',
      name: ' Company approvals ',
      definitionJson: '{"steps":["manager"]}',
      isActive: true,
    });

    expect(toCreateApprovalPolicyInput('company-1', values)).toEqual({
      companyId: 'company-1',
      scopeType: 'company',
      scopeNodeId: null,
      name: 'Company approvals',
      definition: { steps: ['manager'] },
      isActive: true,
    });
  });

  it('requires a scope node for non-company scopes and keeps it in update payloads', () => {
    const values = approvalPolicyFormSchema.parse({
      scopeType: 'area',
      scopeNodeId: ' area:area-1 ',
      name: ' Area approvals ',
      definitionJson: '{"steps":["director"]}',
      isActive: false,
    });

    expect(toUpdateApprovalPolicyInput('company-1', 'policy-1', values)).toEqual({
      companyId: 'company-1',
      policyId: 'policy-1',
      scopeType: 'area',
      scopeNodeId: 'area:area-1',
      name: 'Area approvals',
      definition: { steps: ['director'] },
      isActive: false,
    });

    expect(() =>
      approvalPolicyFormSchema.parse({
        scopeType: 'warehouse',
        scopeNodeId: '',
        name: 'Warehouse approvals',
        definitionJson: '{"steps":["ops"]}',
        isActive: true,
      }),
    ).toThrow('El nodo de alcance es obligatorio para las políticas con alcance de nodo.');
  });

  it('sorts policies by most recently updated first', () => {
    expect(
      sortApprovalPoliciesByUpdatedAtDesc([
        {
          id: 'policy-1',
          companyId: 'company-1',
          scopeType: 'company',
          scopeNodeId: null,
          name: 'Oldest',
          definition: { steps: ['manager'] },
          isActive: true,
          createdAt: '2026-08-13T09:00:00.000Z',
          updatedAt: '2026-08-13T09:00:00.000Z',
        },
        {
          id: 'policy-2',
          companyId: 'company-1',
          scopeType: 'area',
          scopeNodeId: 'area:area-1',
          name: 'Newest',
          definition: { steps: ['director'] },
          isActive: false,
          createdAt: '2026-08-13T10:00:00.000Z',
          updatedAt: '2026-08-13T11:00:00.000Z',
        },
      ]).map((policy) => policy.id),
    ).toEqual(['policy-2', 'policy-1']);
  });
});
