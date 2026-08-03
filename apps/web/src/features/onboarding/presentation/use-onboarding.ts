import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authQueryKey } from '../../auth/presentation/use-auth';
import { useAuthStore } from '../../auth/infrastructure/auth-store';
import {
  createOnboardingRepository,
  type CreateCompanyPayload,
} from '../infrastructure/onboarding-client';
import type { PaletteId } from '../domain/onboarding';

export const palettePreferenceQueryKey = ['me', 'preferences'] as const;

export const useCreateCompany = (apiBaseUrl?: string) => {
  const repository = createOnboardingRepository(apiBaseUrl);
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (payload: CreateCompanyPayload) => {
      await repository.recordPrivacyPolicyAcceptance(
        payload.privacyPolicyVersion,
      );
      return repository.createCompany(payload);
    },
    onSuccess: async () => {
      const session = await repository.getAuthSession();

      setSession(session);
      queryClient.setQueryData(authQueryKey, session);
      await queryClient.invalidateQueries({
        queryKey: palettePreferenceQueryKey,
      });
    },
  });
};

export const usePalettePreference = (apiBaseUrl?: string, enabled = true) => {
  const repository = createOnboardingRepository(apiBaseUrl);

  return useQuery({
    queryKey: palettePreferenceQueryKey,
    queryFn: () => repository.getPalettePreference(),
    enabled,
  });
};

export const useUpdatePalettePreference = (apiBaseUrl?: string) => {
  const repository = createOnboardingRepository(apiBaseUrl);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paletteId: PaletteId) =>
      repository.updatePalettePreference(paletteId),
    onSuccess: (preference) => {
      queryClient.setQueryData(palettePreferenceQueryKey, preference);
    },
  });
};
