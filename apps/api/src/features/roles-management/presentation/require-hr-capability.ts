import type { RequestHandler } from 'express';

import { ForbiddenError, type AuthSession } from '../../identity/domain/auth';
import type { PermissionScope, ScopeRef } from '../domain/assignments';

type ComputeEffectivePermissions = (input: {
  companyId: string;
  userId: string;
  currentContext: ScopeRef;
  permissionScope?: PermissionScope;
}) => Promise<string[]>;

const getAuth = (response: Parameters<RequestHandler>[1]) =>
  (response.locals as { auth: AuthSession }).auth;

const resolveCurrentContext = (auth: AuthSession): ScopeRef => {
  if (auth.activeScope) {
    return auth.activeScope;
  }

  if (!auth.activeCompany) {
    throw new ForbiddenError('Active company required');
  }

  return {
    scopeType: 'company',
    scopeId: auth.activeCompany.companyId,
  };
};

export const createRequireHrCapability = ({
  computeEffectivePermissions,
}: {
  computeEffectivePermissions: ComputeEffectivePermissions;
}) => {
  return (
    permissionKey: string,
    resolvePermissionScope?: (input: {
      request: Parameters<RequestHandler>[0];
      response: Parameters<RequestHandler>[1];
      auth: AuthSession;
    }) => PermissionScope | undefined | Promise<PermissionScope | undefined>,
  ): RequestHandler => {
    return async (request, response, next) => {
      try {
        const auth = getAuth(response);

        if (!auth.activeCompany) {
          throw new ForbiddenError('Active company required');
        }

        if (auth.activeCompany.status !== 'active') {
          throw new ForbiddenError('Company access unavailable');
        }

        const permissionScope = resolvePermissionScope
          ? await resolvePermissionScope({ request, response, auth })
          : undefined;
        const permissionKeys = await computeEffectivePermissions({
          companyId: auth.activeCompany.companyId,
          userId: auth.user.id,
          currentContext: resolveCurrentContext(auth),
          ...(permissionScope ? { permissionScope } : {}),
        });

        if (!permissionKeys.includes(permissionKey)) {
          throw new ForbiddenError();
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  };
};
