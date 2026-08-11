export const scopeTypeValues = [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
] as const;

export type ScopeType = (typeof scopeTypeValues)[number];

export type ScopeRef = {
  scopeType: ScopeType;
  scopeId: string;
};

export type RoleAssignment = {
  id: string;
  companyId: string;
  userId: string;
  roleId: string;
  scopeType: ScopeType;
  scopeId: string;
  createdAt: Date;
};

export type RoleAssignmentsGateway = {
  createAssignment: (input: {
    companyId: string;
    userId: string;
    roleId: string;
    scopeType: ScopeType;
    scopeId: string;
  }) => Promise<RoleAssignment>;
  deleteAssignment: (assignmentId: string) => Promise<void>;
  findAssignmentById: (assignmentId: string) => Promise<RoleAssignment | null>;
  listAssignmentsForUser: (input: {
    companyId: string;
    userId: string;
  }) => Promise<RoleAssignment[]>;
  countAssignmentsForRole: (roleId: string) => Promise<number>;
};

export type ScopeHierarchyGateway = {
  assertScopeRefBelongsToCompany: (
    companyId: string,
    scope: ScopeRef,
  ) => Promise<void>;
  getScopeLineage: (companyId: string, scope: ScopeRef) => Promise<ScopeRef[]>;
};

export class RoleAssignmentConflictError extends Error {
  readonly code = 'ROLE_ASSIGNMENT_CONFLICT';

  constructor(message = 'The role assignment already exists for this scope.') {
    super(message);
    this.name = 'RoleAssignmentConflictError';
  }
}

export class RoleAssignmentNotFoundError extends Error {
  readonly code = 'ROLE_ASSIGNMENT_NOT_FOUND';

  constructor(message = 'Role assignment not found') {
    super(message);
    this.name = 'RoleAssignmentNotFoundError';
  }
}

export class ScopeRefDanglingError extends Error {
  readonly code = 'SCOPE_REF_DANGLING';

  constructor(message = 'The requested scope reference does not exist in the company.') {
    super(message);
    this.name = 'ScopeRefDanglingError';
  }
}
