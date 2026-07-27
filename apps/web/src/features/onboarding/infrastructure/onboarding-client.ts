import { createAuthRepository } from '../../auth/infrastructure/auth-client';
import type { AuthSession } from '../../auth/domain/auth';
import { createHttpClient } from '../../../shared/lib/http/http-client';
import type { PaletteId } from '../domain/onboarding';

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
};

export const createOnboardingRepository = (apiBaseUrl = 'http://localhost:3000') => {
  const httpClient = createHttpClient(apiBaseUrl);
  const authRepository = createAuthRepository(apiBaseUrl);

  return {
    createCompany: async (payload: CreateCompanyPayload) => {
      const response = await httpClient.post('/companies', payload);

      return (await response.json()) as { companyId: string; paletteId: PaletteId };
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
