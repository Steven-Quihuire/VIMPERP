import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import type { AuthSession } from '../../identity/domain/auth';
import {
  paletteValues,
  type PaletteId,
} from '../domain/company';

const paletteSchema = z.enum(paletteValues);

const createCompanyBodySchema = z.object({
  name: z.string().min(1),
  legalIdentifier: z.string().min(1),
  services: z.array(z.string().min(1)).min(1),
  address: z.object({
    country: z.string().min(1),
    city: z.string().min(1),
    exactLocation: z.string().min(1),
  }),
  contact: z.object({
    phone: z.string().min(1),
    email: z.string().email(),
  }),
  paletteId: paletteSchema.default('ocean'),
  branches: z
    .array(
      z.object({
        name: z.string().min(1),
        locale: z.string().min(1).optional(),
      }),
    )
    .default([]),
});

const themePreferenceSchema = z.object({
  paletteId: paletteSchema,
});

const currentCompanySummarySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
});

type AuthenticatedResponseLocals = {
  auth: AuthSession;
  requestContext?: {
    correlationId: string;
    requestId: string;
  };
};

export const createCompanyRouter = ({
  requireAuth,
  createCompany,
  getCurrentCompanySummary,
  getThemePreference,
  updateThemePreference,
}: {
  requireAuth: RequestHandler;
  createCompany: (input: {
    correlationId: string;
    ownerUserId: string;
    requestId: string;
    name: string;
    legalIdentifier: string;
    services: string[];
    address: {
      country: string;
      city: string;
      exactLocation: string;
    };
    contact: {
      phone: string;
      email: string;
    };
    paletteId: PaletteId;
    branches: Array<{ name: string; locale?: string | undefined }>;
  }) => Promise<{ companyId: string; paletteId: PaletteId }>;
  getCurrentCompanySummary: (userId: string) => Promise<{
    companyId: string;
    name: string;
  } | null>;
  getThemePreference: (userId: string) => Promise<{ paletteId: PaletteId }>;
  updateThemePreference: (input: {
    userId: string;
    paletteId: PaletteId;
  }) => Promise<{ paletteId: PaletteId }>;
}): Router => {
  const router = Router();

  router.post('/companies', requireAuth, async (request, response, next) => {
    try {
      const body = createCompanyBodySchema.parse(request.body);
      const auth = (response.locals as AuthenticatedResponseLocals).auth;
      const requestContext = (response.locals as AuthenticatedResponseLocals).requestContext;
      const result = await createCompany({
        correlationId: requestContext?.correlationId ?? String(response.getHeader('x-correlation-id')),
        ownerUserId: auth.user.id,
        requestId: requestContext?.requestId ?? String(response.getHeader('x-request-id')),
        ...body,
      });

      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/me/company', requireAuth, async (_request, response, next) => {
    try {
      const auth = (response.locals as AuthenticatedResponseLocals).auth;
      const company = await getCurrentCompanySummary(auth.user.id);

      response.status(200).json(company ? currentCompanySummarySchema.parse(company) : null);
    } catch (error) {
      next(error);
    }
  });

  router.get('/me/preferences', requireAuth, async (_request, response, next) => {
    try {
      const auth = (response.locals as AuthenticatedResponseLocals).auth;
      const preference = await getThemePreference(auth.user.id);

      response.status(200).json(preference);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/me/preferences', requireAuth, async (request, response, next) => {
    try {
      const body = themePreferenceSchema.parse(request.body);
      const auth = (response.locals as AuthenticatedResponseLocals).auth;
      const preference = await updateThemePreference({
        userId: auth.user.id,
        paletteId: body.paletteId,
      });

      response.status(200).json(preference);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
