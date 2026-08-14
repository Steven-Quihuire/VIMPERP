import { afterEach, describe, expect, it } from 'vitest';

import {
  applyMigrationFile,
  applyMigrationsThrough,
  createMigrationTestDatabase,
} from './migration-test-helpers';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length > 0) {
    await cleanups.pop()?.();
  }
});

describe('employee master migration', () => {
  it('adds employee identity and employment status fields', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0022_rrhh_foundation.sql');
    await applyMigrationFile(database.pool, '0023_employee_master.sql');

    const columns = await database.pool.query<{ columnName: string }>(`
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_name = 'employees'
      ORDER BY ordinal_position
    `);

    expect(columns.rows.map((row) => row.columnName)).toEqual([
      'id',
      'company_id',
      'created_at',
      'full_name',
      'document_type',
      'document_number',
      'email',
      'employment_status',
      'hired_at',
      'updated_at',
    ]);
  }, 30000);

  it('enforces valid statuses, paired documents, and unique company documents', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0022_rrhh_foundation.sql');
    await applyMigrationFile(database.pool, '0023_employee_master.sql');
    await database.pool.query(`
      INSERT INTO companies (id, name, status, created_at)
      VALUES ('company-1', 'RRHH Co', 'active', now())
    `);

    await expect(database.pool.query(`
      INSERT INTO employees (id, company_id, full_name, employment_status)
      VALUES ('employee-invalid-status', 'company-1', 'Invalid', 'unknown')
    `)).rejects.toThrow(/employees_employment_status_chk/);

    await expect(database.pool.query(`
      INSERT INTO employees (id, company_id, full_name, document_type)
      VALUES ('employee-invalid-document', 'company-1', 'Invalid', 'DNI')
    `)).rejects.toThrow(/employees_document_pair_chk/);

    await database.pool.query(`
      INSERT INTO employees (id, company_id, full_name, document_type, document_number)
      VALUES ('employee-1', 'company-1', 'One', 'DNI', '123')
    `);

    await expect(database.pool.query(`
      INSERT INTO employees (id, company_id, full_name, document_type, document_number)
      VALUES ('employee-2', 'company-1', 'Two', 'DNI', '123')
    `)).rejects.toThrow(/employees_company_document_idx/);
  }, 30000);
});
