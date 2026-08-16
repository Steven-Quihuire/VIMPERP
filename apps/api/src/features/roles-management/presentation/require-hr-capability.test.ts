import { describe, expect, it, vi } from 'vitest';

import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import { createRequireHrCapability } from './require-hr-capability';

const auth: AuthSession = {
  user: {
    id: 'user-1',
    email: 'owner@vimcore.test',
    username: 'owner',
  },
  memberships: [],
  activeCompany: {
    companyId: 'company-a',
    status: 'active',
  },
  activeScope: {
    scopeType: 'warehouse',
    scopeId: 'warehouse-1',
  },
  activeLocalId: null,
  capabilities: [],
};

describe('createRequireHrCapability', () => {
  it('allows the request when the required hr permission is present', async () => {
    const next = vi.fn();
    const requireHrCapability = createRequireHrCapability({
      computeEffectivePermissions: () => Promise.resolve(['hr.approval_policy.read']),
    });

    await requireHrCapability('hr.approval_policy.read')(
      {} as never,
      { locals: { auth } } as never,
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('returns forbidden when the permission is missing', async () => {
    const next = vi.fn();
    const requireHrCapability = createRequireHrCapability({
      computeEffectivePermissions: () => Promise.resolve([]),
    });

    await requireHrCapability('hr.approval_policy.write')(
      {} as never,
      { locals: { auth } } as never,
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('forwards a custom permission scope into permission evaluation', async () => {
    const next = vi.fn();
    const computeEffectivePermissions = vi.fn(() => Promise.resolve(['hr.employees.read']));
    const requireHrCapability = createRequireHrCapability({
      computeEffectivePermissions,
    });

    await requireHrCapability('hr.employees.read', () => ({
      kind: 'direct_reports',
    }))(
      {} as never,
      { locals: { auth } } as never,
      next,
    );

    expect(computeEffectivePermissions).toHaveBeenCalledWith(
      expect.objectContaining({ permissionScope: { kind: 'direct_reports' } }),
    );
    expect(next).toHaveBeenCalledWith();
  });
});
