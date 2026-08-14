import { describe, expect, it } from 'vitest';

import { assertValidApprovalPolicyScope, ApprovalPolicyValidationError } from '../approval-policy';

describe('assertValidApprovalPolicyScope', () => {
  it('rejects a company scope that still carries a scope node id', () => {
    expect(() =>
      assertValidApprovalPolicyScope({
        scopeType: 'company',
        scopeNodeId: 'scope-node-1',
      }),
    ).toThrow(ApprovalPolicyValidationError);
  });

  it('rejects a node scope without a scope node id', () => {
    expect(() =>
      assertValidApprovalPolicyScope({
        scopeType: 'area',
        scopeNodeId: null,
      }),
    ).toThrow(ApprovalPolicyValidationError);
  });

  it('accepts company and node scopes when the shape matches the database checks', () => {
    expect(() =>
      assertValidApprovalPolicyScope({
        scopeType: 'company',
        scopeNodeId: null,
      }),
    ).not.toThrow();

    expect(() =>
      assertValidApprovalPolicyScope({
        scopeType: 'local',
        scopeNodeId: 'scope-node-1',
      }),
    ).not.toThrow();
  });
});
