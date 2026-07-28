import type { AuthRepository } from '../domain/auth';
import type { AuthSession, LoginInput } from '../domain/auth';
import { getApiBaseUrl } from '../../../shared/lib/http/api-base-url';
import { createHttpClient } from '../../../shared/lib/http/http-client';

export const createAuthRepository = (
  apiBaseUrl = getApiBaseUrl(),
): AuthRepository => {
  const httpClient = createHttpClient(apiBaseUrl);

  return {
    login: async (input: LoginInput) => {
      await httpClient.post('/auth/login', input);
    },
    getMe: async () => httpClient.get<AuthSession>('/auth/me'),
    logout: async () => {
      await httpClient.post('/auth/logout');
    },
  };
};
