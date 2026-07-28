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

describe('0003_company_services migration', () => {
  it('backfills distinct trimmed services from legacy JSON text while preserving the source column', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0002_moaning_stature.sql');

    await database.pool.query(
      `INSERT INTO company_profiles (
        company_id,
        legal_identifier,
        services,
        country,
        city,
        exact_location,
        contact_phone,
        contact_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        'company-1',
        'AR-123',
        JSON.stringify(['Payroll', ' Payroll ', 'Tax', '', 'Tax']),
        'AR',
        'Buenos Aires',
        'Avenida Siempre Viva 123',
        '+54 11 5555 5555',
        'ops@vimcore.test',
      ],
    );

    await applyMigrationFile(database.pool, '0003_company_services.sql');

    const servicesResult = await database.pool.query<{ name: string }>(
      `SELECT name FROM company_services WHERE company_id = $1 ORDER BY name ASC`,
      ['company-1'],
    );
    const profileResult = await database.pool.query<{ services: string }>(
      `SELECT services FROM company_profiles WHERE company_id = $1`,
      ['company-1'],
    );

    expect(servicesResult.rows).toEqual([{ name: 'Payroll' }, { name: 'Tax' }]);
    expect(profileResult.rows).toEqual([
      {
        services: JSON.stringify(['Payroll', ' Payroll ', 'Tax', '', 'Tax']),
      },
    ]);
  });

  it('skips blank or empty service arrays during the backfill', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0002_moaning_stature.sql');

    await database.pool.query(
      `INSERT INTO company_profiles (
        company_id,
        legal_identifier,
        services,
        country,
        city,
        exact_location,
        contact_phone,
        contact_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        'company-empty',
        'AR-EMPTY',
        JSON.stringify([]),
        'AR',
        'Cordoba',
        'Street 1',
        '+54 351 000 0000',
        'empty@vimcore.test',
        'company-blank',
        'AR-BLANK',
        JSON.stringify(['   ', '']),
        'AR',
        'Rosario',
        'Street 2',
        '+54 341 000 0000',
        'blank@vimcore.test',
      ],
    );

    await applyMigrationFile(database.pool, '0003_company_services.sql');

    const servicesResult = await database.pool.query(
      `SELECT company_id, name FROM company_services ORDER BY company_id ASC, name ASC`,
    );

    expect(servicesResult.rows).toEqual([]);
  });

  it('skips malformed legacy service text without aborting the migration', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0002_moaning_stature.sql');

    await database.pool.query(
      `INSERT INTO company_profiles (
        company_id,
        legal_identifier,
        services,
        country,
        city,
        exact_location,
        contact_phone,
        contact_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        'company-invalid-json',
        'AR-INVALID',
        'not-json-at-all',
        'AR',
        'Mendoza',
        'Street 3',
        '+54 261 000 0000',
        'invalid@vimcore.test',
        'company-valid-json',
        'AR-VALID',
        JSON.stringify(['Payroll']),
        'AR',
        'Salta',
        'Street 4',
        '+54 387 000 0000',
        'valid@vimcore.test',
      ],
    );

    await applyMigrationFile(database.pool, '0003_company_services.sql');

    const servicesResult = await database.pool.query<{ companyId: string; name: string }>(
      `SELECT company_id AS "companyId", name
       FROM company_services
       ORDER BY company_id ASC, name ASC`,
    );

    expect(servicesResult.rows).toEqual([
      { companyId: 'company-valid-json', name: 'Payroll' },
    ]);
  });

  it('skips non-array legacy JSON without aborting the migration', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0002_moaning_stature.sql');

    await database.pool.query(
      `INSERT INTO company_profiles (
        company_id,
        legal_identifier,
        services,
        country,
        city,
        exact_location,
        contact_phone,
        contact_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8), ($9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        'company-object-json',
        'AR-OBJECT',
        JSON.stringify({ primary: 'Payroll' }),
        'AR',
        'La Plata',
        'Street 5',
        '+54 221 000 0000',
        'object@vimcore.test',
        'company-array-json',
        'AR-ARRAY',
        JSON.stringify(['Tax']),
        'AR',
        'Mar del Plata',
        'Street 6',
        '+54 223 000 0000',
        'array@vimcore.test',
      ],
    );

    await applyMigrationFile(database.pool, '0003_company_services.sql');

    const servicesResult = await database.pool.query<{ companyId: string; name: string }>(
      `SELECT company_id AS "companyId", name
       FROM company_services
       ORDER BY company_id ASC, name ASC`,
    );

    expect(servicesResult.rows).toEqual([
      { companyId: 'company-array-json', name: 'Tax' },
    ]);
  });
});
