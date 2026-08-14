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

const migrationFile = '0022_rrhh_foundation.sql';

const listTableColumns = async (query: (sql: string, values?: unknown[]) => Promise<{ rows: Array<{ columnName: string }> }>, tableName: string) => {
  const result = await query(
    `
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position ASC
    `,
    [tableName],
  );

  return result.rows.map((row) => row.columnName);
};

describe('rrhh foundation migration', () => {
  it('starts from the live 0021 baseline without employees and creates the RRHH foundation tables in 0022', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0021_node_management_invitations.sql');

    const employeesBefore = await database.pool.query<{ exists: string | null }>(`
      SELECT to_regclass('public.employees')::text AS "exists"
    `);

    expect(employeesBefore.rows[0]?.exists).toBeNull();

    await applyMigrationFile(database.pool, migrationFile);

    const tables = await database.pool.query<{ tableName: string }>(`
      SELECT table_name AS "tableName"
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'employees',
          'positions',
          'employee_assignments',
          'erp_access_links',
          'erp_access_invitations',
          'approval_policies'
        )
      ORDER BY table_name ASC
    `);

    expect(tables.rows.map((row) => row.tableName)).toEqual([
      'approval_policies',
      'employee_assignments',
      'employees',
      'erp_access_invitations',
      'erp_access_links',
      'positions',
    ]);

    await expect(listTableColumns(database.pool.query.bind(database.pool), 'employees')).resolves.toEqual([
      'id',
      'company_id',
      'created_at',
    ]);
    await expect(listTableColumns(database.pool.query.bind(database.pool), 'positions')).resolves.toEqual([
      'id',
      'company_id',
      'name',
      'reports_to_position_id',
      'headcount',
      'is_active',
      'created_at',
    ]);
    await expect(
      listTableColumns(database.pool.query.bind(database.pool), 'employee_assignments'),
    ).resolves.toEqual([
      'id',
      'company_id',
      'employee_id',
      'scope_node_id',
      'position_id',
      'started_at',
      'ended_at',
      'is_primary',
      'created_at',
    ]);
    await expect(listTableColumns(database.pool.query.bind(database.pool), 'erp_access_links')).resolves.toEqual([
      'id',
      'company_id',
      'employee_id',
      'user_id',
      'is_active',
      'created_at',
      'revoked_at',
    ]);
    await expect(
      listTableColumns(database.pool.query.bind(database.pool), 'erp_access_invitations'),
    ).resolves.toEqual([
      'id',
      'company_id',
      'employee_id',
      'invitee_email',
      'token_hash',
      'created_by_user_id',
      'created_at',
      'expires_at',
      'accepted_at',
      'accepted_by_user_id',
    ]);
    await expect(listTableColumns(database.pool.query.bind(database.pool), 'approval_policies')).resolves.toEqual([
      'id',
      'company_id',
      'scope_type',
      'scope_node_id',
      'name',
      'definition',
      'is_active',
      'created_at',
      'updated_at',
    ]);
  }, 30000);

  it('enforces the RRHH foundation partial uniques and CHECK constraints', async () => {
    const database = await createMigrationTestDatabase();
    cleanups.push(database.cleanup);

    await applyMigrationsThrough(database.pool, '0021_node_management_invitations.sql');
    await applyMigrationFile(database.pool, migrationFile);

    await database.pool.query(`
      INSERT INTO companies (id, name, status, created_at)
      VALUES ('company-1', 'RRHH Co', 'active', now())
    `);
    await database.pool.query(`
      INSERT INTO users (id, email, username, password_hash)
      VALUES
        ('user-1', 'owner-1@example.com', 'owner-1', 'hash'),
        ('user-2', 'owner-2@example.com', 'owner-2', 'hash'),
        ('user-3', 'owner-3@example.com', 'owner-3', 'hash')
    `);
    const scopeNode = await database.pool.query<{ id: string }>(`
      SELECT id
      FROM scope_nodes
      WHERE node_type = 'company'
        AND source_id = 'company-1'
      LIMIT 1
    `);

    const scopeCompanyId = scopeNode.rows[0]?.id;

    expect(scopeCompanyId).toBeDefined();
    await database.pool.query(`
      INSERT INTO employees (id, company_id, created_at)
      VALUES
        ('employee-1', 'company-1', now()),
        ('employee-2', 'company-1', now())
    `);
    await database.pool.query(`
      INSERT INTO positions (id, company_id, name, reports_to_position_id, headcount, is_active, created_at)
      VALUES ('position-1', 'company-1', 'People Lead', NULL, 1, true, now())
    `);

    await expect(
      database.pool.query(`
        INSERT INTO positions (id, company_id, name, reports_to_position_id, headcount, is_active, created_at)
        VALUES ('position-negative', 'company-1', 'Impossible Position', NULL, -1, true, now())
      `),
    ).rejects.toThrow(/positions_headcount_nonnegative_chk/);

    await database.pool.query(`
      INSERT INTO employee_assignments (
        id,
        company_id,
        employee_id,
        scope_node_id,
        position_id,
        started_at,
        ended_at,
        is_primary,
        created_at
      )
      VALUES (
        'assignment-1',
        'company-1',
        'employee-1',
        '${scopeCompanyId}',
        'position-1',
        now(),
        NULL,
        true,
        now()
      )
    `);

    await expect(
      database.pool.query(`
        INSERT INTO employee_assignments (
          id,
          company_id,
          employee_id,
          scope_node_id,
          position_id,
          started_at,
          ended_at,
          is_primary,
          created_at
        )
        VALUES (
          'assignment-2',
          'company-1',
          'employee-1',
          '${scopeCompanyId}',
          'position-1',
          now(),
          NULL,
          true,
          now()
        )
      `),
    ).rejects.toThrow(/employee_assignments_active_primary_idx/);

    await database.pool.query(`
      INSERT INTO erp_access_links (
        id,
        company_id,
        employee_id,
        user_id,
        is_active,
        created_at,
        revoked_at
      )
      VALUES ('link-1', 'company-1', 'employee-1', 'user-1', true, now(), NULL)
    `);

    await expect(
      database.pool.query(`
        INSERT INTO erp_access_links (
          id,
          company_id,
          employee_id,
          user_id,
          is_active,
          created_at,
          revoked_at
        )
        VALUES ('link-2', 'company-1', 'employee-1', 'user-2', true, now(), NULL)
      `),
    ).rejects.toThrow(/erp_access_links_active_employee_idx/);

    await expect(
      database.pool.query(`
        INSERT INTO erp_access_links (
          id,
          company_id,
          employee_id,
          user_id,
          is_active,
          created_at,
          revoked_at
        )
        VALUES ('link-3', 'company-1', 'employee-2', 'user-1', true, now(), NULL)
      `),
    ).rejects.toThrow(/erp_access_links_active_user_idx/);

    await expect(
      database.pool.query(`
        INSERT INTO erp_access_invitations (
          id,
          company_id,
          employee_id,
          invitee_email,
          token_hash,
          created_by_user_id,
          created_at,
          expires_at,
          accepted_at,
          accepted_by_user_id
        )
        VALUES (
          'invitation-bad',
          'company-1',
          'employee-1',
          'invitee@example.com',
          'token-hash-1',
          'user-1',
          now(),
          now() + interval '1 day',
          now(),
          NULL
        )
      `),
    ).rejects.toThrow(/erp_access_invitations_acceptance_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO approval_policies (
          id,
          company_id,
          scope_type,
          scope_node_id,
          name,
          definition,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          'policy-bad-company',
          'company-1',
          'company',
          '${scopeCompanyId}',
          'Company Policy',
          '{}'::jsonb,
          true,
          now(),
          now()
        )
      `),
    ).rejects.toThrow(/approval_policies_scope_company_chk/);

    await expect(
      database.pool.query(`
        INSERT INTO approval_policies (
          id,
          company_id,
          scope_type,
          scope_node_id,
          name,
          definition,
          is_active,
          created_at,
          updated_at
        )
        VALUES (
          'policy-bad-node',
          'company-1',
          'division',
          NULL,
          'Division Policy',
          '{}'::jsonb,
          true,
          now(),
          now()
        )
      `),
    ).rejects.toThrow(/approval_policies_scope_node_required_chk/);
  }, 30000);
});
