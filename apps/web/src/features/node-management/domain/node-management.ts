export const nodeManagementScopeTypeValues = [
  'company',
  'division',
  'local',
  'area',
  'warehouse',
  'point-of-sale',
] as const;

export type NodeManagementScopeType =
  (typeof nodeManagementScopeTypeValues)[number];

export type NodeResponsibilityRecord = {
  id: string;
  companyId: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  responsibleUserId: string;
  responsibleUserEmail: string;
  responsibleUsername: string;
  managedRoleKey: 'node-manager';
  assignmentMode: 'subtree_inclusive';
  baseMembershipRole: 'company-user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export type PendingNodeManagementInvitation = {
  id: string;
  companyId: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  inviteeEmail: string;
  createdAt: string;
  expiresAt: string;
};

export type CreateNodeManagementInvitationInput = {
  companyId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  inviteeEmail: string;
};

export type CreatedNodeManagementInvitation = {
  invitationId: string;
  invitationToken: string;
  inviteeEmail: string;
  companyId: string;
  companyName: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  expiresAt: string;
};

export type NodeManagementInvitationDetails = {
  id: string;
  companyId: string;
  companyName: string;
  scopeNodeId: string;
  scopeType: NodeManagementScopeType;
  scopeId: string;
  scopeName: string;
  inviteeEmail: string;
  managedRoleKey: 'node-manager';
  baseMembershipRole: 'company-user';
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
  userExists: boolean;
};

export type AcceptNodeManagementInvitationInput = {
  token: string;
  password?: string;
};

export type NodeResponsibilityStatus = 'empty' | 'pending' | 'active';

export type NodeResponsibilitySummary = {
  status: NodeResponsibilityStatus;
  badgeLabel: string;
  detail: string;
};

export type NodeManagementGateway = {
  listResponsibilities: (companyId: string) => Promise<NodeResponsibilityRecord[]>;
  listPendingInvitations: (
    companyId: string,
  ) => Promise<PendingNodeManagementInvitation[]>;
  createInvitation: (
    input: CreateNodeManagementInvitationInput,
  ) => Promise<CreatedNodeManagementInvitation>;
  getInvitation: (token: string) => Promise<NodeManagementInvitationDetails>;
  acceptInvitation: (
    input: AcceptNodeManagementInvitationInput,
  ) => Promise<void>;
};
