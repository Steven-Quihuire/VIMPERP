import type { RequestHandler } from 'express';

import { ForbiddenError, type AuthRole, type AuthSession } from '../domain/auth';

type ResolveAuthSession = (token: string | null | undefined) => Promise<AuthSession>;

type AuthenticatedResponseLocals = {
  auth: AuthSession;
};

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

export const createRequireAuth = (
  resolveAuthSession: ResolveAuthSession,
  sessionCookieName: string,
): RequestHandler => {
  return async (request, response, next) => {
    try {
      const token = getCookieValue(request.headers.cookie, sessionCookieName);
      const auth = await resolveAuthSession(token);

      (response.locals as AuthenticatedResponseLocals).auth = auth;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const createRequireRole = (...roles: AuthRole[]): RequestHandler => {
  return (request, response, next) => {
    void request;

    const auth = (response.locals as Partial<AuthenticatedResponseLocals>).auth;

    if (!auth) {
      next(new ForbiddenError());
      return;
    }

    const isAllowed = auth.memberships.some((membership) => roles.includes(membership.role));

    if (!isAllowed) {
      next(new ForbiddenError());
      return;
    }

    next();
  };
};
