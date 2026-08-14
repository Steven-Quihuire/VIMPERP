import { describe, expect, it } from 'vitest';

import { assignmentFormSchema, buildAssignmentTimelineEntries, toCreateAssignmentInput } from '../assignments';
import {
  employeeFormSchema,
  sortEmployeesByCreatedAtDesc,
  toCreateEmployeeInput,
} from '../employees';
import { positionFormSchema, sortPositionsByName, toCreatePositionInput } from '../positions';

describe('hr-employees domain helpers', () => {
  it('normalizes employee identity and sorts employees by newest first', () => {
    const employeeValues = employeeFormSchema.parse({
      fullName: ' Ana Employee ',
      email: 'ana@example.com',
      employmentStatus: 'active',
      hiredAt: '2026-08-13T12:00',
    });

    expect(toCreateEmployeeInput('company-1', employeeValues)).toMatchObject({
      companyId: 'company-1',
      fullName: 'Ana Employee',
      email: 'ana@example.com',
      employmentStatus: 'active',
    });

    expect(
      sortEmployeesByCreatedAtDesc([
        { id: 'employee-1', companyId: 'company-1', fullName: 'One', employmentStatus: 'active', documentType: null, documentNumber: null, email: null, hiredAt: null, createdAt: '2026-08-13T10:00:00.000Z', updatedAt: '2026-08-13T10:00:00.000Z' },
        { id: 'employee-2', companyId: 'company-1', fullName: 'Two', employmentStatus: 'active', documentType: null, documentNumber: null, email: null, hiredAt: null, createdAt: '2026-08-13T12:00:00.000Z', updatedAt: '2026-08-13T12:00:00.000Z' },
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
           occupiedHeadcount: 0,
           remainingVacancies: 1,
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
        },
        {
          id: 'position-1',
          companyId: 'company-1',
          name: 'Analyst',
          reportsToPositionId: null,
           headcount: 1,
           occupiedHeadcount: 0,
           remainingVacancies: 1,
          isActive: true,
          createdAt: '2026-08-13T12:00:00.000Z',
        },
      ]).map((position) => position.id),
    ).toEqual(['position-1', 'position-2']);
  });

  it('builds assignment payloads and the complete assignment timeline', () => {
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
        assignments: [
          {
            id: 'assignment-1', companyId: 'company-1', employeeId: 'employee-2',
            scopeNodeId: 'company:company-1', positionId: 'position-1',
            startedAt: '2026-08-13T10:00:00.000Z', endedAt: '2026-08-13T12:00:00.000Z',
            isPrimary: true, createdAt: '2026-08-13T10:00:00.000Z',
            positionName: 'People Lead', scopeNodeName: 'Vimcore',
          },
          {
            id: 'assignment-2', companyId: 'company-1', employeeId: 'employee-2',
            scopeNodeId: 'company:company-1', positionId: 'position-2',
            startedAt: '2026-08-13T12:00:00.000Z', endedAt: null,
            isPrimary: true, createdAt: '2026-08-13T12:00:00.000Z',
            positionName: 'HR Analyst', scopeNodeName: 'Vimcore',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'assignment-2',
        title: 'HR Analyst',
        description: 'Vimcore · 8/13/2026 - Present · Primary',
      },
      {
        id: 'assignment-1',
        title: 'People Lead',
        description: 'Vimcore · 8/13/2026 - 8/13/2026 · Primary',
      },
    ]);
  });
});
