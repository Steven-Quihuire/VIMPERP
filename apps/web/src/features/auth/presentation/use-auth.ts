import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { createAuthRepository } from '../infrastructure/auth-client';
import { useAuthStore } from '../infrastructure/auth-store';
import type { AuthSession, LoginInput, RegisterInput } from '../domain/auth';

export const authQueryKey = ['auth', 'me'] as const;

export const useAuth = (apiBaseUrl?: string) => {
  const repository = createAuthRepository(apiBaseUrl);
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: authQueryKey,
    queryFn: async () => {
      try {
        const nextSession = await repository.getMe();

        setSession(nextSession);
        return nextSession;
      } catch (error) {
        clearSession();
        throw error;
      }
    },
    retry: false,
  });

  return {
    ...query,
    session: query.data ?? session,
    isAuthenticated: Boolean(query.data ?? session),
  };
};

export const useLogin = (apiBaseUrl?: string) => {
  const repository = createAuthRepository(apiBaseUrl);
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      await repository.login(input);
      const session = await repository.getMe();

      return session;
    },
    onSuccess: (session: AuthSession) => {
      setSession(session);
      queryClient.setQueryData(authQueryKey, session);
    },
  });
};

export const useRegister = (apiBaseUrl?: string) => {
  const repository = createAuthRepository(apiBaseUrl);
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      await repository.register(input);
      const session = await repository.getMe();

      return session;
    },
    onSuccess: (session: AuthSession) => {
      setSession(session);
      queryClient.setQueryData(authQueryKey, session);
    },
  });
};

export const useLogout = (apiBaseUrl?: string) => {
  const repository = createAuthRepository(apiBaseUrl);
  const queryClient = useQueryClient();
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationFn: async () => repository.logout(),
    onSuccess: () => {
      clearSession();
      queryClient.removeQueries({ queryKey: authQueryKey });
    },
  });
};
