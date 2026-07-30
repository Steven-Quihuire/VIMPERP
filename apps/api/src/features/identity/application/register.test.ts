import { describe, expect, it } from 'vitest';

import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../domain/auth';
import { createRegister } from './register';

class AtomicOnlyAuthGateway implements AuthIdentityGateway {
  readonly calls: string[] = [];
  readonly usersByIdentifier = new Map<string, AuthUser>();
  readonly sessions = new Map<string, AuthSessionRecord>();

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(
      this.usersByIdentifier.get(identifier.toLowerCase()) ?? null,
    );
  }

  async findUserById() {
    return await Promise.resolve(null);
  }

  async createUser() {
    this.calls.push('createUser');
    throw new Error('register must not create user separately');
  }

  async createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    this.calls.push('createUserWithSession');
    this.usersByIdentifier.set(user.email.toLowerCase(), user);
    this.usersByIdentifier.set(user.username.toLowerCase(), user);
    this.sessions.set(session.token, session);
    await Promise.resolve();
  }

  async createSession() {
    this.calls.push('createSession');
    throw new Error('register must not create session separately');
  }

  async findSession() {
    return await Promise.resolve(null);
  }

  async deleteSession() {
    await Promise.resolve();
  }

  async listMemberships(): Promise<AuthMembership[]> {
    return await Promise.resolve([]);
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async () => await Promise.resolve(false),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

describe('createRegister', () => {
  it('persists user and session through the atomic gateway method', async () => {
    const gateway = new AtomicOnlyAuthGateway();
    const register = createRegister({
      authIdentityGateway: gateway,
      passwordHasher,
      sessionTokenService,
      createId: () => 'user-1',
      now: () => new Date('2026-07-30T12:00:00.000Z'),
    });

    const result = await register({
      email: ' Owner@Vimcore.Test ',
      username: ' Owner ',
      password: 'secret123',
    });

    expect(gateway.calls).toEqual(['createUserWithSession']);
    expect(gateway.usersByIdentifier.get('owner@vimcore.test')).toMatchObject({
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    expect(gateway.sessions.get('session-token')).toEqual({
      token: 'session-token',
      userId: 'user-1',
      expiresAt: new Date('2026-07-30T20:00:00.000Z'),
    });
    expect(result).toEqual({
      token: 'session-token',
      session: {
        user: {
          id: 'user-1',
          email: 'owner@vimcore.test',
          username: 'owner',
        },
        memberships: [],
      },
    });
  });
});
