export const nodeManagementScopeTypeValues = [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
] as const;

export type NodeManagementScopeType = (typeof nodeManagementScopeTypeValues)[number];

export const nodeManagementRoleKey = 'node-manager';
export const nodeManagementAssignmentMode = 'subtree_inclusive';
export const nodeManagementBaseMembershipRole = 'company-user';

export type NodeResponsibility = {
  id: string;
  companyId: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  responsibleUserId: string;
  managedRoleKey: typeof nodeManagementRoleKey;
  assignmentMode: typeof nodeManagementAssignmentMode;
  baseMembershipRole: typeof nodeManagementBaseMembershipRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
};

export type NodeManagementGateway = {
  listResponsibilitiesByCompany: (companyId: string) => Promise<NodeResponsibility[]>;
};

export class NodeResponsibilityConflictError extends Error {
  readonly code = 'NODE_RESPONSIBILITY_CONFLICT';

  constructor(message = 'The node already has an active responsible user.') {
    super(message);
    this.name = 'NodeResponsibilityConflictError';
  }
}

export class NodeResponsibilityNotFoundError extends Error {
  readonly code = 'NODE_RESPONSIBILITY_NOT_FOUND';

  constructor(message = 'Node responsibility not found.') {
    super(message);
    this.name = 'NodeResponsibilityNotFoundError';
  }
}

export class NodeManagementScopeMismatchError extends Error {
  readonly code = 'NODE_MANAGEMENT_SCOPE_MISMATCH';

  constructor(message = 'Node responsibility scope metadata is inconsistent.') {
    super(message);
    this.name = 'NodeManagementScopeMismatchError';
  }
}
