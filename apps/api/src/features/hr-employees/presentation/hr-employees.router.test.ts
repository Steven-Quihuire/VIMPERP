import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../../app/create-app';
import type { AdminGateway } from '../../admin/domain/admin';
import type {
  AuthIdentityGateway,
  AuthMembership,
  AuthSessionRecord,
  AuthUser,
  PasswordHasher,
  SessionTokenService,
} from '../../identity/domain/auth';
import { createInMemoryScopeResolver } from '../../../shared/infrastructure/scope-hierarchy/scope-hierarchy.port';
import type {
  Employee,
  HrEmployeesGateway,
  ScopeNodeRecord,
} from '../domain/employees';
import type { EmployeeAssignment } from '../domain/employee-assignments';
import type { Position } from '../domain/positions';

class InMemoryAuthGateway implements AuthIdentityGateway {
  private usersById = new Map<string, AuthUser>();
  private usersByIdentifier = new Map<string, AuthUser>();
  private sessions = new Map<string, AuthSessionRecord>();
  private membershipsByUserId = new Map<string, AuthMembership[]>();
  private activeCompanyByUserId = new Map<string, string | null>();

  addUser(user: AuthUser) {
    this.usersById.set(user.id, user);
    this.usersByIdentifier.set(user.email.toLowerCase(), user);
    this.usersByIdentifier.set(user.username.toLowerCase(), user);
  }

  setMemberships(userId: string, memberships: AuthMembership[]) {
    this.membershipsByUserId.set(userId, memberships);
  }

  async findUserByIdentifier(identifier: string) {
    return await Promise.resolve(this.usersByIdentifier.get(identifier.toLowerCase()) ?? null);
  }
  async findUserById(userId: string) {
    return await Promise.resolve(this.usersById.get(userId) ?? null);
  }
  async createUser(user: AuthUser) {
    this.addUser(user);
    await Promise.resolve();
  }
  async createUserWithSession(user: AuthUser, session: AuthSessionRecord) {
    this.addUser(user);
    this.sessions.set(session.token, session);
    await Promise.resolve();
  }
  async createSession(session: AuthSessionRecord) {
    this.sessions.set(session.token, session);
    await Promise.resolve();
  }
  async findSession(token: string) {
    return await Promise.resolve(this.sessions.get(token) ?? null);
  }
  async deleteSession(token: string) {
    this.sessions.delete(token);
    await Promise.resolve();
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
  async setActiveCompanyId(userId: string, companyId: string) {
    this.activeCompanyByUserId.set(userId, companyId);
    await Promise.resolve();
  }
  async findActiveScopeNodeId() {
    return await Promise.resolve('company:company-1');
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
    return await Promise.resolve('company-1');
  }
  async countRecentActiveCompanySwitches() {
    return await Promise.resolve(0);
  }
  async recordActiveCompanySwitch() {
    await Promise.resolve();
  }
}

class InMemoryHrEmployeesGateway implements HrEmployeesGateway {
  employees: Employee[] = [];
  positions: Position[] = [];
  assignments: EmployeeAssignment[] = [];
  scopeNodes: ScopeNodeRecord[] = [
    {
      id: 'company:company-1',
      companyId: 'company-1',
      nodeType: 'company',
      sourceId: 'company-1',
      parentScopeNodeId: null,
      name: 'Vimcore',
    },
  ];

