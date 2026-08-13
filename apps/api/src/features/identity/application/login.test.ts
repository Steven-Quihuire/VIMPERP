import { describe, expect, it } from 'vitest';

import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../domain/auth';
import { createLogin } from './login';

class InMemoryAuthGateway implements AuthIdentityGateway {
  readonly sessions = new Map<string, AuthSessionRecord>();
  readonly usersByIdentifier = new Map<string, AuthUser>();
  readonly membershipsByUserId = new Map<string, AuthMembership[]>();

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(
      this.usersByIdentifier.get(identifier.toLowerCase()) ?? null,
    );
  }

  async findUserById() {
    return await Promise.resolve(null);
  }

  async createUser() {
    await Promise.resolve();
  }

  async createUserWithSession() {
    await Promise.resolve();
  }

  async createSession(session: AuthSessionRecord) {
    this.sessions.set(session.token, session);
    await Promise.resolve();
  }

  async findSession() {
    return await Promise.resolve(null);
  }

  async deleteSession() {
    await Promise.resolve();
  }

  async listMemberships(userId: string) {
    return await Promise.resolve(this.membershipsByUserId.get(userId) ?? []);
  }

  async findActiveCompanyId() {
    return await Promise.resolve(null);
  }

  async findCompanyStatus() {
    return await Promise.resolve('active' as const);
  }

  async setActiveCompanyId() {
    await Promise.resolve();
  }

  async findActiveScopeNodeId() {
    return await Promise.resolve(null);
  }

  async setActiveScopeNodeId() {
    await Promise.resolve();
  }

  async findActiveLocalId() {
    return await Promise.resolve(null);
  }

  async setActiveLocalId() {
    await Promise.resolve();
  }

  async findLocalCompanyById() {
    return await Promise.resolve(null);
  }

  async countRecentActiveCompanySwitches() {
    return await Promise.resolve(0);
  }

  async recordActiveCompanySwitch() {
    await Promise.resolve();
  }
}

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

describe('createLogin', () => {
  it('returns activeScope as null for a persisted user session', async () => {
    const gateway = new InMemoryAuthGateway();
    gateway.usersByIdentifier.set('owner', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    gateway.membershipsByUserId.set('user-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);

    const login = createLogin({
      authIdentityGateway: gateway,
      passwordHasher,
      sessionTokenService,
      seedAdminEnabled: false,
      now: () => new Date('2026-08-11T12:00:00.000Z'),
    });

    const result = await login({ identifier: ' owner ', password: 'secret123' });

    expect(result).toEqual({
      token: 'session-token',
      session: {
        user: {
          id: 'user-1',
          email: 'owner@vimcore.test',
          username: 'owner',
        },
        memberships: [
          { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
        ],
        activeCompany: null,
        activeScope: null,
        activeLocalId: null,
        capabilities: [],
      },
    });
  });

  it('returns activeScope as null for the seeded admin session', async () => {
    const login = createLogin({
      authIdentityGateway: new InMemoryAuthGateway(),
      passwordHasher,
      sessionTokenService,
      seedAdminEnabled: true,
      now: () => new Date('2026-08-11T12:00:00.000Z'),
    });

    const result = await login({ identifier: 'admin', password: 'admin' });

    expect(result.session.activeScope).toBeNull();
    expect(result.session.activeCompany).toBeNull();
    expect(result.session.activeLocalId).toBeNull();
  });
});
