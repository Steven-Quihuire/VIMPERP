export const authRoleValues = [
  'platform-admin',
  'company-owner',
  'company-user',
] as const;

export type AuthRole = (typeof authRoleValues)[number];

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
};

export type PublicAuthUser = Omit<AuthUser, 'passwordHash'>;

export type AuthMembership = {
  companyId: string | null;
  role: AuthRole;
  divisionId: string | null;
  localId: string | null;
};

export type SwitchActiveLocalInput = {
  localId: string | null;
};

export type SwitchActiveScopeInput = {
  scope: import('../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port').ScopeRef | null;
};

export const companyLifecycleValues = [
  'active',
  'suspended',
  'provisioning_failed',
] as const;

export type CompanyLifecycle = (typeof companyLifecycleValues)[number];

export type ActiveCompany = {
  companyId: string;
  status: CompanyLifecycle;
};

export const authCapabilityValues = [
  'catalog.read',
  'catalog.write',
  'catalog.delete',
] as const;

export type AuthCapability = (typeof authCapabilityValues)[number];

export type AuthSessionRecord = {
  token: string;
  userId: string;
  expiresAt: Date;
};

export type AuthSession = {
  user: PublicAuthUser;
  memberships: AuthMembership[];
  activeCompany: ActiveCompany | null;
  activeScope: import('../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port').ScopeRef | null;
  activeLocalId: string | null;
  capabilities: AuthCapability[];
};

export type AuthIdentityGateway = {
  findUserByIdentifier: (identifier: string) => Promise<AuthUser | null>;
  findUserById: (userId: string) => Promise<AuthUser | null>;
  createUser: (user: AuthUser) => Promise<void>;
  createUserWithSession: (
    user: AuthUser,
    session: AuthSessionRecord,
  ) => Promise<void>;
  createSession: (session: AuthSessionRecord) => Promise<void>;
  findSession: (token: string) => Promise<AuthSessionRecord | null>;
  deleteSession: (token: string) => Promise<void>;
  listMemberships: (userId: string) => Promise<AuthMembership[]>;
  findActiveCompanyId: (userId: string) => Promise<string | null>;
  findCompanyStatus: (companyId: string) => Promise<CompanyLifecycle>;
  setActiveCompanyId: (userId: string, companyId: string) => Promise<void>;
  findActiveScopeNodeId: (userId: string) => Promise<string | null>;
  setActiveScopeNodeId: (userId: string, scopeNodeId: string | null) => Promise<void>;
  findActiveLocalId: (userId: string) => Promise<string | null>;
  setActiveLocalId: (userId: string, localId: string | null) => Promise<void>;
  findLocalCompanyById: (localId: string) => Promise<string | null>;
  countRecentActiveCompanySwitches: (userId: string, since: Date) => Promise<number>;
  recordActiveCompanySwitch: (input: {
    userId: string;
    companyId: string;
    correlationId: string;
  }) => Promise<void>;
};

export type PasswordHasher = {
  hash: (value: string) => Promise<string>;
  verify: (hash: string, value: string) => Promise<boolean>;
};

export type SessionTokenService = {
  create: () => string;
};

export class UnauthorizedError extends Error {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Invalid credentials') {
    super(message);
  }
}

export class InvalidSessionError extends Error {
  readonly code = 'UNAUTHORIZED';

  constructor(message = 'Invalid session') {
    super(message);
  }
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN';

  constructor(message = 'Forbidden') {
    super(message);
  }
}

export class TooManyRequestsError extends Error {
  readonly code = 'TOO_MANY_REQUESTS';

  constructor(message = 'Too many requests') {
    super(message);
  }
}

export class DuplicateIdentityError extends Error {
  readonly code = 'AUTH_CONFLICT';

  constructor(message = 'El correo o empresa ingresada ya se encuentra registrada') {
    super(message);
  }
}

export const hasAuthCapability = (
  capabilities: readonly AuthCapability[],
  capability: AuthCapability,
) => capabilities.includes(capability);

export const deriveAuthCapabilities = (input: {
  memberships: AuthMembership[];
  activeCompany: ActiveCompany | null;
}): AuthCapability[] => {
  if (!input.activeCompany) {
    return [];
  }

  const activeMembership = input.memberships.find(
    (membership): membership is AuthMembership & { companyId: string } =>
      membership.companyId === input.activeCompany?.companyId,
  );

  if (!activeMembership) {
    return [];
  }

  switch (activeMembership.role) {
    case 'company-owner':
      return ['catalog.read', 'catalog.write', 'catalog.delete'];
    case 'company-user':
      return ['catalog.read', 'catalog.write'];
    default:
      return [];
  }
};

export const requireTenantCapability = (
  auth: AuthSession,
  capability: AuthCapability,
): { companyId: string; status: CompanyLifecycle; capabilities: AuthCapability[] } => {
  if (!auth.activeCompany) {
    throw new ForbiddenError('Active company required');
  }

  if (auth.activeCompany.status !== 'active') {
    throw new ForbiddenError('Company access unavailable');
  }

  if (!hasAuthCapability(auth.capabilities, capability)) {
    throw new ForbiddenError();
  }

  return {
    companyId: auth.activeCompany.companyId,
    status: auth.activeCompany.status,
    capabilities: auth.capabilities,
  };
};

export const toPublicAuthUser = (user: AuthUser): PublicAuthUser => ({
  id: user.id,
  email: user.email,
  username: user.username,
});

export const seedAdminUserId = 'seed-admin';

export const createSeedAdminUser = (): AuthUser => ({
  id: seedAdminUserId,
  email: 'admin@bootstrap.local',
  username: 'admin',
  passwordHash: 'seed-admin',
});

export const createSeedAdminMemberships = (): AuthMembership[] => [
  { companyId: null, role: 'platform-admin', divisionId: null, localId: null },
];
