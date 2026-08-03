import { Router, type RequestHandler } from 'express';
import { z } from 'zod';

import type { AuthSession } from '../../identity/domain/auth';
import {
  isValidEcuadorianMobile,
  MAX_COMPANY_SERVICES,
  paletteValues,
  erpModuleValues,
  PRIVACY_POLICY_VERSION,
  type PaletteId,
} from '../domain/company';

const paletteSchema = z.enum(paletteValues);
const erpModuleSchema = z.enum(erpModuleValues);

const createCompanyBodySchema = z.object({
  name: z.string().min(1),
  legalIdentifier: z.string().min(1),
  services: z
    .array(z.string().trim().min(1).max(100))
    .min(1)
    .max(MAX_COMPANY_SERVICES),
  address: z.object({
    country: z.string().min(1),
    city: z.string().min(1),
    exactLocation: z.string().min(1),
  }),
  contact: z.object({
    phone: z.string().trim().refine(isValidEcuadorianMobile, {
      message:
        'Ingresa un celular ecuatoriano válido de 10 dígitos que empiece en 09.',
    }),
    email: z.string().email(),
  }),
  paletteId: paletteSchema.default('mono'),
  erpModuleId: erpModuleSchema.default('inventory'),
  privacyPolicyVersion: z.literal(PRIVACY_POLICY_VERSION),
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

const activeCompanySchema = z.object({
  companyId: z.string().min(1),
});

const currentCompanySummarySchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
});

const privacyPolicyConsentSchema = z.object({
  policyVersion: z.literal(PRIVACY_POLICY_VERSION),
});

type AuthenticatedResponseLocals = {
  auth: AuthSession;
  requestContext?: {
    correlationId: string;
    requestId: string;
  };
};

const getIdempotencyKey = (headerValue: string | string[] | undefined) => {
  if (Array.isArray(headerValue)) {
    return getIdempotencyKey(headerValue[0]);
  }

  const normalized = headerValue?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
};

export const createCompanyRouter = ({
  requireAuth,
  createCompany,
  recordPrivacyPolicyAcceptance,
  getCurrentCompanySummary,
  getThemePreference,
  switchActiveCompany,
  updateThemePreference,
}: {
  requireAuth: RequestHandler;
  recordPrivacyPolicyAcceptance: (input: {
    userId: string;
    policyVersion: typeof PRIVACY_POLICY_VERSION;
  }) => Promise<void>;
  createCompany: (input: {
    correlationId: string;
    ownerUserId: string;
    requestId: string;
    idempotencyKey: string | null;
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
    erpModuleId: (typeof erpModuleValues)[number];
    privacyPolicyVersion: typeof PRIVACY_POLICY_VERSION;
    branches: Array<{ name: string; locale?: string | undefined }>;
  }) => Promise<{ companyId: string; paletteId: PaletteId }>;
  getCurrentCompanySummary: (activeCompanyId: string | null) => Promise<{
    companyId: string;
    name: string;
  } | null>;
  getThemePreference: (userId: string) => Promise<{ paletteId: PaletteId }>;
  switchActiveCompany: (input: {
    userId: string;
    companyId: string;
    memberships: AuthSession['memberships'];
    correlationId: string;
    currentActiveCompanyId: string | null;
  }) => Promise<void>;
  updateThemePreference: (input: {
    userId: string;
    paletteId: PaletteId;
  }) => Promise<{ paletteId: PaletteId }>;
}): Router => {
  const router = Router();

  router.post(
    '/me/privacy-consent',
    requireAuth,
    async (request, response, next) => {
      try {
        const body = privacyPolicyConsentSchema.parse(request.body);
        const auth = (response.locals as AuthenticatedResponseLocals).auth;

        await recordPrivacyPolicyAcceptance({
          userId: auth.user.id,
          policyVersion: body.policyVersion,
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.post('/companies', requireAuth, async (request, response, next) => {
    try {
      const body = createCompanyBodySchema.parse(request.body);
      const auth = (response.locals as AuthenticatedResponseLocals).auth;
      const requestContext = (response.locals as AuthenticatedResponseLocals)
        .requestContext;
      const result = await createCompany({
        correlationId:
          requestContext?.correlationId ??
          String(response.getHeader('x-correlation-id')),
        idempotencyKey: getIdempotencyKey(request.headers['x-idempotency-key']),
        ownerUserId: auth.user.id,
        requestId:
          requestContext?.requestId ??
          String(response.getHeader('x-request-id')),
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
      const company = await getCurrentCompanySummary(
        auth.activeCompany?.companyId ?? null,
      );

      response
        .status(200)
        .json(company ? currentCompanySummarySchema.parse(company) : null);
    } catch (error) {
      next(error);
    }
  });

  router.get(
    '/me/preferences',
    requireAuth,
    async (_request, response, next) => {
      try {
        const auth = (response.locals as AuthenticatedResponseLocals).auth;
        const preference = await getThemePreference(auth.user.id);

        response.status(200).json(preference);
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/me/active-company',
    requireAuth,
    async (request, response, next) => {
      try {
        const body = activeCompanySchema.parse(request.body);
        const locals = response.locals as AuthenticatedResponseLocals;

        await switchActiveCompany({
          userId: locals.auth.user.id,
          companyId: body.companyId,
          memberships: locals.auth.memberships,
          correlationId:
            locals.requestContext?.correlationId ??
            String(response.getHeader('x-correlation-id')),
          currentActiveCompanyId: locals.auth.activeCompany?.companyId ?? null,
        });

        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  router.patch(
    '/me/preferences',
    requireAuth,
    async (request, response, next) => {
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
    },
  );

  return router;
};
