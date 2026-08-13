import type { AuthRepository } from '../domain/auth';
import type {
  AuthSession,
  LoginInput,
  RegisterInput,
  SwitchActiveCompanyInput,
  SwitchActiveLocalInput,
  SwitchActiveScopeInput,
} from '../domain/auth';
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
    register: async (input: RegisterInput) => {
      await httpClient.post('/auth/register', input);
    },
    getMe: async () => httpClient.get<AuthSession>('/auth/me'),
    switchActiveCompany: async (input: SwitchActiveCompanyInput) => {
      await httpClient.patch('/me/active-company', input);
    },
    switchActiveLocal: async (input: SwitchActiveLocalInput) => {
      await httpClient.post('/auth/me/active-local', input);
    },
    switchActiveScope: async (input: SwitchActiveScopeInput) => {
      await httpClient.post('/auth/me/active-scope', input);
    },
    logout: async () => {
      await httpClient.post('/auth/logout');
    },
  };
};
