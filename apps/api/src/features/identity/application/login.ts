import {
  createSeedAdminMemberships,
  createSeedAdminUser,
  type AuthIdentityGateway,
  type AuthSession,
  type PasswordHasher,
  type SessionTokenService,
  UnauthorizedError,
  toPublicAuthUser,
} from '../domain/auth';

type LoginInput = {
  identifier: string;
  password: string;
};

type CreateLoginInput = {
  authIdentityGateway: AuthIdentityGateway;
  passwordHasher: PasswordHasher;
  sessionTokenService: SessionTokenService;
  seedAdminSessions?: Map<string, Date>;
  sessionLifetimeMs?: number;
  now?: () => Date;
  seedAdminEnabled: boolean;
};

export const defaultSessionLifetimeMs = 1000 * 60 * 60 * 8;

export const createLogin = ({
  authIdentityGateway,
  passwordHasher,
  sessionTokenService,
  seedAdminSessions,
  sessionLifetimeMs = defaultSessionLifetimeMs,
  now = () => new Date(),
  seedAdminEnabled,
}: CreateLoginInput) => {
  return async ({ identifier, password }: LoginInput): Promise<{ token: string; session: AuthSession }> => {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const isSeedAdminCredential = normalizedIdentifier === 'admin' && password === 'admin';

    if (isSeedAdminCredential && !seedAdminEnabled) {
      throw new UnauthorizedError();
    }

    if (seedAdminEnabled && isSeedAdminCredential) {
      const token = sessionTokenService.create();
      const user = createSeedAdminUser();
      const expiresAt = new Date(now().getTime() + sessionLifetimeMs);

      seedAdminSessions?.set(token, expiresAt);

      return {
        token,
        session: {
          user: toPublicAuthUser(user),
          memberships: createSeedAdminMemberships(),
          activeCompany: null,
        },
      };
    }

    const user = await authIdentityGateway.findUserByIdentifier(normalizedIdentifier);

    if (!user) {
      throw new UnauthorizedError();
    }

    const passwordMatches = await passwordHasher.verify(user.passwordHash, password);

    if (!passwordMatches) {
      throw new UnauthorizedError();
    }

    const token = sessionTokenService.create();
    const memberships = await authIdentityGateway.listMemberships(user.id);

    await authIdentityGateway.createSession({
      token,
      userId: user.id,
      expiresAt: new Date(now().getTime() + sessionLifetimeMs),
    });

    return {
      token,
      session: {
        user: toPublicAuthUser(user),
        memberships,
        activeCompany: null,
      },
    };
  };
};
