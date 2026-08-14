import { describe, expect, it } from 'vitest';

import {
  ErpAccessLinkConflictError,
  assertNoAmbiguousActiveErpAccessLink,
  type ErpAccessLink,
} from '../erp-access-links';

const createLink = (overrides: Partial<ErpAccessLink> = {}): ErpAccessLink => ({
  id: 'link-1',
  companyId: 'company-1',
  employeeId: 'employee-1',
  userId: 'user-1',
  isActive: true,
  createdAt: new Date('2026-08-13T12:00:00.000Z'),
  revokedAt: null,
  ...overrides,
});

describe('assertNoAmbiguousActiveErpAccessLink', () => {
  it('allows a missing active link and an exact employee-user match', () => {
    expect(() =>
      assertNoAmbiguousActiveErpAccessLink({
        employeeId: 'employee-1',
        userId: 'user-1',
        activeEmployeeLink: null,
        activeUserLink: null,
      }),
    ).not.toThrow();

    expect(() =>
      assertNoAmbiguousActiveErpAccessLink({
        employeeId: 'employee-1',
        userId: 'user-1',
        activeEmployeeLink: createLink(),
        activeUserLink: createLink(),
      }),
    ).not.toThrow();
  });

  it('rejects an active employee link or user link that points to a different identity', () => {
    expect(() =>
      assertNoAmbiguousActiveErpAccessLink({
        employeeId: 'employee-1',
        userId: 'user-1',
        activeEmployeeLink: createLink({ userId: 'user-2' }),
        activeUserLink: null,
      }),
    ).toThrow(ErpAccessLinkConflictError);

    expect(() =>
      assertNoAmbiguousActiveErpAccessLink({
        employeeId: 'employee-1',
        userId: 'user-1',
        activeEmployeeLink: null,
        activeUserLink: createLink({ employeeId: 'employee-2' }),
      }),
    ).toThrow(ErpAccessLinkConflictError);
  });
});