  createEmployee(input: { companyId: string }) {
    const employee: Employee = {
      id: `employee-${this.employees.length + 1}`,
      companyId: input.companyId,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
    };
    this.employees.push(employee);
    return Promise.resolve(employee);
  }
  async updateEmployee(
    companyId: string,
    employeeId: string,
    input?: Parameters<HrEmployeesGateway['updateEmployee']>[2],
  ) {
    const employee = await this.getEmployeeById(companyId, employeeId);
    if (employee && input) {
      Object.assign(employee, input);
    }
    return employee;
  }
  getEmployeeById(companyId: string, employeeId: string) {
    return Promise.resolve(
      this.employees.find(
        (employee) => employee.companyId === companyId && employee.id === employeeId,
      ) ?? null
    );
  }
  deleteEmployee(companyId: string, employeeId: string) {
    this.employees = this.employees.filter(
      (employee) =>
        !(employee.companyId === companyId && employee.id === employeeId),
    );
    return Promise.resolve(null);
  }
  listEmployees(companyId: string) {
    return Promise.resolve(this.employees.filter((employee) => employee.companyId === companyId));
  }
  createPosition(input: {
    companyId: string;
    name: string;
    reportsToPositionId: string | null;
    headcount: number;
    isActive: boolean;
  }) {
    const position: Position = {
      id: `position-${this.positions.length + 1}`,
      companyId: input.companyId,
      name: input.name,
      reportsToPositionId: input.reportsToPositionId,
      headcount: input.headcount,
      occupiedHeadcount: 0,
      remainingVacancies: input.headcount,
      isActive: input.isActive,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
    };
    this.positions.push(position);
    return Promise.resolve(position);
  }
  getPositionById(companyId: string, positionId: string) {
    return Promise.resolve(
      this.positions.find(
        (position) => position.companyId === companyId && position.id === positionId,
      ) ?? null
    );
  }
  async updatePositionReportsTo(
    companyId: string,
    positionId: string,
    reportsToPositionId: string,
  ) {
    const position = await this.getPositionById(companyId, positionId);
    if (position) {
      position.reportsToPositionId = reportsToPositionId;
    }
    return position;
  }
  async listPositions(companyId: string) {
    return await Promise.all(
      this.positions
        .filter((position) => position.companyId === companyId)
        .map(async (position) => {
          const occupiedHeadcount = await this.countActivePrimaryAssignmentsForPosition(position.id);
          return {
            ...position,
            occupiedHeadcount,
            remainingVacancies: position.headcount - occupiedHeadcount,
          };
        }),
    );
  }
  countActivePrimaryAssignmentsForPosition(positionId: string) {
    return Promise.resolve(this.assignments.filter(
      (assignment) => assignment.positionId === positionId && assignment.isPrimary && assignment.endedAt === null,
    ).length);
  }
  findScopeNode(companyId: string, scopeNodeId: string) {
    return Promise.resolve(
      this.scopeNodes.find(
        (scopeNode) => scopeNode.companyId === companyId && scopeNode.id === scopeNodeId,
      ) ?? null
    );
  }
  createAssignment(input: Parameters<HrEmployeesGateway['createAssignment']>[0]) {
    const activePrimary = this.assignments.find(
      (assignment) =>
        assignment.companyId === input.companyId &&
        assignment.employeeId === input.employeeId &&
        assignment.isPrimary &&
        assignment.endedAt === null,
    );
    if (activePrimary) {
      activePrimary.endedAt = input.startedAt;
    }
    const assignment: EmployeeAssignment = {
      id: `assignment-${this.assignments.length + 1}`,
      companyId: input.companyId,
      employeeId: input.employeeId,
      scopeNodeId: input.scopeNodeId,
      positionId: input.positionId,
      startedAt: input.startedAt,
      endedAt: null,
      isPrimary: input.isPrimary,
      createdAt: input.createdAt,
    };
    this.assignments.push(assignment);
    return Promise.resolve(assignment);
  }

