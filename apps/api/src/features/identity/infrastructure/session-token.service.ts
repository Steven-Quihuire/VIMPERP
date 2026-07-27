import { randomUUID } from 'node:crypto';

import type { SessionTokenService } from '../domain/auth';

export const createSessionTokenService = (): SessionTokenService => ({
  create: () => randomUUID(),
});
