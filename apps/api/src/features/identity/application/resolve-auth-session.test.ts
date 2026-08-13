import { describe, expect, it, vi } from 'vitest';

import { createResolveAuthSession } from './resolve-auth-session';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  CompanyLifecycle,
} from '../domain/auth';
import { createInMemoryScopeResolver, type ResolvedScopeNode, type ScopeAssignmentRecord } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';

const scopeNodes: ResolvedScopeNode[] = [
  {
    ref: { scopeType: 'company', scopeId: 'company-1' },
    parentRef: null,
    companyId: 'company-1',
    name: 'Company 1',
  },
  {
    ref: { scopeType: 'local', scopeId: 'local-1' },
    parentRef: { scopeType: 'company', scopeId: 'company-1' },
    companyId: 'company-1',
    name: 'Local 1',
  },
  {
    ref: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
    parentRef: { scopeType: 'local', scopeId: 'local-1' },
    companyId: 'company-1',
    name: 'Warehouse 1',
  },
];

const createScopeResolver = (assignments: ScopeAssignmentRecord[]) =>
  createInMemoryScopeResolver({ nodes: scopeNodes, assignments });

const createGateway = ({
  membershipsByUserId = new Map<string, AuthMembership[]>(),
  activeCompanyIdByUserId = new Map<string, string | null>(),
  activeScopeNodeIdByUserId = new Map<string, string | null>(),
  activeLocalIdByUserId = new Map<string, string | null>(),
  localCompanyByLocalId = new Map<string, string>(),
  companyStatusByCompanyId = new Map<string, CompanyLifecycle>(),
  sessions = new Map<string, AuthSessionRecord>(),
  users = new Map<string, AuthUser>(),
}: {
  membershipsByUserId?: Map<string, AuthMembership[]>;
  activeCompanyIdByUserId?: Map<string, string | null>;
  activeScopeNodeIdByUserId?: Map<string, string | null>;
  activeLocalIdByUserId?: Map<string, string | null>;
  localCompanyByLocalId?: Map<string, string>;
  companyStatusByCompanyId?: Map<string, CompanyLifecycle>;
  sessions?: Map<string, AuthSessionRecord>;
  users?: Map<string, AuthUser>;
} = {}): AuthIdentityGateway => {
  return {
    findUserByIdentifier: async () => null,
    findUserById: async (userId) => users.get(userId) ?? null,
    createUser: vi.fn(),
    createUserWithSession: vi.fn(),
    createSession: vi.fn(),
    findSession: async (token) => sessions.get(token) ?? null,
    deleteSession: async (token) => {
      sessions.delete(token);
    },
    listMemberships: async (userId) =>
      membershipsByUserId.get(userId) ?? [],
    findActiveCompanyId: async (userId) =>
      activeCompanyIdByUserId.get(userId) ?? null,
    findCompanyStatus: async (companyId) =>
      companyStatusByCompanyId.get(companyId) ?? 'active',
    setActiveCompanyId: vi.fn(),
    findActiveScopeNodeId: async (userId) =>
      activeScopeNodeIdByUserId.get(userId) ?? null,
    setActiveScopeNodeId: vi.fn(),
    findActiveLocalId: async (userId) =>
      activeLocalIdByUserId.get(userId) ?? null,
    setActiveLocalId: vi.fn(),
    findLocalCompanyById: async (localId) =>
      localCompanyByLocalId.get(localId) ?? null,
    countRecentActiveCompanySwitches: async () => 0,
    recordActiveCompanySwitch: vi.fn(),
  };
};

const setupSession = (gateway: AuthIdentityGateway) => {
  const sessions = new Map<string, AuthSessionRecord>();
  sessions.set('token-1', {
    token: 'token-1',
    userId: 'user-1',
    expiresAt: new Date(Date.now() + 60000),
  });
  (gateway as unknown as { sessions: Map<string, AuthSessionRecord> }).sessions =
    sessions;
};

