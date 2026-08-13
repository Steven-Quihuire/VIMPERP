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

export type NodeResponsibilityRecord = NodeResponsibility & {
  scopeName: string;
  responsibleUserEmail: string;
  responsibleUsername: string;
};

export type NodeResponsibilityState = {
  companyId: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  activeResponsibility: NodeResponsibilityRecord | null;
  responsibilities: NodeResponsibilityRecord[];
};

export type PendingNodeManagementInvitation = {
  id: string;
  companyId: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  inviteeEmail: string;
  createdAt: Date;
  expiresAt: Date;
};

export type NodeManagementInvitation = {
  id: string;
  companyId: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  inviteeEmail: string;
  tokenHash: string;
  managedRoleKey: typeof nodeManagementRoleKey;
  baseMembershipRole: typeof nodeManagementBaseMembershipRole;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
};

export type NodeManagementInvitationStatus = 'pending' | 'accepted' | 'expired';

export type NodeManagementInvitationDetails = {
  id: string;
  companyId: string;
  companyName: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  inviteeEmail: string;
  managedRoleKey: typeof nodeManagementRoleKey;
  baseMembershipRole: typeof nodeManagementBaseMembershipRole;
  expiresAt: Date;
  status: NodeManagementInvitationStatus;
};

export type NodeManagementUserAccount = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
};

export type NodeManagementMembership = {
  companyId: string | null;
  role: 'platform-admin' | 'company-owner' | 'company-user';
  divisionId: string | null;
  localId: string | null;
};

export type NodeManagementGateway = {
  listResponsibilitiesByCompany: (companyId: string) => Promise<NodeResponsibilityRecord[]>;
  listPendingInvitationsByCompany: (
    companyId: string,
    now: Date,
  ) => Promise<PendingNodeManagementInvitation[]>;
  getResponsibilityState: (input: {
    companyId: string;
    scopeType: NodeManagementScopeType;
    scopeId: string;
  }) => Promise<NodeResponsibilityState | null>;
  findScopeNode: (input: {
    companyId: string;
    scopeType: NodeManagementScopeType;
    scopeId: string;
  }) => Promise<{
    scopeNodeId: string;
    scopeName: string;
    companyName: string;
  } | null>;
  createInvitation: (input: {
    id: string;
    companyId: string;
    scopeNodeId: string;
    scopeType: NodeManagementScopeType;
    scopeId: string;
    inviteeEmail: string;
    tokenHash: string;
    createdByUserId: string;
    expiresAt: Date;
  }) => Promise<NodeManagementInvitation>;
  findInvitationByTokenHash: (
    tokenHash: string,
  ) => Promise<NodeManagementInvitation | null>;
  getInvitationDetailsByTokenHash: (
    tokenHash: string,
    now: Date,
  ) => Promise<NodeManagementInvitationDetails | null>;
  findUserByEmail: (email: string) => Promise<NodeManagementUserAccount | null>;
  findUserByIdentifier: (identifier: string) => Promise<NodeManagementUserAccount | null>;
  findUserMemberships: (userId: string) => Promise<NodeManagementMembership[]>;
  acceptInvitation: (input: {
    invitationId: string;
    acceptedAt: Date;
    acceptedByUserId: string;
    user:
      | {
          id: string;
          email: string;
          username: string;
          passwordHash: string;
        }
      | null;
    session: {
      token: string;
      userId: string;
      expiresAt: Date;
    };
    ensureCompanyUserMembership: boolean;
    companyId: string;
  }) => Promise<void>;
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

export class NodeManagementScopeNotFoundError extends Error {
  readonly code = 'NODE_MANAGEMENT_SCOPE_NOT_FOUND';

  constructor(message = 'Scope node not found for this company.') {
    super(message);
    this.name = 'NodeManagementScopeNotFoundError';
  }
}

export class NodeManagementInvitationNotFoundError extends Error {
  readonly code = 'NODE_MANAGEMENT_INVITATION_NOT_FOUND';

  constructor(message = 'Invitation not found.') {
    super(message);
    this.name = 'NodeManagementInvitationNotFoundError';
  }
}

export class NodeManagementInvitationExpiredError extends Error {
  readonly code = 'NODE_MANAGEMENT_INVITATION_EXPIRED';

  constructor(message = 'Invitation expired.') {
    super(message);
    this.name = 'NodeManagementInvitationExpiredError';
  }
}

export class NodeManagementInvitationAlreadyAcceptedError extends Error {
  readonly code = 'NODE_MANAGEMENT_INVITATION_ALREADY_ACCEPTED';

  constructor(message = 'Invitation already accepted.') {
    super(message);
    this.name = 'NodeManagementInvitationAlreadyAcceptedError';
  }
}

export class NodeManagementInvitationPasswordRequiredError extends Error {
  readonly code = 'NODE_MANAGEMENT_INVITATION_PASSWORD_REQUIRED';

  constructor(message = 'Password is required to activate this invitation.') {
    super(message);
    this.name = 'NodeManagementInvitationPasswordRequiredError';
  }
}
