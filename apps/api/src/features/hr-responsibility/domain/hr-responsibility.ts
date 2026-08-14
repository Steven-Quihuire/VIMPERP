export const hrResponsibleRoleKey = 'hr-responsible';
export const hrResponsibilityInvitationPurpose = 'hr-responsible';

export type HrResponsibleUser = {
  userId: string;
  email: string;
  username: string;
};

export type PendingHrResponsibilityInvitation = {
  id: string;
  companyId: string;
  inviteeEmail: string;
  createdAt: Date;
  expiresAt: Date;
};

export type HrResponsibilityInvitation = PendingHrResponsibilityInvitation & {
  tokenHash: string;
  purpose: typeof hrResponsibilityInvitationPurpose;
  roleKey: typeof hrResponsibleRoleKey;
  createdByUserId: string;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
};

export type HrResponsibilityInvitationDetails = {
  id: string;
  companyId: string;
  companyName: string;
  inviteeEmail: string;
  purpose: typeof hrResponsibilityInvitationPurpose;
  roleKey: typeof hrResponsibleRoleKey;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
};

export type HrResponsibilityUserAccount = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
};

export type HrResponsibilityMembership = {
  companyId: string | null;
  role: 'platform-admin' | 'company-owner' | 'company-user';
  divisionId: string | null;
  localId: string | null;
};

export type HrResponsibilityGateway = {
  listCompanyUsers: (companyId: string) => Promise<HrResponsibleUser[]>;
  listResponsibilities: (companyId: string) => Promise<HrResponsibleUser[]>;
  assignResponsibility: (input: {
    companyId: string;
    userId: string;
  }) => Promise<HrResponsibleUser>;
  findCompany: (
    companyId: string,
  ) => Promise<{ id: string; name: string } | null>;
  findActiveInvitation: (input: {
    companyId: string;
    inviteeEmail: string;
    now: Date;
  }) => Promise<HrResponsibilityInvitation | null>;
  createInvitation: (input: {
    id: string;
    companyId: string;
    inviteeEmail: string;
    tokenHash: string;
    createdByUserId: string;
    expiresAt: Date;
  }) => Promise<HrResponsibilityInvitation>;
  listPendingInvitations: (
    companyId: string,
    now: Date,
  ) => Promise<PendingHrResponsibilityInvitation[]>;
  findInvitationByTokenHash: (
    tokenHash: string,
  ) => Promise<HrResponsibilityInvitation | null>;
  getInvitationDetailsByTokenHash: (
    tokenHash: string,
    now: Date,
  ) => Promise<HrResponsibilityInvitationDetails | null>;
  findUserByEmail: (
    email: string,
  ) => Promise<HrResponsibilityUserAccount | null>;
  findUserByIdentifier: (
    identifier: string,
  ) => Promise<HrResponsibilityUserAccount | null>;
  findUserMemberships: (
    userId: string,
  ) => Promise<HrResponsibilityMembership[]>;
  acceptInvitation: (input: {
    invitationId: string;
    acceptedAt: Date;
    acceptedByUserId: string;
    user: {
      id: string;
      email: string;
      username: string;
      passwordHash: string;
    } | null;
    session: { token: string; userId: string; expiresAt: Date };
    ensureCompanyUserMembership: boolean;
    companyId: string;
  }) => Promise<void>;
};

export class HrResponsibleUserNotFoundError extends Error {
  readonly code = 'HR_RESPONSIBLE_USER_NOT_FOUND';

  constructor(message = 'The user must belong to the company.') {
    super(message);
    this.name = 'HrResponsibleUserNotFoundError';
  }
}

export class HrResponsibilityCompanyNotFoundError extends Error {
  readonly code = 'HR_RESPONSIBILITY_COMPANY_NOT_FOUND';
}

export class HrResponsibilityInvitationNotFoundError extends Error {
  readonly code = 'HR_RESPONSIBILITY_INVITATION_NOT_FOUND';
}

export class HrResponsibilityInvitationExpiredError extends Error {
  readonly code = 'HR_RESPONSIBILITY_INVITATION_EXPIRED';
}

export class HrResponsibilityInvitationAlreadyAcceptedError extends Error {
  readonly code = 'HR_RESPONSIBILITY_INVITATION_ACCEPTED';
}

export class HrResponsibilityInvitationPasswordRequiredError extends Error {
  readonly code = 'HR_RESPONSIBILITY_INVITATION_PASSWORD_REQUIRED';
}

export class HrResponsibilityInvitationDuplicateError extends Error {
  readonly code = 'HR_RESPONSIBILITY_INVITATION_DUPLICATE';
}

export class HrResponsibleAlreadyAssignedError extends Error {
  readonly code = 'HR_RESPONSIBLE_ALREADY_ASSIGNED';
}
