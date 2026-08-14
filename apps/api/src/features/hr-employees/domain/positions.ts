export type Position = {
  id: string;
  companyId: string;
  name: string;
  reportsToPositionId: string | null;
  headcount: number;
  occupiedHeadcount: number;
  remainingVacancies: number;
  isActive: boolean;
  createdAt: Date;
};

export const assertValidPositionHierarchy = (input: {
  positionId: string;
  reportsToPositionId: string | null;
}) => {
  if (input.reportsToPositionId !== null && input.reportsToPositionId === input.positionId) {
    throw new PositionHierarchyError();
  }
};

export const calculatePositionVacancy = (input: {
  headcount: number;
  activePrimaryAssignments: number;
}) => {
  if (input.activePrimaryAssignments > input.headcount) {
    throw new PositionHeadcountExceededError();
  }

  return {
    occupiedHeadcount: input.activePrimaryAssignments,
    remainingVacancies: input.headcount - input.activePrimaryAssignments,
  };
};

export class PositionHierarchyError extends Error {
  readonly code = 'HR_POSITION_HIERARCHY_INVALID';

  constructor(message = 'A position cannot report to itself.') {
    super(message);
    this.name = 'PositionHierarchyError';
  }
}

export class PositionHeadcountExceededError extends Error {
  readonly code = 'HR_POSITION_HEADCOUNT_EXCEEDED';

  constructor(message = 'Active staffing cannot exceed position headcount.') {
    super(message);
    this.name = 'PositionHeadcountExceededError';
  }
}

export class PositionNotFoundError extends Error {
  readonly code = 'HR_POSITION_NOT_FOUND';

  constructor(message = 'Position not found.') {
    super(message);
    this.name = 'PositionNotFoundError';
  }
}

export class PositionParentNotFoundError extends Error {
  readonly code = 'HR_POSITION_PARENT_NOT_FOUND';

  constructor(message = 'The reporting position does not exist in this company.') {
    super(message);
    this.name = 'PositionParentNotFoundError';
  }
}
