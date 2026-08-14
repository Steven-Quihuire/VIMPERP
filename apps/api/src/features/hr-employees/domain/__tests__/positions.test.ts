import { describe, expect, it } from 'vitest';

import {
  PositionHeadcountExceededError,
  PositionHierarchyError,
  assertValidPositionHierarchy,
  calculatePositionVacancy,
} from '../positions';

describe('hr employee positions domain', () => {
  it('allows a top-of-hierarchy position without a parent', () => {
    expect(
      assertValidPositionHierarchy({
        positionId: 'position-1',
        reportsToPositionId: null,
      }),
    ).toBeUndefined();
  });

  it('rejects a position that reports to itself', () => {
    expect(() =>
      assertValidPositionHierarchy({
        positionId: 'position-1',
        reportsToPositionId: 'position-1',
      }),
    ).toThrow(PositionHierarchyError);
  });

  it('exposes occupied headcount and remaining vacancies from active staffing', () => {
    expect(calculatePositionVacancy({ headcount: 3, activePrimaryAssignments: 2 })).toEqual({
      occupiedHeadcount: 2,
      remainingVacancies: 1,
    });
  });

  it('rejects staffing that exceeds headcount', () => {
    expect(() =>
      calculatePositionVacancy({ headcount: 1, activePrimaryAssignments: 2 }),
    ).toThrow(PositionHeadcountExceededError);
  });
});
