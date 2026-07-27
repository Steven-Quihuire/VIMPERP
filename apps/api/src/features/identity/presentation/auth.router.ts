import { Router } from 'express';
import { z } from 'zod';

import type { AuthSession } from '../domain/auth';

type Login = (input: {
  identifier: string;
  password: string;
}) => Promise<{ token: string; session: AuthSession }>;

type ResolveAuthSession = (token: string | null | undefined) => Promise<AuthSession>;
type Logout = (token: string | null | undefined) => Promise<void>;

const loginBodySchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const authSessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    username: z.string().min(1),
  }),
  memberships: z.array(
    z.object({
      companyId: z.string().min(1).nullable(),
      role: z.enum(['platform-admin', 'company-owner', 'company-user']),
    }),
  ),
});

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
  resolveAuthSession,
  logout,
  sessionCookieName,
  secureCookies,
}: {
  login: Login;
  resolveAuthSession: ResolveAuthSession;
  logout: Logout;
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

  router.get('/auth/me', async (request, response, next) => {
    try {
      const token = getCookieValue(request.headers.cookie, sessionCookieName);
      const authSession = authSessionSchema.parse(await resolveAuthSession(token));

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

  return router;
};
