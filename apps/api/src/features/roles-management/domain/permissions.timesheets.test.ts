import { describe, expect, it } from 'vitest';

import {
  getCompanyOwnerPermissionKeys,
  getCompanyUserPermissionKeys,
  hrPermissionKeys,
  permissionCatalogSeeds,
} from './permissions';

const expectedHrTimesheetKeys = [
  'hr.timesheets.read',
  'hr.timesheets.write',
  'hr.timesheets.submit',
  'hr.timesheets.approve',
] as const;

describe('timesheet permission seeds', () => {
  it('appends the timesheet capability keys to the hr permission catalog in order', () => {
    expect(hrPermissionKeys).toEqual([
      'hr.employees.read',
      'hr.employees.write',
      'hr.employees.assign',
      'hr.positions.read',
      'hr.positions.write',
      'hr.erp_access.invite',
      'hr.erp_access.revoke',
      'hr.approval_policy.read',
      'hr.approval_policy.write',
      ...expectedHrTimesheetKeys,
    ]);
  });

  it('exposes the timesheet keys through catalog seeds and company hr role helpers', () => {
    expect(
      permissionCatalogSeeds
        .filter((permission) => permission.key.startsWith('hr.timesheets.'))
        .map((permission) => permission.key),
    ).toEqual([...expectedHrTimesheetKeys]);
    expect(
      permissionCatalogSeeds
        .filter((permission) => permission.key.startsWith('hr.timesheets.'))
        .map((permission) => permission.family),
    ).toEqual(['normal', 'normal', 'normal', 'normal']);
    expect(getCompanyOwnerPermissionKeys(['hr'])).toEqual(
      expect.arrayContaining([...expectedHrTimesheetKeys]),
    );
    expect(getCompanyUserPermissionKeys(['hr'])).toEqual(
      expect.arrayContaining([...expectedHrTimesheetKeys]),
    );
  });
});
