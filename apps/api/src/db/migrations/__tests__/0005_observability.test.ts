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

describe('0005_observability migration', () => {
  it('creates the enums and append-only observability tables with the expected column types', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationFile(database.pool, '0005_observability.sql');

    const enumValuesResult = await database.pool.query<{ enumName: string; enumValue: string }>(
      `SELECT
        t.typname AS "enumName",
        e.enumlabel AS "enumValue"
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname IN ('provisioning_status', 'provisioning_step_status')
      ORDER BY t.typname ASC, e.enumsortorder ASC`,
    );

    const tableColumnsResult = await database.pool.query<{
      tableName: string;
      columnName: string;
      dataType: string;
    }>(
      `SELECT
        table_name AS "tableName",
        column_name AS "columnName",
        data_type AS "dataType"
      FROM information_schema.columns
      WHERE table_name IN ('provisioning_runs', 'provisioning_steps', 'application_errors')
        AND column_name IN (
          'status',
          'detail',
          'context',
          'attempt',
          'idempotency_key'
        )
      ORDER BY table_name ASC, column_name ASC`,
    );

    expect(enumValuesResult.rows).toEqual([
      { enumName: 'provisioning_status', enumValue: 'running' },
      { enumName: 'provisioning_status', enumValue: 'succeeded' },
      { enumName: 'provisioning_status', enumValue: 'failed' },
      { enumName: 'provisioning_status', enumValue: 'incomplete' },
      { enumName: 'provisioning_step_status', enumValue: 'pending' },
      { enumName: 'provisioning_step_status', enumValue: 'succeeded' },
      { enumName: 'provisioning_step_status', enumValue: 'failed' },
      { enumName: 'provisioning_step_status', enumValue: 'skipped' },
    ]);
    expect(tableColumnsResult.rows).toEqual([
      { tableName: 'application_errors', columnName: 'context', dataType: 'jsonb' },
      { tableName: 'application_errors', columnName: 'status', dataType: 'text' },
      { tableName: 'provisioning_runs', columnName: 'attempt', dataType: 'integer' },
      { tableName: 'provisioning_runs', columnName: 'idempotency_key', dataType: 'text' },
      { tableName: 'provisioning_runs', columnName: 'status', dataType: 'USER-DEFINED' },
      { tableName: 'provisioning_steps', columnName: 'attempt', dataType: 'integer' },
      { tableName: 'provisioning_steps', columnName: 'detail', dataType: 'jsonb' },
      { tableName: 'provisioning_steps', columnName: 'status', dataType: 'USER-DEFINED' },
    ]);
  });

  it('enforces the partial unique idempotency key per process while allowing null keys', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0005_observability.sql');

    await database.pool.query(
      `INSERT INTO provisioning_runs (
        id,
        correlation_id,
        request_id,
        actor_user_id,
        process,
        status,
        attempt,
        idempotency_key,
        error_summary,
        created_at,
        updated_at
      ) VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
        ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        'run-null-1',
        'corr-null-1',
        'req-null-1',
        'user-1',
        'company-onboarding',
        'running',
        1,
        null,
        null,
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-01-01T00:00:00.000Z'),
        'run-null-2',
        'corr-null-2',
        'req-null-2',
        'user-2',
        'company-onboarding',
        'running',
        1,
        null,
        null,
        new Date('2026-01-01T00:01:00.000Z'),
        new Date('2026-01-01T00:01:00.000Z'),
      ],
    );

    await database.pool.query(
      `INSERT INTO provisioning_runs (
        id,
        correlation_id,
        request_id,
        actor_user_id,
        process,
        status,
        attempt,
        idempotency_key,
        error_summary,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        'run-key-1',
        'corr-key-1',
        'req-key-1',
        'user-1',
        'company-onboarding',
        'running',
        1,
        'idem-1',
        null,
        new Date('2026-01-01T00:02:00.000Z'),
        new Date('2026-01-01T00:02:00.000Z'),
      ],
    );

    await expect(
      database.pool.query(
        `INSERT INTO provisioning_runs (
          id,
          correlation_id,
          request_id,
          actor_user_id,
          process,
          status,
          attempt,
          idempotency_key,
          error_summary,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          'run-key-2',
          'corr-key-2',
          'req-key-2',
          'user-2',
          'company-onboarding',
          'running',
          1,
          'idem-1',
          null,
          new Date('2026-01-01T00:03:00.000Z'),
          new Date('2026-01-01T00:03:00.000Z'),
        ],
      ),
    ).rejects.toThrow(/unique/i);
  });
});
