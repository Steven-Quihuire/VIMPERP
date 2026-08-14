export type HrResponsibleUser = {
  userId: string;
  email: string;
  username: string;
};

export type HrResponsibilityState = {
  companyId: string;
  hasResponsibles: boolean;
  responsibles: HrResponsibleUser[];
  availableUsers: HrResponsibleUser[];
  pendingInvitations: PendingHrResponsibilityInvitation[];
};

export type PendingHrResponsibilityInvitation = {
  id: string;
  companyId: string;
  inviteeEmail: string;
  createdAt: string;
  expiresAt: string;
};

export type CreatedHrResponsibilityInvitation = {
  invitationId: string;
  invitationToken: string;
  companyId: string;
  inviteeEmail: string;
  expiresAt: string;
  delivery?: { status: 'sent' | 'failed' | 'skipped'; message?: string };
};

export type HrResponsibilityInvitationDetails = {
  id: string;
  companyId: string;
  companyName: string;
  inviteeEmail: string;
  purpose: 'hr-responsible';
  roleKey: 'hr-responsible';
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
  userExists: boolean;
};
