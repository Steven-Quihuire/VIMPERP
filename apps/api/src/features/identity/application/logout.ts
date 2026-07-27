import type { AuthIdentityGateway } from '../domain/auth';

export const createLogout =
  (
    authIdentityGateway: AuthIdentityGateway,
    seedAdminSessions?: Map<string, Date>,
  ) =>
  async (token: string | null | undefined): Promise<void> => {
    if (!token) {
      return;
    }

    if (seedAdminSessions?.has(token)) {
      seedAdminSessions.delete(token);
      return;
    }

    await authIdentityGateway.deleteSession(token);
  };
