import { randomUUID } from 'node:crypto';

import { afterEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import request from 'supertest';

import { createApp } from '../../../app/create-app';
import { applyMigrationsThrough } from '../../../db/migrations/__tests__/migration-test-helpers';
import { createArgon2PasswordHasher } from '../../identity/infrastructure/argon2-password-hasher';
import { orgHierarchyAuditEventTypes } from '../../org-hierarchy/domain/org-hierarchy';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';

const runtimeIds = {
  platformAdminUserId: 'runtime-platform-admin-user',
  ownerCompanyAUserId: 'runtime-owner-company-a',
  ownerCompanyBUserId: 'runtime-owner-company-b',
  companyAId: 'runtime-company-a',
  companyBId: 'runtime-company-b',
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

const latestMigrationFile = '0019_org_hierarchy_company_integrity.sql';

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

const cleanupRuntimeAdminAuditFixture = async () => {
  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true, max: 1 });

  try {
    await pool.query('BEGIN');
    await pool.query(
      `DELETE FROM audit_events
       WHERE company_id IN ($1, $2)
          OR actor_user_id IN ($3, $4, $5)`,
      [
        runtimeIds.companyAId,
        runtimeIds.companyBId,
        runtimeIds.platformAdminUserId,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyBUserId,
      ],
    );
    await pool.query(
      `DELETE FROM areas WHERE company_id IN ($1, $2)`,
      [runtimeIds.companyAId, runtimeIds.companyBId],
    );
    await pool.query(
      `DELETE FROM locals WHERE company_id IN ($1, $2)`,
      [runtimeIds.companyAId, runtimeIds.companyBId],
    );
    await pool.query(
      `DELETE FROM divisions WHERE company_id IN ($1, $2)`,
      [runtimeIds.companyAId, runtimeIds.companyBId],
    );
    await pool.query(
      `DELETE FROM sessions WHERE user_id IN ($1, $2, $3)`,
      [
        runtimeIds.platformAdminUserId,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyBUserId,
      ],
    );
    await pool.query(
      `DELETE FROM user_preferences WHERE user_id IN ($1, $2, $3)`,
      [
        runtimeIds.platformAdminUserId,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyBUserId,
      ],
    );
    await pool.query(
      `DELETE FROM memberships
       WHERE user_id IN ($1, $2, $3)
          OR company_id IN ($4, $5)`,
      [
        runtimeIds.platformAdminUserId,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyBUserId,
        runtimeIds.companyAId,
        runtimeIds.companyBId,
      ],
    );
    await pool.query(
      `DELETE FROM scope_nodes WHERE company_id IN ($1, $2)`,
      [runtimeIds.companyAId, runtimeIds.companyBId],
    );
    await pool.query(
      `DELETE FROM companies WHERE id IN ($1, $2)`,
      [runtimeIds.companyAId, runtimeIds.companyBId],
    );
    await pool.query(
      `DELETE FROM users WHERE id IN ($1, $2, $3)`,
      [
        runtimeIds.platformAdminUserId,
        runtimeIds.ownerCompanyAUserId,
        runtimeIds.ownerCompanyBUserId,
      ],
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  } finally {
    await pool.end();
  }
};

afterEach(async () => {
  await cleanupRuntimeAdminAuditFixture();
});

const seedRuntimeAdminAuditFixture = async () => {
  const migrationPool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true, max: 1 });

  try {
    const schemaCheck = await migrationPool.query<{ exists: string | null }>(
      'SELECT to_regclass($1) AS exists',
      ['public.audit_events'],
    );

    if (!schemaCheck.rows[0]?.exists) {
      await applyMigrationsThrough(migrationPool, latestMigrationFile);
    }
  } finally {
    await migrationPool.end();
  }

  await cleanupRuntimeAdminAuditFixture();

  const pool = new Pool({ connectionString: databaseUrl, allowExitOnIdle: true, max: 1 });
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
        'runtime-platform-admin@vimcore.test',
        'runtime-platform-admin',
        passwordHash,
        runtimeIds.ownerCompanyAUserId,
        'runtime-owner-a@vimcore.test',
        'runtime-owner-a',
        runtimeIds.ownerCompanyBUserId,
        'runtime-owner-b@vimcore.test',
        'runtime-owner-b',
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
  } finally {
    await pool.end();
  }
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
    await seedRuntimeAdminAuditFixture();

    const app = createApp({
      databaseUrl,
      nodeEnv: 'test',
      seedAdminEnabled: false,
      sessionCookieName: `vimcore_session_${randomUUID()}`,
    });

    const [platformAdminCookie, companyAOwnerCookie, companyBOwnerCookie] = await Promise.all([
      loginAs(app, 'runtime-platform-admin'),
      loginAs(app, 'runtime-owner-a'),
      loginAs(app, 'runtime-owner-b'),
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
