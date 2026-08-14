export type ErpAccessLink = {
  id: string;
  companyId: string;
  employeeId: string;
  userId: string;
  isActive: boolean;
  createdAt: Date;
  revokedAt: Date | null;
};

export class ErpAccessLinkConflictError extends Error {
  readonly code = 'HR_ERP_ACCESS_LINK_CONFLICT';

  constructor(message = 'The employee or user already has active ERP access in this company.') {
    super(message);
    this.name = 'ErpAccessLinkConflictError';
  }
}

export class ErpAccessLinkNotFoundError extends Error {
  readonly code = 'HR_ERP_ACCESS_LINK_NOT_FOUND';

  constructor(message = 'Active ERP access link not found.') {
    super(message);
    this.name = 'ErpAccessLinkNotFoundError';
  }
}

export const assertNoAmbiguousActiveErpAccessLink = (input: {
  employeeId: string;
  userId: string;
  activeEmployeeLink: ErpAccessLink | null;
  activeUserLink: ErpAccessLink | null;
}) => {
  if (input.activeEmployeeLink && input.activeEmployeeLink.userId !== input.userId) {
    throw new ErpAccessLinkConflictError(
      'The employee already has active ERP access for a different user.',
    );
  }

  if (input.activeUserLink && input.activeUserLink.employeeId !== input.employeeId) {
    throw new ErpAccessLinkConflictError(
      'The user already has active ERP access for a different employee.',
    );
  }
};