  listAssignmentHistory(companyId: string, employeeId: string) {
    return Promise.resolve(this.assignments
      .filter((assignment) => assignment.companyId === companyId && assignment.employeeId === employeeId)
      .map((assignment) => ({
        ...assignment,
        positionName: this.positions.find((position) => position.id === assignment.positionId)?.name ?? '',
        scopeNodeName: this.scopeNodes.find((node) => node.id === assignment.scopeNodeId)?.name ?? '',
      })));
  }
  getActivePrimaryAssignmentByEmployeeId(companyId: string, employeeId: string) {
    return Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.employeeId === employeeId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null
    );
  }
  getActivePrimaryAssignmentByPositionId(companyId: string, positionId: string) {
    return Promise.resolve(
      this.assignments.find(
        (assignment) =>
          assignment.companyId === companyId &&
          assignment.positionId === positionId &&
          assignment.isPrimary &&
          assignment.endedAt === null,
      ) ?? null
    );
  }
  listDirectReportAssignments(companyId: string, managerPositionId: string) {
    const directReportPositionIds = this.positions
      .filter(
        (position) =>
          position.companyId === companyId && position.reportsToPositionId === managerPositionId,
      )
      .map((position) => position.id);

    return Promise.resolve(this.assignments.filter(
      (assignment) =>
        assignment.companyId === companyId &&
        assignment.isPrimary &&
        assignment.endedAt === null &&
        directReportPositionIds.includes(assignment.positionId),
    ));
  }
}

