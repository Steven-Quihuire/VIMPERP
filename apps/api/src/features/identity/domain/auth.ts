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
};

export type AuthSessionRecord = {
  token: string;
  userId: string;
  expiresAt: Date;
};

export type AuthSession = {
  user: PublicAuthUser;
  memberships: AuthMembership[];
};

export type AuthIdentityGateway = {
  findUserByIdentifier: (identifier: string) => Promise<AuthUser | null>;
  findUserById: (userId: string) => Promise<AuthUser | null>;
  createSession: (session: AuthSessionRecord) => Promise<void>;
  findSession: (token: string) => Promise<AuthSessionRecord | null>;
  deleteSession: (token: string) => Promise<void>;
  listMemberships: (userId: string) => Promise<AuthMembership[]>;
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
  { companyId: null, role: 'platform-admin' },
];
