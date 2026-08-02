import {
  companyLifecycleValues,
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
  const resolveActiveCompany = async (
    userId: string,
    memberships: AuthSession['memberships'],
  ): Promise<AuthSession['activeCompany']> => {
    const companyMemberships = memberships.filter(
      (membership): membership is typeof membership & { companyId: string } =>
        membership.companyId !== null,
    );

    if (companyMemberships.length === 0) {
      return null;
    }

    const savedCompanyId = await authIdentityGateway.findActiveCompanyId(userId);
    const savedMembership = savedCompanyId
      ? companyMemberships.find((membership) => membership.companyId === savedCompanyId)
      : undefined;
    const selectedCompanyId =
      savedMembership?.companyId ??
      (companyMemberships.length === 1 ? companyMemberships[0]?.companyId : null);

    if (!selectedCompanyId) {
      return null;
    }

    const status = await authIdentityGateway.findCompanyStatus(selectedCompanyId);

    return {
      companyId: selectedCompanyId,
      status: companyLifecycleValues.includes(status) ? status : 'active',
    };
  };

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
        activeCompany: null,
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

    const memberships = await authIdentityGateway.listMemberships(user.id);

    return {
      user: toPublicAuthUser(user),
      memberships,
      activeCompany: await resolveActiveCompany(user.id, memberships),
    };
  };
};