const adminGateway: AdminGateway = {
  getCompanySummary: async () => await Promise.resolve({ totalCompanies: 0, notificationCount: 0, auditEventCount: 0, companies: [] }),
  listNotifications: async () => await Promise.resolve([]),
  listNotificationsForCompanyRole: async () => await Promise.resolve([]),
  listProvisioningRuns: async () => await Promise.resolve({ items: [], nextCursor: null }),
  getProvisioningRun: async () => await Promise.resolve({ id: 'run-1', correlationId: 'corr-1', requestId: 'req-1', actorUserId: 'user-1', companyName: 'Vimcore Labs', process: 'company-onboarding', status: 'succeeded', attempt: 1, idempotencyKey: null, errorSummary: null, createdAt: '2026-07-28T10:00:00.000Z', updatedAt: '2026-07-28T10:01:00.000Z', steps: [] }),
  listApplicationErrors: async () => await Promise.resolve({ items: [], nextCursor: null }),
  getApplicationError: async () => await Promise.resolve({ id: 'error-1', correlationId: 'corr-1', requestId: 'req-1', fingerprint: 'fingerprint-1', status: '500', code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error', stack: null, context: null, createdAt: '2026-07-28T10:00:00.000Z' }),
  listAuditEvents: async () => await Promise.resolve({ items: [], nextCursor: null }),
  getAuditEvent: async () => await Promise.resolve({ id: 'audit-1', actorUserId: 'user-1', companyId: 'company-1', type: 'company.created', correlationId: 'corr-1', entityType: 'company', entityId: 'company-1', details: {}, oldValues: null, newValues: null, createdAt: '2026-07-28T10:00:00.000Z' }),
};

const passwordHasher: PasswordHasher = {
  hash: async (value) => await Promise.resolve(`hashed:${value}`),
  verify: async (hash, value) => await Promise.resolve(hash === `hashed:${value}`),
};

const sessionTokenService: SessionTokenService = {
  create: () => 'session-token',
};

const getSessionCookie = (headers: string | string[] | undefined): string => {
  const cookieHeaders = Array.isArray(headers) ? headers : headers ? [headers] : [];
  const [sessionCookie] = cookieHeaders;
  if (!sessionCookie) throw new Error('missing session cookie');
  const [cookieValue] = sessionCookie.split(';');
  if (!cookieValue) throw new Error('missing session cookie');
  return cookieValue;
};

describe('hr employees routes', () => {
  it('creates employees and positions, assigns reporting lines, and resolves manager/direct reports', async () => {
    const authGateway = new InMemoryAuthGateway();
    authGateway.addUser({
      id: 'owner-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    authGateway.setMemberships('owner-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    await authGateway.setActiveCompanyId('owner-1', 'company-1');

    const hrEmployeesGateway = new InMemoryHrEmployeesGateway();
    hrEmployeesGateway.positions.push({
      id: 'position-company-2',
      companyId: 'company-2',
      name: 'Other Company Lead',
      reportsToPositionId: null,
      headcount: 1,
      occupiedHeadcount: 0,
      remainingVacancies: 1,
      isActive: true,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
    });

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      computeEffectivePermissions: () => Promise.resolve([
        'hr.employees.read',
        'hr.employees.write',
        'hr.employees.assign',
        'hr.positions.read',
        'hr.positions.write',
      ]),
      hrEmployeesGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({
        nodes: [
          {
            ref: { scopeType: 'company', scopeId: 'company-1' },
            parentRef: null,
            companyId: 'company-1',
            name: 'Vimcore',
          },
        ],
        assignments: [
          {
            companyId: 'company-1',
            userId: 'owner-1',
            scope: { scopeType: 'company', scopeId: 'company-1' },
            mode: 'subtree_inclusive',
          },
        ],
      }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const createManagerResponse = await request(app)
      .post('/companies/company-1/hr-employees')
      .set('Cookie', sessionCookie)
      .send({ fullName: 'People Manager' });
    expect(createManagerResponse.status).toBe(201);
    const manager = createManagerResponse.body as { id: string };

    const createReportResponse = await request(app)
      .post('/companies/company-1/hr-employees')
      .set('Cookie', sessionCookie)
      .send({ fullName: 'HR Analyst' });
    expect(createReportResponse.status).toBe(201);
    const report = createReportResponse.body as { id: string };

    const createLeadPositionResponse = await request(app)
      .post('/companies/company-1/hr-employees/positions')
      .set('Cookie', sessionCookie)
      .send({ name: 'People Lead', reportsToPositionId: null, headcount: 2, isActive: true });
    expect(createLeadPositionResponse.status).toBe(201);
    const leadPosition = createLeadPositionResponse.body as { id: string };
    expect(createLeadPositionResponse.body).toMatchObject({
      occupiedHeadcount: 0,
      remainingVacancies: 2,
    });

    const createAnalystPositionResponse = await request(app)
      .post('/companies/company-1/hr-employees/positions')
      .set('Cookie', sessionCookie)
      .send({
        name: 'HR Analyst',
        reportsToPositionId: leadPosition.id,
        headcount: 2,
        isActive: true,
      });
    expect(createAnalystPositionResponse.status).toBe(201);
    const analystPosition = createAnalystPositionResponse.body as { id: string };

    const managerAssignmentResponse = await request(app)
      .post(`/companies/company-1/hr-employees/${manager.id}/assignments`)
      .set('Cookie', sessionCookie)
      .send({
        scopeNodeId: 'company:company-1',
        positionId: leadPosition.id,
        startedAt: '2026-08-13T12:00:00.000Z',
      });
    expect(managerAssignmentResponse.status).toBe(201);
    const managerAssignment = managerAssignmentResponse.body as { id: string };

    const reportAssignmentResponse = await request(app)
      .post(`/companies/company-1/hr-employees/${report.id}/assignments`)
      .set('Cookie', sessionCookie)
      .send({
        scopeNodeId: 'company:company-1',
        positionId: analystPosition.id,
        startedAt: '2026-08-13T12:30:00.000Z',
      });
    expect(reportAssignmentResponse.status).toBe(201);
    const reportAssignment = reportAssignmentResponse.body as { id: string };

    const listedPositionsResponse = await request(app)
      .get('/companies/company-1/hr-employees/positions')
      .set('Cookie', sessionCookie);
    expect(listedPositionsResponse.status).toBe(200);
    expect(listedPositionsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: leadPosition.id,
          occupiedHeadcount: 1,
          remainingVacancies: 1,
        }),
      ]),
    );

    const missingParentResponse = await request(app)
      .post('/companies/company-1/hr-employees/positions')
      .set('Cookie', sessionCookie)
      .send({ name: 'Missing Parent', reportsToPositionId: 'missing-position', headcount: 1, isActive: true });
    expect(missingParentResponse.status).toBe(404);
    expect((missingParentResponse.body as { error: { code: string } }).error.code).toBe('HR_POSITION_PARENT_NOT_FOUND');

    const crossCompanyParentResponse = await request(app)
      .post('/companies/company-1/hr-employees/positions')
      .set('Cookie', sessionCookie)
      .send({ name: 'Cross Company Child', reportsToPositionId: 'position-company-2', headcount: 1, isActive: true });
    expect(crossCompanyParentResponse.status).toBe(404);
    expect((crossCompanyParentResponse.body as { error: { code: string } }).error.code).toBe('HR_POSITION_PARENT_NOT_FOUND');

    const managerResponse = await request(app)
      .get(`/companies/company-1/hr-employees/${report.id}/reports/manager`)
      .set('Cookie', sessionCookie);
    expect(managerResponse.status).toBe(200);
    expect(managerResponse.body).toEqual({
      employeeId: manager.id,
      positionId: leadPosition.id,
      assignmentId: managerAssignment.id,
    });

    const directReportsResponse = await request(app)
      .get(`/companies/company-1/hr-employees/${manager.id}/reports/direct`)
      .set('Cookie', sessionCookie);
    expect(directReportsResponse.status).toBe(200);
    expect(directReportsResponse.body).toEqual([
      {
        employeeId: report.id,
        positionId: analystPosition.id,
        assignmentId: reportAssignment.id,
      },
    ]);

    const assignmentHistoryResponse = await request(app)
      .get(`/companies/company-1/hr-employees/${report.id}/assignments`)
      .set('Cookie', sessionCookie);
    expect(assignmentHistoryResponse.status).toBe(200);
    expect(assignmentHistoryResponse.body).toEqual([
      expect.objectContaining({
        employeeId: report.id,
        positionName: 'HR Analyst',
        scopeNodeName: 'Vimcore',
        isPrimary: true,
        endedAt: null,
      }),
    ]);

    const updateResponse = await request(app)
      .patch(`/companies/company-1/hr-employees/${report.id}`)
      .set('Cookie', sessionCookie)
      .send({ fullName: 'HR Analyst Updated', employmentStatus: 'suspended' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body).toMatchObject({
      fullName: 'HR Analyst Updated',
      employmentStatus: 'suspended',
    });

    const crossCompanyResponse = await request(app)
      .get('/companies/company-2/hr-employees')
      .set('Cookie', sessionCookie);
    expect(crossCompanyResponse.status).toBe(403);
  });

  it('creates an employee with an initial assignment and derives the reporting line from the chosen manager', async () => {
    const authGateway = new InMemoryAuthGateway();
    authGateway.addUser({
      id: 'owner-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    authGateway.setMemberships('owner-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    await authGateway.setActiveCompanyId('owner-1', 'company-1');

    const hrEmployeesGateway = new InMemoryHrEmployeesGateway();
    hrEmployeesGateway.positions.push({
      id: 'position-lead',
      companyId: 'company-1',
      name: 'People Lead',
      reportsToPositionId: null,
      headcount: 2,
      occupiedHeadcount: 0,
      remainingVacancies: 2,
      isActive: true,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
    });
    hrEmployeesGateway.positions.push({
      id: 'position-analyst',
      companyId: 'company-1',
      name: 'HR Analyst',
      reportsToPositionId: null,
      headcount: 2,
      occupiedHeadcount: 0,
      remainingVacancies: 2,
      isActive: true,
      createdAt: new Date('2026-08-13T12:00:00.000Z'),
    });

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      computeEffectivePermissions: () => Promise.resolve([
        'hr.employees.read',
        'hr.employees.write',
        'hr.employees.assign',
        'hr.positions.read',
        'hr.positions.write',
      ]),
      hrEmployeesGateway,
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({
        nodes: [
          {
            ref: { scopeType: 'company', scopeId: 'company-1' },
            parentRef: null,
            companyId: 'company-1',
            name: 'Vimcore',
          },
        ],
        assignments: [
          {
            companyId: 'company-1',
            userId: 'owner-1',
            scope: { scopeType: 'company', scopeId: 'company-1' },
            mode: 'subtree_inclusive',
          },
        ],
      }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const createManagerResponse = await request(app)
      .post('/companies/company-1/hr-employees')
      .set('Cookie', sessionCookie)
      .send({ fullName: 'People Manager' });
    expect(createManagerResponse.status).toBe(201);
    const manager = createManagerResponse.body as { id: string };

    const managerAssignmentResponse = await request(app)
      .post(`/companies/company-1/hr-employees/${manager.id}/assignments`)
      .set('Cookie', sessionCookie)
      .send({
        scopeNodeId: 'company:company-1',
        positionId: 'position-lead',
        startedAt: '2026-08-13T12:00:00.000Z',
      });
    expect(managerAssignmentResponse.status).toBe(201);

    const createEmployeeResponse = await request(app)
      .post('/companies/company-1/hr-employees')
      .set('Cookie', sessionCookie)
      .send({
        fullName: 'Analyst With Manager',
        positionId: 'position-analyst',
        scopeNodeId: 'company:company-1',
        managerId: manager.id,
        hiredAt: '2026-08-14',
      });
    expect(createEmployeeResponse.status).toBe(201);
    const employee = createEmployeeResponse.body as { id: string };

    const assignmentHistoryResponse = await request(app)
      .get(`/companies/company-1/hr-employees/${employee.id}/assignments`)
      .set('Cookie', sessionCookie);
    expect(assignmentHistoryResponse.status).toBe(200);
    expect(assignmentHistoryResponse.body).toEqual([
      expect.objectContaining({
        employeeId: employee.id,
        positionId: 'position-analyst',
        scopeNodeId: 'company:company-1',
        positionName: 'HR Analyst',
        scopeNodeName: 'Vimcore',
        isPrimary: true,
        endedAt: null,
      }),
    ]);

    const managerResponse = await request(app)
      .get(`/companies/company-1/hr-employees/${employee.id}/reports/manager`)
      .set('Cookie', sessionCookie);
    expect(managerResponse.status).toBe(200);
    expect(managerResponse.body).toEqual({
      employeeId: manager.id,
      positionId: 'position-lead',
      assignmentId: managerAssignmentResponse.body.id,
    });

    const listedPositionsResponse = await request(app)
      .get('/companies/company-1/hr-employees/positions')
      .set('Cookie', sessionCookie);
    expect(listedPositionsResponse.status).toBe(200);
    expect(listedPositionsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'position-analyst',
          reportsToPositionId: 'position-lead',
          occupiedHeadcount: 1,
          remainingVacancies: 1,
        }),
      ]),
    );
  });

  it('returns 403 when the session lacks HR employee permissions', async () => {
    const authGateway = new InMemoryAuthGateway();
    authGateway.addUser({
      id: 'owner-1',
      email: 'owner@vimcore.test',
      username: 'owner',
      passwordHash: 'hashed:secret123',
    });
    authGateway.setMemberships('owner-1', [
      { companyId: 'company-1', role: 'company-owner', divisionId: null, localId: null },
    ]);
    await authGateway.setActiveCompanyId('owner-1', 'company-1');

    const app = createApp({
      adminGateway,
      authIdentityGateway: authGateway,
      computeEffectivePermissions: () => Promise.resolve([]),
      hrEmployeesGateway: new InMemoryHrEmployeesGateway(),
      passwordHasher,
      sessionTokenService,
      scopeResolver: createInMemoryScopeResolver({
        nodes: [
          {
            ref: { scopeType: 'company', scopeId: 'company-1' },
            parentRef: null,
            companyId: 'company-1',
            name: 'Vimcore',
          },
        ],
        assignments: [
          {
            companyId: 'company-1',
            userId: 'owner-1',
            scope: { scopeType: 'company', scopeId: 'company-1' },
            mode: 'subtree_inclusive',
          },
        ],
      }),
      seedAdminEnabled: false,
      nodeEnv: 'test',
    });

    const loginResponse = await request(app).post('/auth/login').send({
      identifier: 'owner',
      password: 'secret123',
    });
    const sessionCookie = getSessionCookie(loginResponse.headers['set-cookie']);

    const response = await request(app)
      .get('/companies/company-1/hr-employees')
      .set('Cookie', sessionCookie);

    expect(response.status).toBe(403);
  });
});
