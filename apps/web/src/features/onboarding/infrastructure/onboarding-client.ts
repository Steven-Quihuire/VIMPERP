import { createAuthRepository } from '../../auth/infrastructure/auth-client';
import type { AuthSession } from '../../auth/domain/auth';
import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type {
  PRIVACY_POLICY_VERSION,
  ErpModuleId,
  PaletteId,
} from '../domain/onboarding';

export type CreateCompanyPayload = {
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
  erpModuleId: ErpModuleId;
  privacyPolicyVersion: typeof PRIVACY_POLICY_VERSION;
};

export const createOnboardingRepository = (apiBaseUrl = getApiBaseUrl()) => {
  const httpClient = createHttpClient(apiBaseUrl);
  const authRepository = createAuthRepository(apiBaseUrl);

  return {
    recordPrivacyPolicyAcceptance: async (
      policyVersion: typeof PRIVACY_POLICY_VERSION,
    ) => {
      await httpClient.post('/me/privacy-consent', { policyVersion });
    },
    createCompany: async (payload: CreateCompanyPayload) => {
      const response = await httpClient.post('/companies', payload);

      return (await response.json()) as {
        companyId: string;
        paletteId: PaletteId;
      };
    },
    getPalettePreference: async () => {
      return httpClient.get<{ paletteId: PaletteId }>('/me/preferences');
    },
    updatePalettePreference: async (paletteId: PaletteId) => {
      const response = await httpClient.patch('/me/preferences', { paletteId });

      return (await response.json()) as { paletteId: PaletteId };
    },
    getAuthSession: async (): Promise<AuthSession> => authRepository.getMe(),
  };
};
