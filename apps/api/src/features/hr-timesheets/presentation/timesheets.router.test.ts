import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../../../app/create-app';
import type { ApprovalPolicyGateway as ApprovalPolicyFeatureGateway, ApprovalPolicyScopeNode } from '../../approval-policy/domain/approval-policy';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import type { EmployeeAssignment } from '../../hr-employees/domain/employee-assignments';
import type { HrEmployeesGateway, ScopeNodeRecord } from '../../hr-employees/domain/employees';
import type { ErpAccessGateway } from '../../hr-erp-access/domain/erp-access-invitations';
import { type PermissionScope } from '../../roles-management/domain/assignments';
import type { ApplicationErrorRecorder } from '../../../shared/presentation/error.middleware';
import {
  createInMemoryScopeResolver,
  type ScopeAssignmentRecord,
} from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import {
  InMemoryApprovalPolicyGateway as InMemoryTimesheetApprovalPolicyGateway,
  InMemoryTimesheetsGateway,
  buildAssignment,
  buildEntry,
  buildPeriod,
} from '../application/__tests__/support';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();
  private activeCompanyByUserId = new Map<string, string | null>();
  private activeScopeNodeIdByUserId = new Map<string, string | null>();

  addUser(user: AuthUser) {
    this.usersById.set(user.id, user);
    this.usersByIdentifier.set(user.email.toLowerCase(), user);
    this.usersByIdentifier.set(user.username.toLowerCase(), user);
  }

  setMemberships(userId: string, memberships: AuthMembership[]) {
    this.membershipsByUserId.set(userId, memberships);
  }

  setActiveCompany(userId: string, companyId: string | null) {
    this.activeCompanyByUserId.set(userId, companyId);
  }

  seedActiveScopeNodeId(userId: string, scopeNodeId: string | null) {
    this.activeScopeNodeIdByUserId.set(userId, scopeNodeId);
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(this.usersByIdentifier.get(identifier.toLowerCase()) ?? null);
  }
  async findUserById(userId: string) {
    return await Promise.resolve(this.usersById.get(userId) ?? null);
  }
  createUser(user: AuthUser) {
    this.addUser(user);

    return Promise.resolve();
  }
  createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    this.addUser(user);
    this.sessions.set(session.token, session);

    return Promise.resolve();
  }
  createSession(session: AuthSessionRecord) {
    this.sessions.set(session.token, session);

    return Promise.resolve();
  }
  async findSession(token: string) {
    return await Promise.resolve(this.sessions.get(token) ?? null);
  }
  deleteSession(token: string) {
    this.sessions.delete(token);

    return Promise.resolve();
  }
  async listMemberships(userId: string) {
    return await Promise.resolve(this.membershipsByUserId.get(userId) ?? []);
  }
  async findActiveCompanyId(userId: string) {
    return await Promise.resolve(this.activeCompanyByUserId.get(userId) ?? null);
  }
  async findCompanyStatus() {
    return await Promise.resolve('active' as const);
  }
  setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);

    return Promise.resolve();
  }
  async findActiveScopeNodeId(userId: string) {
    return await Promise.resolve(this.activeScopeNodeIdByUserId.get(userId) ?? null);
  }
  setActiveScopeNodeId(userId: string, scopeNodeId: string | null) {
    this.activeScopeNodeIdByUserId.set(userId, scopeNodeId);

    return Promise.resolve();
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

class InMemoryHrEmployeesGateway {
  assignments: EmployeeAssignment[] = [];
  scopeNodes: ScopeNodeRecord[] = [
    {
      id: 'company:company-a',
      companyId: 'company-a',
      nodeType: 'company',
      sourceId: 'company-a',
      parentScopeNodeId: null,
      name: 'Vimcore',
    },
    {
      id: 'area:scope-1',
      companyId: 'company-a',
      nodeType: 'area',
      sourceId: 'scope-1',
      parentScopeNodeId: 'company:company-a',
      name: 'Operations',
    },
    {
      id: 'area:scope-2',
      companyId: 'company-a',
      nodeType: 'area',
      sourceId: 'scope-2',
      parentScopeNodeId: 'company:company-a',
      name: 'External',
    },
  ];
  directReportsByManagerPositionId = new Map<string, EmployeeAssignment[]>();

  async findScopeNode(companyId: string, scopeNodeId: string) {
    return await Promise.resolve(
      this.scopeNodes.find(
        (scopeNode) => scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null,
    );
  }

  async getActivePrimaryAssignmentByEmployeeId(companyId: string, employeeId: string) {
    return await Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.employeeId === employeeId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null,
    );
  }

  async listDirectReportAssignments(companyId: string, managerPositionId: string) {
    return await Promise.resolve(
      (this.directReportsByManagerPositionId.get(managerPositionId) ?? []).filter(
        (assignment) => assignment.companyId === companyId,
      ),
    );
  }
}

class InMemoryErpAccessGateway {
  activeLinks = new Map<string, { employeeId: string; userId: string }>();

  async getActiveLinkByUserId(companyId: string, userId: string) {
    const link = this.activeLinks.get(`${companyId}:${userId}`);

    return await Promise.resolve(
      link
        ? {
            id: `link:${companyId}:${userId}`,
            companyId,
            employeeId: link.employeeId,
            userId: link.userId,
            isActive: true,
            createdAt: new Date('2026-08-10T08:00:00.000Z'),
            revokedAt: null,
          }
        : null,
    );
  }
}

class InMemoryFeatureApprovalPolicyGateway implements ApprovalPolicyFeatureGateway {
  policies: Array<{
    id: string;
    companyId: string;
    scopeType: 'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  scopeNodes: ApprovalPolicyScopeNode[] = [
    { id: 'area:scope-1', companyId: 'company-a', scopeType: 'area', sourceId: 'scope-1' },
    { id: 'area:scope-2', companyId: 'company-a', scopeType: 'area', sourceId: 'scope-2' },
  ];

  async createApprovalPolicy(input: {
    companyId: string;
    scopeType: 'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) {
    const policy = {
      id: `policy-${this.policies.length + 1}`,
      companyId: input.companyId,
      scopeType: input.scopeType,
      scopeNodeId: input.scopeNodeId,
      name: input.name,
      definition: input.definition,
      isActive: input.isActive,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-01T00:00:00.000Z'),
    };

    this.policies.push(policy);

    return await Promise.resolve(policy);
  }

  async listApprovalPolicies(companyId: string) {
    return await Promise.resolve(this.policies.filter((policy) => policy.companyId === companyId));
  }

  async getApprovalPolicyById(companyId: string, policyId: string) {
    return await Promise.resolve(
      this.policies.find((policy) => policy.companyId === companyId && policy.id === policyId) ?? null,
    );
  }

  async updateApprovalPolicy(input: {
    companyId: string;
    policyId: string;
    scopeType: 'company' | 'division' | 'local' | 'area' | 'warehouse' | 'point-of-sale';
    scopeNodeId: string | null;
    name: string;
    definition: unknown;
    isActive: boolean;
  }) {
    const policy = this.policies.find(
      (candidate) =>
        candidate.companyId === input.companyId && candidate.id === input.policyId,
    );

    if (!policy) {
      return await Promise.resolve(null);
    }

    policy.scopeType = input.scopeType;
    policy.scopeNodeId = input.scopeNodeId;
    policy.name = input.name;
    policy.definition = input.definition;
    policy.isActive = input.isActive;
    policy.updatedAt = new Date('2026-08-02T00:00:00.000Z');

    return await Promise.resolve(policy);
  }

  async deactivateApprovalPolicy(companyId: string, policyId: string) {
    const policy = this.policies.find(
      (candidate) => candidate.companyId === companyId && candidate.id === policyId,
    );

    if (!policy) {
      return await Promise.resolve(null);
    }

    policy.isActive = false;
    policy.updatedAt = new Date('2026-08-03T00:00:00.000Z');

    return await Promise.resolve(policy);
  }

  async findScopeNode(companyId: string, scopeNodeId: string) {
    return await Promise.resolve(
      this.scopeNodes.find(
        (scopeNode) => scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null,
    );
  }
}

const passwordHasher: PasswordHasher = {
  hash: (value) => Promise.resolve(`hashed:${value}`),
  verify: (hash, value) => Promise.resolve(hash === `hashed:${value}`),
};

const createSessionTokenService = (): SessionTokenService => {
  let counter = 0;

  return {
    create: () => `session-token-${++counter}`,
  };
};

const applicationErrorRecorder: ApplicationErrorRecorder = {
  record: async () => {},
};

const periodListSchema = z.array(z.object({ id: z.string() }));
const entryListSchema = z.array(
  z.object({
    id: z.string(),
    periodId: z.string(),
  }),
);
const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
  }),
});

