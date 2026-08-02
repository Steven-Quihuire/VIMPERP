import { randomUUID } from 'node:crypto';

import {
  type AuthIdentityGateway,
  type AuthSession,
  DuplicateIdentityError,
  type PasswordHasher,
  type SessionTokenService,
  toPublicAuthUser,
} from '../domain/auth';
import { defaultSessionLifetimeMs } from './login';

type RegisterInput = {
  email: string;
  username: string;
  password: string;
};

type CreateRegisterInput = {
  authIdentityGateway: AuthIdentityGateway;
  passwordHasher: PasswordHasher;
  sessionTokenService: SessionTokenService;
  sessionLifetimeMs?: number;
  now?: () => Date;
  createId?: () => string;
};

export const createRegister = ({
  authIdentityGateway,
  passwordHasher,
  sessionTokenService,
  sessionLifetimeMs = defaultSessionLifetimeMs,
  now = () => new Date(),
  createId = randomUUID,
}: CreateRegisterInput) => {
  return async ({ email, username, password }: RegisterInput): Promise<{ token: string; session: AuthSession }> => {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const existingEmail = await authIdentityGateway.findUserByIdentifier(normalizedEmail);
    const existingUsername = await authIdentityGateway.findUserByIdentifier(normalizedUsername);

    if (existingEmail || existingUsername) {
      throw new DuplicateIdentityError();
    }

    const user = {
      id: createId(),
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash: await passwordHasher.hash(password),
    };
    const token = sessionTokenService.create();

    await authIdentityGateway.createUserWithSession(user, {
      token,
      userId: user.id,
      expiresAt: new Date(now().getTime() + sessionLifetimeMs),
    });

    return {
      token,
      session: {
        user: toPublicAuthUser(user),
        memberships: [],
        activeCompany: null,
        capabilities: [],
      },
    };
  };
};
