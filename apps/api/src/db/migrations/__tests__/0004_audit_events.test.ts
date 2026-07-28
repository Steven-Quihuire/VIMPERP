import { afterEach, describe, expect, it } from 'vitest';

import {
  applyMigrationFile,
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from './migration-test-helpers';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    const cleanup = cleanups.pop();

    if (cleanup) {
      await cleanup();
    }
  }
});

describe('0004_audit_events migration', () => {
  it('casts legacy details text into jsonb and adds the observability columns', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0003_company_services.sql');

    await database.pool.query(
      `INSERT INTO audit_events (
        id,
        actor_user_id,
        company_id,
        type,
        details,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        'audit-1',
        'user-1',
        'company-1',
        'company.created',
        JSON.stringify({ legalIdentifier: 'AR-123', services: ['Payroll'] }),
        new Date('2026-01-01T00:00:00.000Z'),
      ],
    );

    await applyMigrationFile(database.pool, '0004_audit_events.sql');

    const detailsResult = await database.pool.query<{
      details: { legalIdentifier: string; services: string[] };
      detailsType: string;
      correlationId: string | null;
      entityType: string | null;
      entityId: string | null;
      oldValues: unknown;
      newValues: unknown;
    }>(
      `SELECT
        details,
        pg_typeof(details)::text AS "detailsType",
        correlation_id AS "correlationId",
        entity_type AS "entityType",
        entity_id AS "entityId",
        old_values AS "oldValues",
        new_values AS "newValues"
      FROM audit_events
      WHERE id = $1`,
      ['audit-1'],
    );

    const columnsResult = await database.pool.query<{
      columnName: string;
      dataType: string;
    }>(
      `SELECT
        column_name AS "columnName",
        data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name = 'audit_events'
        AND column_name IN (
          'correlation_id',
          'entity_type',
          'entity_id',
          'old_values',
          'new_values'
        )
      ORDER BY column_name ASC`,
    );

    expect(detailsResult.rows).toEqual([
      {
        details: {
          legalIdentifier: 'AR-123',
          services: ['Payroll'],
        },
        detailsType: 'jsonb',
        correlationId: null,
        entityType: null,
        entityId: null,
        oldValues: null,
        newValues: null,
      },
    ]);
    expect(columnsResult.rows).toEqual([
      { columnName: 'correlation_id', dataType: 'text' },
      { columnName: 'entity_id', dataType: 'text' },
      { columnName: 'entity_type', dataType: 'text' },
      { columnName: 'new_values', dataType: 'jsonb' },
      { columnName: 'old_values', dataType: 'jsonb' },
    ]);
  });

  it('creates the audit inspection indexes for company chronology and correlation lookups', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0004_audit_events.sql');

    const indexesResult = await database.pool.query<{ indexdef: string }>(
      `SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'audit_events'
      ORDER BY indexname ASC`,
    );

    expect(indexesResult.rows.map((row) => row.indexdef)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('(company_id, created_at)'),
        expect.stringContaining('(correlation_id)'),
      ]),
    );
  });

  it('replaces malformed legacy details text with a safe marker instead of aborting the migration', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0003_company_services.sql');

    await database.pool.query(
      `INSERT INTO audit_events (
        id,
        actor_user_id,
        company_id,
        type,
        details,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6), ($7, $8, $9, $10, $11, $12)`,
      [
        'audit-invalid',
        'user-1',
        'company-1',
        'company.updated',
        'apiKey=super-secret {bad json',
        new Date('2026-01-02T00:00:00.000Z'),
        'audit-valid',
        'user-2',
        'company-1',
        'company.created',
        JSON.stringify({ ok: true }),
        new Date('2026-01-03T00:00:00.000Z'),
      ],
    );

    await applyMigrationFile(database.pool, '0004_audit_events.sql');

    const detailsResult = await database.pool.query<{
      id: string;
      details: unknown;
      detailsType: string;
    }>(
      `SELECT
        id,
        details,
        pg_typeof(details)::text AS "detailsType"
      FROM audit_events
      ORDER BY id ASC`,
    );

    expect(detailsResult.rows).toEqual([
      {
        id: 'audit-invalid',
        details: { malformedLegacyDetails: true },
        detailsType: 'jsonb',
      },
      {
        id: 'audit-valid',
        details: { ok: true },
        detailsType: 'jsonb',
      },
    ]);
    expect(JSON.stringify(detailsResult.rows[0]?.details)).not.toContain('super-secret');
  });
});
