import { describe, expect, it } from 'vitest';

import { authCapabilityValues, mergeAuthCapabilities } from '../auth';

describe('auth capabilities', () => {
  it('includes hr timesheet capability values', () => {
    expect(authCapabilityValues).toEqual(
      expect.arrayContaining([
        'hr.timesheets.read',
        'hr.timesheets.write',
        'hr.timesheets.submit',
        'hr.timesheets.approve',
      ]),
    );
  });

  it('merges hr timesheet capabilities into a unique sorted set', () => {
    expect(
      mergeAuthCapabilities(['hr.timesheets.approve', 'catalog.read'], ['hr.timesheets.read']),
    ).toEqual(['catalog.read', 'hr.timesheets.approve', 'hr.timesheets.read']);
  });
});
