import { describe, expect, it } from 'vitest';

import {
  assignmentFormSchema,
  buildAssignmentTimelineEntries,
  toCreateAssignmentInput,
} from '../assignments';
import {
  employeeFormSchema,
  sortEmployeesByCreatedAtDesc,
  toCreateEmployeeInput,
} from '../employees';
import {
  positionFormSchema,
  sortPositionsByName,
  toCreatePositionInput,
} from '../positions';

describe('hr-employees domain helpers', () => {
  it('normalizes employee identity and sorts employees by newest first', () => {
    const employeeValues = employeeFormSchema.parse({
      fullName: ' Ana Employee ',
      email: 'ana@example.com',
      employmentStatus: 'active',
      hiredAt: '2026-08-13',
    });

    expect(toCreateEmployeeInput('company-1', employeeValues)).toMatchObject({
      companyId: 'company-1',
      fullName: 'Ana Employee',
      email: 'ana@example.com',
      employmentStatus: 'active',
    });

    expect(
      sortEmployeesByCreatedAtDesc([
        {
          id: 'employee-1',
          companyId: 'company-1',
          fullName: 'One',
          employmentStatus: 'active',
          documentType: null,
          documentNumber: null,
          email: null,
          hiredAt: null,
          createdAt: '2026-08-13T10:00:00.000Z',
          updatedAt: '2026-08-13T10:00:00.000Z',
        },
        {
          id: 'employee-2',
          companyId: 'company-1',
          fullName: 'Two',
          employmentStatus: 'active',
          documentType: null,
          documentNumber: null,
          email: null,
          hiredAt: null,
          createdAt: '2026-08-13T12:00:00.000Z',
          updatedAt: '2026-08-13T12:00:00.000Z',
        },
      ]).map((employee) => employee.id),
    ).toEqual(['employee-2', 'employee-1']);
  });

  it('detects and derives Ecuadorian employee documents', () => {
    const cedula = employeeFormSchema.parse({
      fullName: 'Cédula Employee',
      documentNumber: '1710034065',
    });
    const ruc = employeeFormSchema.parse({
      fullName: 'RUC Employee',
      documentNumber: '1710034065001',
    });
    const passport = employeeFormSchema.parse({
      fullName: 'Passport Employee',
      documentNumber: 'av1234567',
    });

    expect(toCreateEmployeeInput('company-1', cedula)).toMatchObject({
      documentType: 'cedula',
      documentNumber: '1710034065',
    });
    expect(toCreateEmployeeInput('company-1', ruc)).toMatchObject({
      documentType: 'ruc',
      documentNumber: '1710034065001',
    });
    expect(toCreateEmployeeInput('company-1', passport)).toMatchObject({
      documentType: 'pasaporte',
      documentNumber: 'AV1234567',
    });
    expect(() =>
      employeeFormSchema.parse({
        fullName: 'Invalid Employee',
        documentNumber: '1710034066',
      }),
    ).toThrow('pasaporte válido');
  });

  it('maps the initial assignment fields onto the create payload', () => {
    const parsed = employeeFormSchema.parse({
      fullName: 'Assign Employee',
      documentNumber: '1710034065',
      employmentStatus: 'active',
      hiredAt: '2026-08-13',
      positionId: 'position-1',
      scopeNodeId: 'local:local-1',
      managerId: 'employee-1',
    });

    expect(toCreateEmployeeInput('company-1', parsed)).toMatchObject({
      companyId: 'company-1',
      fullName: 'Assign Employee',
      positionId: 'position-1',
      scopeNodeId: 'local:local-1',
      managerId: 'employee-1',
    });
  });

  it('maps empty initial assignment fields to null', () => {
    const parsed = employeeFormSchema.parse({
      fullName: 'No Assign Employee',
      employmentStatus: 'active',
    });

    expect(toCreateEmployeeInput('company-1', parsed)).toMatchObject({
      positionId: null,
      scopeNodeId: null,
      managerId: null,
    });
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
            id: 'assignment-1',
            companyId: 'company-1',
            employeeId: 'employee-2',
            scopeNodeId: 'company:company-1',
            positionId: 'position-1',
            startedAt: '2026-08-13T10:00:00.000Z',
            endedAt: '2026-08-13T12:00:00.000Z',
            isPrimary: true,
            createdAt: '2026-08-13T10:00:00.000Z',
            positionName: 'People Lead',
            scopeNodeName: 'Vimcore',
          },
          {
            id: 'assignment-2',
            companyId: 'company-1',
            employeeId: 'employee-2',
            scopeNodeId: 'company:company-1',
            positionId: 'position-2',
            startedAt: '2026-08-13T12:00:00.000Z',
            endedAt: null,
            isPrimary: true,
            createdAt: '2026-08-13T12:00:00.000Z',
            positionName: 'HR Analyst',
            scopeNodeName: 'Vimcore',
          },
        ],
      }),
    ).toEqual([
      {
        id: 'assignment-2',
        title: 'HR Analyst',
        description: 'Vimcore · 13/8/2026 - Actual · Principal',
      },
      {
        id: 'assignment-1',
        title: 'People Lead',
        description: 'Vimcore · 13/8/2026 - 13/8/2026 · Principal',
      },
    ]);
  });
});
