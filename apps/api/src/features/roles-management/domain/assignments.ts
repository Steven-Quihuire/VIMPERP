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

export const permissionScopeKindValues = [
  'company',
  'node+descendants',
  'direct_reports',
  'self',
] as const;

export type PermissionScopeKind = (typeof permissionScopeKindValues)[number];

export type PermissionScope =
  | { kind: 'company' }
  | { kind: 'node+descendants'; scope: ScopeRef }
  | { kind: 'direct_reports' }
  | { kind: 'self' };

export type ReportingLinePermissionScope = Extract<
  PermissionScope,
  { kind: 'direct_reports' | 'self' }
>;

export type ReportingLineScopeResult = {
  employeeIds: string[];
  permissionKeys: string[];
};

export const assignmentModeValues = ['subtree_inclusive', 'exact_node'] as const;

export type AssignmentMode = (typeof assignmentModeValues)[number];

export type RoleAssignment = {
  id: string;
  companyId: string;
  userId: string;
  roleId: string;
  mode: AssignmentMode;
  scopeType: ScopeType;
  scopeId: string;
  createdAt: Date;
};

export type RoleAssignmentsGateway = {
  createAssignment: (input: {
    companyId: string;
    userId: string;
    roleId: string;
    mode?: AssignmentMode;
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

export type EvaluateReportingLineScopes = (input: {
  companyId: string;
  userId: string;
  currentContext: ReportingLinePermissionScope;
}) => Promise<ReportingLineScopeResult>;

export const resolveReportingLineScopeEmployeeIds = (input: {
  actorEmployeeId: string;
  directReportEmployeeIds: string[];
  scope: ReportingLinePermissionScope;
}) => {
  if (input.scope.kind === 'self') {
    return [input.actorEmployeeId];
  }

  return [...new Set(input.directReportEmployeeIds)];
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
