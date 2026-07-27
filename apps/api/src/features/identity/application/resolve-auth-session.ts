import {
  createSeedAdminMemberships,
  createSeedAdminUser,
  InvalidSessionError,
  type AuthIdentityGateway,
  type AuthSession,
  toPublicAuthUser,
} from '../domain/auth';

type CreateResolveAuthSessionInput = {
  authIdentityGateway: AuthIdentityGateway;
  seedAdminSessions?: Map<string, Date>;
  now?: () => Date;
  seedAdminEnabled: boolean;
};

export const createResolveAuthSession = ({
  authIdentityGateway,
  seedAdminSessions,
  now = () => new Date(),
  seedAdminEnabled,
}: CreateResolveAuthSessionInput) => {
  return async (token: string | null | undefined): Promise<AuthSession> => {
    if (!token) {
      throw new InvalidSessionError();
    }

    const seedSessionExpiry = seedAdminSessions?.get(token);

    if (seedAdminEnabled && seedSessionExpiry) {
      if (seedSessionExpiry <= now()) {
        seedAdminSessions?.delete(token);
        throw new InvalidSessionError();
      }

      return {
        user: toPublicAuthUser(createSeedAdminUser()),
        memberships: createSeedAdminMemberships(),
      };
    }

    const sessionRecord = await authIdentityGateway.findSession(token);

    if (!sessionRecord || sessionRecord.expiresAt <= now()) {
      throw new InvalidSessionError();
    }
    const user = await authIdentityGateway.findUserById(sessionRecord.userId);

    if (!user) {
      throw new InvalidSessionError();
    }

    return {
      user: toPublicAuthUser(user),
      memberships: await authIdentityGateway.listMemberships(user.id),
    };
  };
};
