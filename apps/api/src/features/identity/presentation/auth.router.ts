import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import type { AuthRole, AuthSession } from '../domain/auth';
import { authCapabilityValues } from '../domain/auth';
import { scopeTypeValues, type ScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

type Login = (input: {
  identifier: string;
  password: string;
}) => Promise<{ token: string; session: AuthSession }>;

type Register = (input: {
  email: string;
  username: string;
  password: string;
}) => Promise<{ token: string; session: AuthSession }>;

type ResolveAuthSession = (token: string | null | undefined) => Promise<AuthSession>;
type Logout = (token: string | null | undefined) => Promise<void>;
type SwitchActiveLocal = (input: {
  userId: string;
  localId: string | null;
}) => Promise<void>;
type SwitchActiveScope = (input: {
  userId: string;
  scope: { scopeType: (typeof scopeTypeValues)[number]; scopeId: string } | null;
}) => Promise<void>;
type FindLocalCompanyById = (localId: string) => Promise<string | null>;

const loginBodySchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const registerBodySchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresa un correo válido.'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'El usuario debe tener al menos 3 caracteres.')
    .regex(/^[a-z0-9._-]+$/, 'El usuario solo puede incluir letras, números, punto, guion y guion bajo.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
});

const authMembershipSchema = z.object({
  companyId: z.string().min(1).nullable(),
  role: z.enum(['platform-admin', 'company-owner', 'company-user']),
  divisionId: z.string().min(1).nullable(),
  localId: z.string().min(1).nullable(),
});

const authSessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    username: z.string().min(1),
  }),
  memberships: z.array(authMembershipSchema),
  activeCompany: z
    .object({
      companyId: z.string().min(1),
      status: z.enum(['active', 'suspended', 'provisioning_failed']),
    })
    .nullable(),
  activeScope: z
    .object({
      scopeType: z.enum(scopeTypeValues),
      scopeId: z.string().min(1),
    })
    .nullable(),
  activeLocalId: z.string().min(1).nullable(),
  capabilities: z.array(
    z.enum(authCapabilityValues),
  ),
});

const switchActiveLocalBodySchema = z.object({
  localId: z.string().min(1).nullable(),
});

const switchActiveScopeBodySchema = z.object({
  scope: z
    .object({
      scopeType: z.enum(scopeTypeValues),
      scopeId: z.string().min(1),
    })
    .nullable(),
});

export { authSessionSchema, authMembershipSchema };

const getCookieValue = (cookieHeader: string | undefined, cookieName: string) => {
  if (!cookieHeader) {
    return null;
  }

  for (const cookiePart of cookieHeader.split(';')) {
    const [name, ...valueParts] = cookiePart.trim().split('=');

    if (name === cookieName) {
      return valueParts.join('=');
    }
  }

  return null;
};

export const createAuthRouter = ({
  login,
  register,
  resolveAuthSession,
  logout,
  switchActiveLocal,
  switchActiveScope,
  scopeResolver,
  findLocalCompanyById,
  requireAuth,
  requireRole,
  sessionCookieName,
  secureCookies,
}: {
  login: Login;
  register: Register;
  resolveAuthSession: ResolveAuthSession;
  logout: Logout;
  switchActiveLocal: SwitchActiveLocal;
  switchActiveScope: SwitchActiveScope;
  scopeResolver: ScopeResolver;
  findLocalCompanyById: FindLocalCompanyById;
  requireAuth: RequestHandler;
  requireRole: (...roles: AuthRole[]) => RequestHandler;
  sessionCookieName: string;
  secureCookies: boolean;
}): Router => {
  const router = Router();

  router.post('/auth/login', async (request, response, next) => {
    try {
      const body = loginBodySchema.parse(request.body);
      const result = await login(body);

      response.cookie(sessionCookieName, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
      });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/register', async (request, response, next) => {
    try {
      const body = registerBodySchema.parse(request.body);
      const result = await register(body);

      response.cookie(sessionCookieName, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
      });
      response.status(201).send();
    } catch (error) {
      next(error);
    }
  });

  router.get('/auth/me', async (request, response, next) => {
    try {
      const token = getCookieValue(request.headers.cookie, sessionCookieName);
      const authSession = authSessionSchema.parse(await resolveAuthSession(token));

      response.set('Cache-Control', 'no-store');
      response.status(200).json(authSession);
    } catch (error) {
      next(error);
    }
  });

  router.post('/auth/logout', async (request, response, next) => {
    try {
      const token = getCookieValue(request.headers.cookie, sessionCookieName);

      await logout(token);
      response.clearCookie(sessionCookieName, {
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookies,
        path: '/',
      });
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/auth/me/active-scope',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const body = switchActiveScopeBodySchema.parse(request.body);
        const auth = (response.locals as { auth: AuthSession }).auth;

        if (!auth.activeCompany) {
          response
            .status(400)
            .json({ error: { code: 'ACTIVE_COMPANY_REQUIRED', message: 'Active company required' } });
          return;
        }

        if (
          body.scope !== null &&
          !(await scopeResolver.isAuthorized(
            auth.activeCompany.companyId,
            auth.user.id,
            body.scope,
          ).catch(() => false))
        ) {
          response
            .status(403)
            .json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } });
          return;
        }

        await switchActiveScope({ userId: auth.user.id, scope: body.scope });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/auth/me/active-local',
    requireAuth,
    requireRole('company-owner', 'company-user'),
    async (request, response, next) => {
      try {
        const body = switchActiveLocalBodySchema.parse(request.body);
        const auth = (
          response.locals as { auth: AuthSession }
        ).auth;

        if (!auth.activeCompany) {
          response
            .status(400)
            .json({ error: { code: 'ACTIVE_COMPANY_REQUIRED', message: 'Active company required' } });
          return;
        }

        if (body.localId !== null) {
          const localCompanyId = await findLocalCompanyById(body.localId);

          if (!localCompanyId || localCompanyId !== auth.activeCompany.companyId) {
            response
              .status(400)
              .json({ error: { code: 'LOCAL_NOT_IN_COMPANY', message: 'Local does not belong to active company' } });
            return;
          }
        }

        await switchActiveLocal({
          userId: auth.user.id,
          localId: body.localId,
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
};
