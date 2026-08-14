export type EmployeeAssignment = {
  id: string;
  companyId: string;
  employeeId: string;
  scopeNodeId: string;
  positionId: string;
  startedAt: Date;
  endedAt: Date | null;
  isPrimary: boolean;
  createdAt: Date;
};

export type EmployeeAssignmentHistory = EmployeeAssignment & {
  positionName: string;
  scopeNodeName: string;
};

export class EmployeeAssignmentConflictError extends Error {
  readonly code = 'HR_EMPLOYEE_ASSIGNMENT_CONFLICT';

  constructor(message = 'The employee already has an equivalent active primary assignment.') {
    super(message);
    this.name = 'EmployeeAssignmentConflictError';
  }
}

export class EmployeeAssignmentValidationError extends Error {
  readonly code = 'HR_EMPLOYEE_ASSIGNMENT_VALIDATION';

  constructor(message = 'The assignment dates are invalid.') {
    super(message);
    this.name = 'EmployeeAssignmentValidationError';
  }
}
