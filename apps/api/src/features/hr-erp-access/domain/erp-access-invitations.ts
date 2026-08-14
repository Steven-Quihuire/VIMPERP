import type { Employee } from '../../hr-employees/domain/employees';
import type { ErpAccessLink } from './erp-access-links';

export type ErpAccessInvitation = {
  id: string;
  companyId: string;
  employeeId: string;
  inviteeEmail: string;
  tokenHash: string;
  createdByUserId: string;
  createdAt: Date;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedByUserId: string | null;
};

export type PendingErpAccessInvitation = {
  id: string;
  companyId: string;
  employeeId: string;
  inviteeEmail: string;
  createdAt: Date;
  expiresAt: Date;
};

export type ErpAccessUserAccount = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
};

export type ErpAccessMembership = {
  userId: string;
  companyId: string | null;
  role: 'platform-admin' | 'company-owner' | 'company-user';
  divisionId: string | null;
  localId: string | null;
};

export type ErpAccessGateway = {
  getEmployeeById: (companyId: string, employeeId: string) => Promise<Employee | null>;
  createInvitation: (input: {
    id: string;
    companyId: string;
    employeeId: string;
    inviteeEmail: string;
    tokenHash: string;
    createdByUserId: string;
    expiresAt: Date;
  }) => Promise<ErpAccessInvitation>;
  listPendingInvitationsByCompany: (
    companyId: string,
    now: Date,
  ) => Promise<PendingErpAccessInvitation[]>;
  findInvitationByTokenHash: (tokenHash: string) => Promise<ErpAccessInvitation | null>;
  findUserByEmail: (email: string) => Promise<ErpAccessUserAccount | null>;
  findUserByIdentifier: (identifier: string) => Promise<ErpAccessUserAccount | null>;
  findUserMemberships: (userId: string) => Promise<ErpAccessMembership[]>;
  getActiveLinkByEmployeeId: (
    companyId: string,
    employeeId: string,
  ) => Promise<ErpAccessLink | null>;
  getActiveLinkByUserId: (companyId: string, userId: string) => Promise<ErpAccessLink | null>;
  acceptInvitation: (input: {
    invitationId: string;
    acceptedAt: Date;
    acceptedByUserId: string;
    employeeId: string;
    companyId: string;
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
  }) => Promise<void>;
  revokeAccess: (input: {
    companyId: string;
    employeeId: string;
    revokedAt: Date;
  }) => Promise<void>;
};

export class ErpAccessInvitationNotFoundError extends Error {
  readonly code = 'HR_ERP_ACCESS_INVITATION_NOT_FOUND';

  constructor(message = 'ERP access invitation not found.') {
    super(message);
    this.name = 'ErpAccessInvitationNotFoundError';
  }
}

export class ErpAccessInvitationExpiredError extends Error {
  readonly code = 'HR_ERP_ACCESS_INVITATION_EXPIRED';

  constructor(message = 'ERP access invitation has expired.') {
    super(message);
    this.name = 'ErpAccessInvitationExpiredError';
  }
}

export class ErpAccessInvitationAlreadyAcceptedError extends Error {
  readonly code = 'HR_ERP_ACCESS_INVITATION_ACCEPTED';

  constructor(message = 'ERP access invitation has already been accepted.') {
    super(message);
    this.name = 'ErpAccessInvitationAlreadyAcceptedError';
  }
}

export class ErpAccessInvitationPasswordRequiredError extends Error {
  readonly code = 'HR_ERP_ACCESS_INVITATION_PASSWORD_REQUIRED';

  constructor(message = 'Password is required to activate this ERP access invitation.') {
    super(message);
    this.name = 'ErpAccessInvitationPasswordRequiredError';
  }
}
