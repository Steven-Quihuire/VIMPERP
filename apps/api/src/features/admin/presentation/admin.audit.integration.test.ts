import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { createApp } from '../../../app/create-app';
import {
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from '../../../db/migrations/__tests__/migration-test-helpers';
import { createArgon2PasswordHasher } from '../../identity/infrastructure/argon2-password-hasher';
import { orgHierarchyAuditEventTypes } from '../../org-hierarchy/domain/org-hierarchy';

const runtimeIds = {
  platformAdminUserId: `runtime-platform-admin-user-${randomUUID()}`,
  ownerCompanyAUserId: `runtime-owner-company-a-${randomUUID()}`,
  ownerCompanyBUserId: `runtime-owner-company-b-${randomUUID()}`,
  companyAId: `runtime-company-a-${randomUUID()}`,
  companyBId: `runtime-company-b-${randomUUID()}`,
  platformAdminEmail: `runtime-platform-admin-${randomUUID()}@vimcore.test`,
  ownerCompanyAEmail: `runtime-owner-a-${randomUUID()}@vimcore.test`,
  ownerCompanyBEmail: `runtime-owner-b-${randomUUID()}@vimcore.test`,
  platformAdminUsername: `runtime-platform-admin-${randomUUID()}`,
  ownerCompanyAUsername: `runtime-owner-a-${randomUUID()}`,
  ownerCompanyBUsername: `runtime-owner-b-${randomUUID()}`,
};

type AuditEventResponse = {
  id: string;
  companyId: string;
  type: string;
  entityType: string;
  entityId?: string;
};

type AuditEventsResponseBody = {
  auditEvents: AuditEventResponse[];
  nextCursor: string | null;
};

const auditEventsBody = (response: { body: unknown }): AuditEventsResponseBody =>
  response.body as AuditEventsResponseBody;

const latestMigrationFile = '0027_inventory_foundation.sql';
let currentDatabase: Awaited<ReturnType<typeof createMigrationTestDatabase>> | null = null;

const getSessionCookie = (headers: string | string[] | undefined): string => {
  const cookieHeaders = Array.isArray(headers) ? headers : headers ? [headers] : [];

  if (!cookieHeaders.length) {
    throw new Error('missing session cookie');
  }

  const [sessionCookie] = cookieHeaders;

  if (!sessionCookie) {
    throw new Error('missing session cookie');
  }

  const [cookieValue] = sessionCookie.split(';');

  if (!cookieValue) {
    throw new Error('missing session cookie');
  }

  return cookieValue;
};

afterEach(() => {
  currentDatabase = null;
});

const seedRuntimeAdminAuditFixture = async () => {
  currentDatabase = await createMigrationTestDatabase();
  await applyMigrationsThrough(currentDatabase.pool, latestMigrationFile);

  const pool = currentDatabase.pool;
  const passwordHasher = createArgon2PasswordHasher();
  const passwordHash = await passwordHasher.hash('secret123');
  const now = new Date('2026-08-12T10:00:00.000Z');

  try {
    await pool.query('BEGIN');
    await pool.query(
      `INSERT INTO users (id, email, username, password_hash)
       VALUES
         ($1, $2, $3, $4),
         ($5, $6, $7, $4),
         ($8, $9, $10, $4)`,
      [
        runtimeIds.platformAdminUserId,
        runtimeIds.platformAdminEmail,
        runtimeIds.platformAdminUsername,
        passwordHash,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyAEmail,
        runtimeIds.ownerCompanyAUsername,
        runtimeIds.ownerCompanyBUserId,
        runtimeIds.ownerCompanyBEmail,
        runtimeIds.ownerCompanyBUsername,
      ],
    );
    await pool.query(
      `INSERT INTO companies (id, name, status, created_at)
       VALUES
         ($1, $2, 'active', $5),
         ($3, $4, 'active', $5)`,
      [runtimeIds.companyAId, 'Runtime Company A', runtimeIds.companyBId, 'Runtime Company B', now],
    );
    await pool.query(
      `INSERT INTO memberships (user_id, company_id, division_id, local_id, role)
       VALUES
         ($1, NULL, NULL, NULL, 'platform-admin'),
         ($2, $4, NULL, NULL, 'company-owner'),
         ($3, $5, NULL, NULL, 'company-owner')`,
      [
        runtimeIds.platformAdminUserId,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyBUserId,
        runtimeIds.companyAId,
        runtimeIds.companyBId,
      ],
    );
    await pool.query(
      `INSERT INTO user_preferences (user_id, active_company_id)
       VALUES
         ($1, $2),
         ($3, $4)`,
      [
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.companyAId,
        runtimeIds.ownerCompanyBUserId,
        runtimeIds.companyBId,
      ],
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }

  return currentDatabase.connectionString;
};

const loginAs = async (app: ReturnType<typeof createApp>, username: string) => {
  const response = await request(app).post('/auth/login').send({
    identifier: username,
    password: 'secret123',
  });

  expect(response.status).toBe(204);

  return getSessionCookie(response.headers['set-cookie']);
};

describe('admin audit routes integration', () => {
  it('persists org-tree audit events and filters them by company through the platform admin audit path', async () => {
    const databaseUrl = await seedRuntimeAdminAuditFixture();

    const app = createApp({
      databaseUrl,
      nodeEnv: 'test',
      seedAdminEnabled: false,
      sessionCookieName: `vimcore_session_${randomUUID()}`,
    });

    const [platformAdminCookie, companyAOwnerCookie, companyBOwnerCookie] = await Promise.all([
      loginAs(app, runtimeIds.platformAdminUsername),
      loginAs(app, runtimeIds.ownerCompanyAUsername),
      loginAs(app, runtimeIds.ownerCompanyBUsername),
    ]);

    const createDivisionResponse = await request(app)
      .post(`/companies/${runtimeIds.companyAId}/divisions`)
      .set('Cookie', platformAdminCookie)
      .send({ name: 'Retail' });

    expect(createDivisionResponse.status).toBe(403);

    const createDivisionAsOwnerResponse = await request(app)
      .post(`/companies/${runtimeIds.companyAId}/divisions`)
      .set('Cookie', companyAOwnerCookie)
      .send({ name: 'Retail' });

    expect(createDivisionAsOwnerResponse.status).toBe(201);

    const divisionId = (createDivisionAsOwnerResponse.body as { id: string }).id;

    const createLocalResponse = await request(app)
      .post(`/companies/${runtimeIds.companyAId}/locals`)
      .set('Cookie', companyAOwnerCookie)
      .send({ name: 'Store A', divisionId });

    expect(createLocalResponse.status).toBe(201);

    const localId = (createLocalResponse.body as { id: string }).id;

    const updateLocalResponse = await request(app)
      .patch(`/locals/${localId}`)
      .set('Cookie', companyAOwnerCookie)
      .send({ name: 'Store A Prime' });

    expect(updateLocalResponse.status).toBe(200);

    const createAreaResponse = await request(app)
      .post(`/companies/${runtimeIds.companyAId}/areas`)
      .set('Cookie', companyAOwnerCookie)
      .send({ name: 'Operations', localId });

    expect(createAreaResponse.status).toBe(201);

    const createOtherDivisionResponse = await request(app)
      .post(`/companies/${runtimeIds.companyBId}/divisions`)
      .set('Cookie', companyBOwnerCookie)
      .send({ name: 'North Division' });

    expect(createOtherDivisionResponse.status).toBe(201);

    const companyAEventsResponse = await request(app)
      .get('/admin/audit-events')
      .query({ companyId: runtimeIds.companyAId, limit: '10' })
      .set('Cookie', platformAdminCookie);

    expect(companyAEventsResponse.status).toBe(200);
    const companyAEvents = auditEventsBody(companyAEventsResponse);
    expect(companyAEvents.nextCursor).toBeNull();
    expect(companyAEvents.auditEvents).toHaveLength(4);
    expect(companyAEvents.auditEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          companyId: runtimeIds.companyAId,
          type: orgHierarchyAuditEventTypes.divisionCreated,
          entityType: 'division',
          entityId: divisionId,
        }),
        expect.objectContaining({
          companyId: runtimeIds.companyAId,
          type: orgHierarchyAuditEventTypes.localCreated,
          entityType: 'local',
          entityId: localId,
        }),
        expect.objectContaining({
          companyId: runtimeIds.companyAId,
          type: orgHierarchyAuditEventTypes.localUpdated,
          entityType: 'local',
          entityId: localId,
        }),
        expect.objectContaining({
          companyId: runtimeIds.companyAId,
          type: orgHierarchyAuditEventTypes.areaCreated,
          entityType: 'area',
        }),
      ]),
    );
    expect(
      companyAEvents.auditEvents.every(
        (event) =>
          event.companyId === runtimeIds.companyAId &&
          event.type.startsWith('org_hierarchy.'),
      ),
    ).toBe(true);

    const companyBEventsResponse = await request(app)
      .get('/admin/audit-events')
      .query({ companyId: runtimeIds.companyBId, limit: '10' })
      .set('Cookie', platformAdminCookie);

    expect(companyBEventsResponse.status).toBe(200);
    const companyBEvents = auditEventsBody(companyBEventsResponse);
    expect(companyBEvents.auditEvents).toHaveLength(1);
    expect(companyBEvents.auditEvents[0]).toMatchObject({
      companyId: runtimeIds.companyBId,
      type: orgHierarchyAuditEventTypes.divisionCreated,
      entityType: 'division',
    });

    const areaCreatedEvent = companyAEvents.auditEvents.find(
      (event) => event.type === orgHierarchyAuditEventTypes.areaCreated,
    );

    expect(areaCreatedEvent).toBeDefined();

    const detailResponse = await request(app)
      .get(`/admin/audit-events/${areaCreatedEvent!.id}`)
      .set('Cookie', platformAdminCookie);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body).toMatchObject({
      id: areaCreatedEvent!.id,
      companyId: runtimeIds.companyAId,
      type: orgHierarchyAuditEventTypes.areaCreated,
      entityType: 'area',
      details: { source: 'org-hierarchy', entityType: 'area' },
      oldValues: null,
      newValues: {
        name: 'Operations',
        divisionId: null,
        localId,
      },
    });
  });
});
