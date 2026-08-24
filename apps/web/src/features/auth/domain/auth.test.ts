import { describe, expect, it } from 'vitest';

import {
  hasTimesheetReadVisibility,
  hasBlockedActiveCompany,
  needsActiveCompanySelection,
  type AuthSession,
} from './auth';

const session: AuthSession = {
  user: { id: 'user-1', email: 'owner@vimcore.test', username: 'owner' },
  memberships: [
    { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
  ],
  activeCompany: { companyId: 'company-1', status: 'active' },
  activeScope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
  activeLocalId: null,
  capabilities: ['catalog.read', 'catalog.write', 'catalog.delete'],
};

describe('auth domain helpers', () => {
  it('does not require active-company selection when a company is already active', () => {
    expect(needsActiveCompanySelection(session)).toBe(false);
  });

  it('detects blocked active companies independently from activeScope', () => {
    expect(
      hasBlockedActiveCompany({
        ...session,
        activeCompany: { companyId: 'company-1', status: 'suspended' },
      }),
    ).toBe(true);
  });

  it('derives timesheet visibility from the dedicated capability', () => {
    expect(
      hasTimesheetReadVisibility({
        ...session,
        capabilities: [...session.capabilities, 'hr.timesheets.read'],
      }),
    ).toBe(true);

    expect(hasTimesheetReadVisibility(session)).toBe(false);
  });
});
