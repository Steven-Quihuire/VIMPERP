import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { createAuthRepository } from '../infrastructure/auth-client';
import { useAuthStore } from '../infrastructure/auth-store';
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  SwitchActiveCompanyInput,
} from '../domain/auth';

export const authQueryKey = ['auth', 'me'] as const;
const dashboardCurrentCompanyQueryKey = ['dashboard', 'current-company'] as const;

export const useAuth = (apiBaseUrl?: string) => {
  const repository = createAuthRepository(apiBaseUrl);
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const setActiveCompany = useAuthStore((state) => state.setActiveCompany);
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
    setActiveCompany,
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
      void queryClient.invalidateQueries({
        queryKey: dashboardCurrentCompanyQueryKey,
      });
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

export const useSwitchActiveCompany = (apiBaseUrl?: string) => {
  const repository = createAuthRepository(apiBaseUrl);
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: async (input: SwitchActiveCompanyInput) => {
      await repository.switchActiveCompany(input);
      return await repository.getMe();
    },
    onSuccess: (session: AuthSession) => {
      setSession(session);
      queryClient.setQueryData(authQueryKey, session);
    },
  });
};
