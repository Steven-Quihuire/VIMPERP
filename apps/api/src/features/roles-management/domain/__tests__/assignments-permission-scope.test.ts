import { describe, expect, it } from 'vitest';

import { resolveReportingLineScopeEmployeeIds } from '../assignments';

describe('resolveReportingLineScopeEmployeeIds', () => {
  it('returns only direct reports for the direct_reports scope', () => {
    expect(
      resolveReportingLineScopeEmployeeIds({
        actorEmployeeId: 'employee-manager',
        directReportEmployeeIds: ['employee-a', 'employee-b', 'employee-a'],
        scope: { kind: 'direct_reports' },
      }),
    ).toEqual(['employee-a', 'employee-b']);
  });

  it('returns only the actor employee for the self scope', () => {
    expect(
      resolveReportingLineScopeEmployeeIds({
        actorEmployeeId: 'employee-manager',
        directReportEmployeeIds: ['employee-a', 'employee-b'],
        scope: { kind: 'self' },
      }),
    ).toEqual(['employee-manager']);
  });
});