type PermissionCall = {
  companyId: string;
  userId: string;
  currentContext: { scopeType: string; scopeId: string };
  permissionScope?: PermissionScope;
};

const getPeriodIds = (body: unknown) =>
  periodListSchema.parse(body).map((period) => period.id);

const getEntryIds = (body: unknown) =>
  entryListSchema.parse(body).map((entry) => entry.id);

const getErrorCode = (body: unknown) => errorResponseSchema.parse(body).error.code;

const getSessionCookie = (headers: string | string[] | undefined) => {
  const cookieHeaders = Array.isArray(headers) ? headers : headers ? [headers] : [];
  const [cookie] = cookieHeaders;

  if (!cookie) {
    throw new Error('missing session cookie');
  }

  return cookie.split(';')[0]!;
};

const createTimesheetFixture = () => {
  const timesheetGateway = new InMemoryTimesheetsGateway();
  const hrEmployeesGateway = new InMemoryHrEmployeesGateway();
  const hrErpAccessGateway = new InMemoryErpAccessGateway();
  const approvalPolicyGateway = new InMemoryFeatureApprovalPolicyGateway();
  const timesheetApprovalPolicyGateway = new InMemoryTimesheetApprovalPolicyGateway();

  const managerAssignment = {
    ...buildAssignment({
      id: 'assignment-self',
      companyId: 'company-a',
      employeeId: 'employee-self',
      scopeNodeId: 'area:scope-1',
    }),
    positionId: 'position-manager',
    startedAt: new Date('2026-08-01T00:00:00.000Z'),
    endedAt: null,
    isPrimary: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  } satisfies EmployeeAssignment;
  const reportAssignment = {
    ...buildAssignment({
      id: 'assignment-report',
      companyId: 'company-a',
      employeeId: 'employee-report',
      scopeNodeId: 'area:scope-1',
    }),
    positionId: 'position-report',
    startedAt: new Date('2026-08-01T00:00:00.000Z'),
    endedAt: null,
    isPrimary: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  } satisfies EmployeeAssignment;
  const outsiderAssignment = {
    ...buildAssignment({
      id: 'assignment-outsider',
      companyId: 'company-a',
      employeeId: 'employee-outsider',
      scopeNodeId: 'area:scope-2',
    }),
    positionId: 'position-outsider',
    startedAt: new Date('2026-08-01T00:00:00.000Z'),
    endedAt: null,
    isPrimary: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  } satisfies EmployeeAssignment;

  hrEmployeesGateway.assignments.push(managerAssignment, reportAssignment, outsiderAssignment);
  hrEmployeesGateway.directReportsByManagerPositionId.set('position-manager', [reportAssignment]);
  timesheetGateway.assignments = [
    buildAssignment(managerAssignment),
    buildAssignment(reportAssignment),
    buildAssignment(outsiderAssignment),
  ];

  timesheetGateway.periods.push(
    buildPeriod({
      id: 'period-self',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-self',
      periodStart: '2026-08-04',
      periodEnd: '2026-08-10',
    }),
    buildPeriod({
      id: 'period-report',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-report',
      periodStart: '2026-08-11',
      periodEnd: '2026-08-17',
    }),
    buildPeriod({
      id: 'period-outsider',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-outsider',
      periodStart: '2026-08-18',
      periodEnd: '2026-08-24',
    }),
    buildPeriod({
      id: 'period-submitted',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-report',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-07',
      status: 'submitted',
      submittedAt: new Date('2026-08-18T08:00:00.000Z'),
      submittedByUserId: 'employee-approver',
    }),
    buildPeriod({
      id: 'period-self-submitted',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-self',
      periodStart: '2026-09-08',
      periodEnd: '2026-09-14',
      status: 'submitted',
      submittedAt: new Date('2026-08-18T08:00:00.000Z'),
      submittedByUserId: 'owner-user',
    }),
    buildPeriod({
      id: 'period-rejected',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-report',
      periodStart: '2026-09-15',
      periodEnd: '2026-09-21',
      status: 'rejected',
      rejectionReason: 'Missing receipt',
    }),
    buildPeriod({
      id: 'period-locked',
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-report',
      periodStart: '2026-09-22',
      periodEnd: '2026-09-28',
      status: 'approved',
      approvedAt: new Date('2026-08-18T09:00:00.000Z'),
      approvedByUserId: 'approver-1',
    }),
  );
  timesheetGateway.entries.push(
    buildEntry({
      id: 'entry-update',
      companyId: 'company-a',
      periodId: 'period-report',
      entryDate: '2026-08-12',
      taskLabel: 'Cycle count',
    }),
    buildEntry({
      id: 'entry-duplicate',
      companyId: 'company-a',
      periodId: 'period-report',
      entryDate: '2026-08-13',
      taskLabel: 'Packing',
    }),
  );

  timesheetApprovalPolicyGateway.setActivePolicy('area:scope-1', 'policy-active', 'company-a');
  approvalPolicyGateway.policies.push({
    id: 'policy-active',
    companyId: 'company-a',
    scopeType: 'area',
    scopeNodeId: 'area:scope-1',
    name: 'Ops Approval',
    definition: { steps: ['manager'] },
    isActive: true,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
  hrErpAccessGateway.activeLinks.set('company-a:owner-user', {
    employeeId: 'employee-self',
    userId: 'owner-user',
  });

  return {
    approvalPolicyGateway,
    hrEmployeesGateway,
    hrErpAccessGateway,
    timesheetGateway,
    timesheetApprovalPolicyGateway,
  };
};

const createAuthenticatedApp = async ({
  permissionKeys = [
    'hr.timesheets.read',
    'hr.timesheets.write',
    'hr.timesheets.submit',
    'hr.timesheets.approve',
  ],
}: {
  permissionKeys?: string[];
} = {}) => {
  const authGateway = new InMemoryAuthGateway();
  const sessionTokenService = createSessionTokenService();
  const permissionCalls: PermissionCall[] = [];
  const fixture = createTimesheetFixture();

  authGateway.addUser({
    id: 'owner-user',
    email: 'owner@vimcore.test',
    username: 'owner',
    passwordHash: 'hashed:secret123',
  });
  authGateway.setMemberships('owner-user', [
    {
      companyId: 'company-a',
      role: 'company-user',
      divisionId: null,
      localId: null,
    },
  ]);
  authGateway.setActiveCompany('owner-user', 'company-a');
  authGateway.seedActiveScopeNodeId('owner-user', 'company:company-a');

  const scopeAssignments: ScopeAssignmentRecord[] = [
    {
      companyId: 'company-a',
      userId: 'owner-user',
      scope: { scopeType: 'company', scopeId: 'company-a' },
      mode: 'subtree_inclusive',
    },
  ];

  const app = createApp({
    authIdentityGateway: authGateway,
    passwordHasher,
    provisioningRecorder: applicationErrorRecorder as never,
    sessionTokenService,
    approvalPolicyGateway: fixture.approvalPolicyGateway,
    hrEmployeesGateway: fixture.hrEmployeesGateway as unknown as HrEmployeesGateway,
    hrErpAccessGateway: fixture.hrErpAccessGateway as unknown as ErpAccessGateway,
    timesheetGateway: fixture.timesheetGateway,
    scopeResolver: createInMemoryScopeResolver({
      nodes: [
        {
          ref: { scopeType: 'company', scopeId: 'company-a' },
          parentRef: null,
          companyId: 'company-a',
          name: 'Vimcore',
        },
        {
          ref: { scopeType: 'area', scopeId: 'scope-1' },
          parentRef: { scopeType: 'company', scopeId: 'company-a' },
          companyId: 'company-a',
          name: 'Operations',
        },
        {
          ref: { scopeType: 'area', scopeId: 'scope-2' },
          parentRef: { scopeType: 'company', scopeId: 'company-a' },
          companyId: 'company-a',
          name: 'External',
        },
      ],
      assignments: scopeAssignments,
    }),
    computeEffectivePermissions: async (input) => {
      permissionCalls.push(input);
      return await Promise.resolve(permissionKeys);
    },
    seedAdminEnabled: false,
    nodeEnv: 'test',
  });

  const loginResponse = await request(app).post('/auth/login').send({
    identifier: 'owner',
    password: 'secret123',
  });

  permissionCalls.length = 0;

  return {
    ...fixture,
    app,
    ownerSessionCookie: getSessionCookie(loginResponse.headers['set-cookie']),
    permissionCalls,
  };
};

describe('timesheets router', () => {
  it('supports the 11 timesheet endpoints through createApp', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const createResponse = await request(app)
      .post('/companies/company-a/timesheets')
      .set('Cookie', ownerSessionCookie)
      .send({
        employeeAssignmentId: 'assignment-report',
        periodStart: '2026-08-25',
        periodEnd: '2026-08-31',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body).toMatchObject({
      companyId: 'company-a',
      employeeAssignmentId: 'assignment-report',
      status: 'draft',
    });

    const listResponse = await request(app)
      .get('/companies/company-a/timesheets')
      .set('Cookie', ownerSessionCookie);

    expect(listResponse.status).toBe(200);
    expect(getPeriodIds(listResponse.body)).toEqual(
      expect.arrayContaining(['period-self', 'period-report']),
    );

    const getResponse = await request(app)
      .get('/companies/company-a/timesheets/period-self')
      .set('Cookie', ownerSessionCookie);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toMatchObject({ id: 'period-self' });

    const patchResponse = await request(app)
      .patch('/companies/company-a/timesheets/period-report')
      .set('Cookie', ownerSessionCookie)
      .send({
        periodStart: '2026-08-11',
        periodEnd: '2026-08-18',
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body).toMatchObject({ periodEnd: '2026-08-18' });

    const createEntryResponse = await request(app)
      .post('/companies/company-a/timesheets/period-report/entries')
      .set('Cookie', ownerSessionCookie)
      .send({
        entryDate: '2026-08-14',
        hours: 8,
        projectId: null,
        taskLabel: 'Receiving',
        note: 'Dock 2',
      });

    expect(createEntryResponse.status).toBe(201);
    expect(createEntryResponse.body).toMatchObject({
      periodId: 'period-report',
      entryDate: '2026-08-14',
      taskLabel: 'Receiving',
    });

    const updateEntryResponse = await request(app)
      .patch('/companies/company-a/timesheets/period-report/entries/entry-update')
      .set('Cookie', ownerSessionCookie)
      .send({
        entryDate: '2026-08-12',
        hours: 7.5,
        projectId: 'project-1',
        taskLabel: 'Cycle count',
        note: 'Updated',
      });

    expect(updateEntryResponse.status).toBe(200);
    expect(updateEntryResponse.body).toMatchObject({
      id: 'entry-update',
      hours: 7.5,
      projectId: 'project-1',
    });

    const deleteEntryResponse = await request(app)
      .delete('/companies/company-a/timesheets/period-report/entries/entry-update')
      .set('Cookie', ownerSessionCookie);

    expect(deleteEntryResponse.status).toBe(204);

    const submitResponse = await request(app)
      .post('/companies/company-a/timesheets/period-report/submit')
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body).toMatchObject({
      id: 'period-report',
      status: 'submitted',
      submittedByUserId: 'owner-user',
      approvalPolicyId: 'policy-active',
    });

    const approveResponse = await request(app)
      .post('/companies/company-a/timesheets/period-submitted/approve')
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body).toMatchObject({
      id: 'period-submitted',
      status: 'approved',
      approvedByUserId: 'owner-user',
    });

    const rejectResponse = await request(app)
      .post('/companies/company-a/timesheets/period-self-submitted/reject')
      .set('Cookie', ownerSessionCookie)
      .send({ rejectionReason: 'Missing break detail' });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body).toMatchObject({
      id: 'period-self-submitted',
      status: 'rejected',
      rejectionReason: 'Missing break detail',
    });

    const reopenResponse = await request(app)
      .post('/companies/company-a/timesheets/period-rejected/reopen')
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(reopenResponse.status).toBe(200);
    expect(reopenResponse.body).toMatchObject({
      id: 'period-rejected',
      status: 'draft',
      rejectionReason: null,
    });
  });

  it('maps validation failures to 400 responses', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const createResponse = await request(app)
      .post('/companies/company-a/timesheets')
      .set('Cookie', ownerSessionCookie)
      .send({
        employeeAssignmentId: 'assignment-report',
        periodStart: '2026-08-31',
        periodEnd: '2026-08-25',
      });

    expect(createResponse.status).toBe(400);
    expect(getErrorCode(createResponse.body)).toBe('TIMESHEET_VALIDATION');

    const entryResponse = await request(app)
      .post('/companies/company-a/timesheets/period-report/entries')
      .set('Cookie', ownerSessionCookie)
      .send({
        entryDate: '2026-09-20',
        hours: 8,
        projectId: null,
        taskLabel: 'Overflow',
        note: null,
      });

    expect(entryResponse.status).toBe(400);
    expect(getErrorCode(entryResponse.body)).toBe('TIMESHEET_VALIDATION');

    const rejectResponse = await request(app)
      .post('/companies/company-a/timesheets/period-self-submitted/reject')
      .set('Cookie', ownerSessionCookie)
      .send({ rejectionReason: '   ' });

    expect(rejectResponse.status).toBe(400);
    expect(getErrorCode(rejectResponse.body)).toBe('TIMESHEET_REJECTION_REASON_REQUIRED');
  });

  it('returns 403 when the session lacks timesheet permissions', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp({
      permissionKeys: [],
    });

    const response = await request(app)
      .get('/companies/company-a/timesheets')
      .set('Cookie', ownerSessionCookie);

    expect(response.status).toBe(403);
  });

  it('returns 404 for out-of-scope timesheet access and resolves self/direct-report scopes', async () => {
    const { app, ownerSessionCookie, permissionCalls } = await createAuthenticatedApp();

    const selfResponse = await request(app)
      .get('/companies/company-a/timesheets/period-self')
      .set('Cookie', ownerSessionCookie);

    expect(selfResponse.status).toBe(200);
    expect(permissionCalls.at(-1)?.permissionScope).toEqual({ kind: 'self' });

    const reportResponse = await request(app)
      .get('/companies/company-a/timesheets/period-report')
      .set('Cookie', ownerSessionCookie);

    expect(reportResponse.status).toBe(200);
    expect(permissionCalls.at(-1)?.permissionScope).toEqual({ kind: 'direct_reports' });

    const outsiderResponse = await request(app)
      .get('/companies/company-a/timesheets/period-outsider')
      .set('Cookie', ownerSessionCookie);

    expect(outsiderResponse.status).toBe(404);

    const createOutsiderResponse = await request(app)
      .post('/companies/company-a/timesheets')
      .set('Cookie', ownerSessionCookie)
      .send({
        employeeAssignmentId: 'assignment-outsider',
        periodStart: '2026-08-25',
        periodEnd: '2026-08-31',
      });

    expect(createOutsiderResponse.status).toBe(404);
    expect(getErrorCode(createOutsiderResponse.body)).toBe('TIMESHEET_ASSIGNMENT_NOT_FOUND');
  });

  it('lists scoped period entries for own and direct-report periods, returns empty lists, rejects outsiders, and validates params', async () => {
    const { app, ownerSessionCookie, permissionCalls } = await createAuthenticatedApp();

    const selfEntriesResponse = await request(app)
      .get('/companies/company-a/timesheets/period-self/entries')
      .set('Cookie', ownerSessionCookie);

    expect(selfEntriesResponse.status).toBe(200);
    expect(getEntryIds(selfEntriesResponse.body)).toEqual([]);
    expect(permissionCalls.at(-1)?.permissionScope).toEqual({ kind: 'self' });

    const reportEntriesResponse = await request(app)
      .get('/companies/company-a/timesheets/period-report/entries')
      .set('Cookie', ownerSessionCookie);

    expect(reportEntriesResponse.status).toBe(200);
    expect(getEntryIds(reportEntriesResponse.body)).toEqual(
      expect.arrayContaining(['entry-update', 'entry-duplicate']),
    );
    expect(permissionCalls.at(-1)?.permissionScope).toEqual({ kind: 'direct_reports' });

    const outsiderEntriesResponse = await request(app)
      .get('/companies/company-a/timesheets/period-outsider/entries')
      .set('Cookie', ownerSessionCookie);

    expect(outsiderEntriesResponse.status).toBe(404);
    expect(getErrorCode(outsiderEntriesResponse.body)).toBe('TIMESHEET_PERIOD_NOT_FOUND');

    const invalidParamsResponse = await request(app)
      .get('/companies/%20/timesheets/period-self/entries')
      .set('Cookie', ownerSessionCookie);

    expect(invalidParamsResponse.status).toBe(400);
  });

  it('returns 409 for locked, conflict, and self-approval cases', async () => {
    const { app, ownerSessionCookie } = await createAuthenticatedApp();

    const lockedResponse = await request(app)
      .patch('/companies/company-a/timesheets/period-locked')
      .set('Cookie', ownerSessionCookie)
      .send({
        periodStart: '2026-08-11',
        periodEnd: '2026-08-18',
      });

    expect(lockedResponse.status).toBe(409);
    expect(getErrorCode(lockedResponse.body)).toBe('TIMESHEET_LOCKED');

    const duplicateEntryResponse = await request(app)
      .post('/companies/company-a/timesheets/period-report/entries')
      .set('Cookie', ownerSessionCookie)
      .send({
        entryDate: '2026-08-13',
        hours: 6,
        projectId: null,
        taskLabel: 'Packing',
        note: null,
      });

    expect(duplicateEntryResponse.status).toBe(409);
    expect(getErrorCode(duplicateEntryResponse.body)).toBe('TIMESHEET_ENTRY_CONFLICT');

    const selfApprovalResponse = await request(app)
      .post('/companies/company-a/timesheets/period-self-submitted/approve')
      .set('Cookie', ownerSessionCookie)
      .send({});

    expect(selfApprovalResponse.status).toBe(409);
    expect(getErrorCode(selfApprovalResponse.body)).toBe('TIMESHEET_SELF_APPROVAL');
  });
});