describe('createResolveAuthSession', () => {
  it('defaults activeLocalId to null when no preference is set on login', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: 'local-1' as string | null,
        localId: 'local-1',
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      companyStatusByCompanyId: companyStatus,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeLocalId).toBeNull();
    expect(session.activeScope).toBeNull();
    expect(session.memberships[0]?.localId).toBe('local-1');
  });

  it('resolves activeLocalId when the saved local belongs to the active company', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const activeLocal = new Map<string, string | null>();
    activeLocal.set('user-1', 'local-1');
    const localCompany = new Map<string, string>();
    localCompany.set('local-1', 'company-1');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      activeLocalIdByUserId: activeLocal,
      localCompanyByLocalId: localCompany,
      companyStatusByCompanyId: companyStatus,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([
        {
          companyId: 'company-1',
          userId: 'user-1',
          scope: { scopeType: 'company', scopeId: 'company-1' },
          mode: 'subtree_inclusive',
        },
      ]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeLocalId).toBe('local-1');
    expect(session.activeScope).toEqual({
      scopeType: 'local',
      scopeId: 'local-1',
    });
  });

  it('resolves persisted activeScope and derives activeLocalId only for local scope', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const activeScopeNodeId = new Map<string, string | null>();
    activeScopeNodeId.set('user-1', 'warehouse:warehouse-1');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      activeScopeNodeIdByUserId: activeScopeNodeId,
      companyStatusByCompanyId: companyStatus,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([
        {
          companyId: 'company-1',
          userId: 'user-1',
          scope: { scopeType: 'company', scopeId: 'company-1' },
          mode: 'subtree_inclusive',
        },
      ]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeScope).toEqual({
      scopeType: 'warehouse',
      scopeId: 'warehouse-1',
    });
    expect(session.activeLocalId).toBeNull();
  });

  it('auto-selects the only authorized scope when no saved preference resolves', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      companyStatusByCompanyId: companyStatus,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([
        {
          companyId: 'company-1',
          userId: 'user-1',
          scope: { scopeType: 'warehouse', scopeId: 'warehouse-1' },
          mode: 'exact_node',
        },
      ]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeScope).toEqual({
      scopeType: 'warehouse',
      scopeId: 'warehouse-1',
    });
    expect(session.activeLocalId).toBeNull();
  });

  it('coerces activeLocalId to null when the saved local belongs to another company', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const activeLocal = new Map<string, string | null>();
    activeLocal.set('user-1', 'local-x');
    const localCompany = new Map<string, string>();
    localCompany.set('local-x', 'company-other');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      activeLocalIdByUserId: activeLocal,
      localCompanyByLocalId: localCompany,
      companyStatusByCompanyId: companyStatus,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeLocalId).toBeNull();
    expect(session.activeScope).toBeNull();
  });

  it('coerces activeLocalId to null when no active company is set', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: null,
        role: 'platform-admin',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeLocal = new Map<string, string | null>();
    activeLocal.set('user-1', 'local-1');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'admin@vimcore.test',
      username: 'admin',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeLocalIdByUserId: activeLocal,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeCompany).toBeNull();
    expect(session.activeLocalId).toBeNull();
    expect(session.activeScope).toBeNull();
  });

  it('falls back to the only authorized scope when the persisted scope is outside the assigned subtree', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const activeScopeNodeId = new Map<string, string | null>();
    activeScopeNodeId.set('user-1', 'warehouse:warehouse-1');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      activeScopeNodeIdByUserId: activeScopeNodeId,
      sessions,
      users,
      companyStatusByCompanyId: companyStatus,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([
        {
          companyId: 'company-1',
          userId: 'user-1',
          scope: { scopeType: 'local', scopeId: 'local-1' },
          mode: 'exact_node',
        },
      ]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeScope).toEqual({
      scopeType: 'local',
      scopeId: 'local-1',
    });
    expect(session.activeLocalId).toBe('local-1');
  });

  it('keeps activeScope null when multiple authorized scopes require explicit selection', async () => {
    const memberships = new Map<string, AuthMembership[]>();
    memberships.set('user-1', [
      {
        companyId: 'company-1',
        role: 'company-owner',
        divisionId: null,
        localId: null,
      },
    ]);
    const activeCompany = new Map<string, string | null>();
    activeCompany.set('user-1', 'company-1');
    const companyStatus = new Map<string, CompanyLifecycle>();
    companyStatus.set('company-1', 'active');
    const sessions = new Map<string, AuthSessionRecord>();
    sessions.set('token-1', {
      token: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60000),
    });
    const users = new Map<string, AuthUser>();
    users.set('user-1', {
      id: 'user-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed',
    });
    const gateway = createGateway({
      membershipsByUserId: memberships,
      activeCompanyIdByUserId: activeCompany,
      companyStatusByCompanyId: companyStatus,
      sessions,
      users,
    });

    const resolve = createResolveAuthSession({
      authIdentityGateway: gateway,
      scopeResolver: createScopeResolver([
        {
          companyId: 'company-1',
          userId: 'user-1',
          scope: { scopeType: 'local', scopeId: 'local-1' },
          mode: 'subtree_inclusive',
        },
      ]),
      seedAdminEnabled: false,
    });

    const session = await resolve('token-1');

    expect(session.activeScope).toBeNull();
    expect(session.activeLocalId).toBeNull();
  });
});

void setupSession;
