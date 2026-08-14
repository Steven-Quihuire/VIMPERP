import { describe, expect, it } from 'vitest';

import { assignmentFormSchema, buildAssignmentTimelineEntries, toCreateAssignmentInput } from '../assignments';
import { employeeFormSchema, sortEmployeesByCreatedAtDesc } from '../employees';
import { positionFormSchema, sortPositionsByName, toCreatePositionInput } from '../positions';

describe('hr-employees domain helpers', () => {
  it('sorts employees by newest first and keeps the empty employee form valid', () => {
    expect(employeeFormSchema.parse({})).toEqual({});

    expect(
      sortEmployeesByCreatedAtDesc([
        { id: 'employee-1', companyId: 'company-1', createdAt: '2026-08-13T10:00:00.000Z' },
        { id: 'employee-2', companyId: 'company-1', createdAt: '2026-08-13T12:00:00.000Z' },
      ]).map((employee) => employee.id),
    ).toEqual(['employee-2', 'employee-1']);
  });

  it('normalizes position form values and sorts positions alphabetically', () => {
    const parsed = positionFormSchema.parse({
      name: ' People Lead ',
      reportsToPositionId: '',
      headcount: 3,
      isActive: true,
    });

    expect(toCreatePositionInput('company-1', parsed)).toEqual({
      companyId: 'company-1',
      name: 'People Lead',
      reportsToPositionId: null,
      headcount: 3,
      isActive: true,
    });

    expect(
      sortPositionsByName([
        {
          id: 'position-2',
          companyId: 'company-1',
          name: 'Recruiter',
          reportsToPositionId: null,
          headcount: 1,
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
        },
        {
          id: 'position-1',
          companyId: 'company-1',
          name: 'Analyst',
          reportsToPositionId: null,
          headcount: 1,
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
        },
      ]).map((position) => position.id),
    ).toEqual(['position-1', 'position-2']);
  });

  it('builds assignment payloads and timeline entries from manager/direct reports', () => {
    const parsed = assignmentFormSchema.parse({
      scopeNodeId: 'company:company-1',
      positionId: 'position-1',
      startedAt: '2026-08-13T12:30',
    });

    expect(toCreateAssignmentInput('company-1', 'employee-2', parsed)).toEqual({
      companyId: 'company-1',
      employeeId: 'employee-2',
      scopeNodeId: 'company:company-1',
      positionId: 'position-1',
      startedAt: '2026-08-13T12:30:00.000Z',
    });

    expect(
      buildAssignmentTimelineEntries({
        manager: {
          employeeId: 'employee-1',
          positionId: 'position-1',
          assignmentId: 'assignment-1',
        },
        directReports: [
          {
            employeeId: 'employee-3',
            positionId: 'position-2',
            assignmentId: 'assignment-2',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'manager-assignment-1',
        title: 'Manager · employee-1',
        description: 'Position position-1',
      },
      {
        id: 'direct-report-assignment-2',
        title: 'Direct report · employee-3',
        description: 'Position position-2',
      },
    ]);
  });
});
