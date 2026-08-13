import {
  companyLifecycleValues,
  createSeedAdminMemberships,
  createSeedAdminUser,
  deriveAuthCapabilities,
  InvalidSessionError,
  type AuthIdentityGateway,
  type AuthSession,
  toPublicAuthUser,
} from '../domain/auth';
import type {
  ScopeRef,
  ScopeResolver,
} from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

type CreateResolveAuthSessionInput = {
  authIdentityGateway: AuthIdentityGateway;
  scopeResolver: ScopeResolver;
  seedAdminSessions?: Map<string, Date>;
  now?: () => Date;
  seedAdminEnabled: boolean;
};

const toScopeRef = (scopeNodeId: string): ScopeRef | null => {
  const separatorIndex = scopeNodeId.indexOf(':');

  if (separatorIndex === -1) {
    return null;
  }

  return {
    scopeType: scopeNodeId.slice(0, separatorIndex) as ScopeRef['scopeType'],
    scopeId: scopeNodeId.slice(separatorIndex + 1),
  };
};

export const createResolveAuthSession = ({
  authIdentityGateway,
  scopeResolver,
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

  const isAuthorizedScope = async (
    userId: string,
    activeCompany: NonNullable<AuthSession['activeCompany']>,
    scope: ScopeRef,
  ) => {
    try {
      return await scopeResolver.isAuthorized(activeCompany.companyId, userId, scope);
    } catch {
      return false;
    }
  };

  const resolveActiveScope = async (
    userId: string,
    activeCompany: AuthSession['activeCompany'],
  ): Promise<ScopeRef | null> => {
    if (!activeCompany) {
      return null;
    }

    const savedScopeNodeId = await authIdentityGateway.findActiveScopeNodeId(userId);

    if (savedScopeNodeId) {
      const savedScope = toScopeRef(savedScopeNodeId);

      if (
        savedScope &&
        (await isAuthorizedScope(userId, activeCompany, savedScope))
      ) {
        return savedScope;
      }
    }

    const savedLocalId = await authIdentityGateway.findActiveLocalId(userId);

    const resolveSingleAuthorizedScope = async () => {
      const authorizedScopes = await scopeResolver.listAuthorizedDescendants(
        activeCompany.companyId,
        userId,
      );

      return authorizedScopes.length === 1 ? authorizedScopes[0]?.ref ?? null : null;
    };

    if (!savedLocalId) {
      return await resolveSingleAuthorizedScope();
    }

    const localCompanyId = await authIdentityGateway.findLocalCompanyById(
      savedLocalId,
    );

    if (!localCompanyId || localCompanyId !== activeCompany.companyId) {
      return null;
    }

    const fallbackScope: ScopeRef = {
      scopeType: 'local',
      scopeId: savedLocalId,
    };

    return (await isAuthorizedScope(userId, activeCompany, fallbackScope))
      ? fallbackScope
      : await resolveSingleAuthorizedScope();
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
        activeScope: null,
        activeLocalId: null,
        capabilities: [],
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

    const activeCompany = await resolveActiveCompany(user.id, memberships);
    const activeScope = await resolveActiveScope(user.id, activeCompany);

    return {
      user: toPublicAuthUser(user),
      memberships,
      activeCompany,
      activeScope,
      activeLocalId:
        activeScope?.scopeType === 'local' ? activeScope.scopeId : null,
      capabilities: deriveAuthCapabilities({ memberships, activeCompany }),
    };
  };
};
