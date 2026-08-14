import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

import { createArgon2PasswordHasher } from '../features/identity/infrastructure/argon2-password-hasher';
import { hrPermissionKeys, permissionCatalogSeeds } from '../features/roles-management/domain/permissions';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@127.0.0.1:5432/vimcore';

const ownerUser = {
  id: 'e2e-owner-user',
  email: 'owner@vimcore.test',
  username: 'owner',
  password: 'secret123',
};

const deleteFromIfExists = async (pool: Pool, tableName: string, whereClause?: string) => {
  const result = await pool.query<{ exists: string | null }>(
    'SELECT to_regclass($1) AS exists',
    [tableName],
  );

  if (!result.rows[0]?.exists) {
    return;
  }

  await pool.query(
    `DELETE FROM ${tableName}${whereClause ? ` WHERE ${whereClause}` : ''}`,
  );
};

const activeScopeRuntime = {
  userId: 'runtime-active-scope-user',
  email: 'scope-owner@vimcore.test',
  username: 'scope-owner',
  password: 'secret123',
  companyId: 'runtime-active-scope-company',
  companyName: 'Runtime Scope Co',
  roleId: 'runtime-active-scope-role',
  divisionId: 'runtime-active-scope-division',
  localId: 'runtime-active-scope-local',
  areaId: 'runtime-active-scope-area',
  warehouseId: 'runtime-active-scope-warehouse',
  pointOfSaleId: 'runtime-active-scope-pos',
  localItemId: '11111111-1111-1111-1111-111111111111',
  companyItemId: '22222222-2222-2222-2222-222222222222',
  foreignCompanyId: 'runtime-active-scope-company-foreign',
  foreignCompanyName: 'Runtime Scope Foreign Co',
  foreignDivisionId: 'runtime-active-scope-division-foreign',
  foreignLocalId: 'runtime-active-scope-local-foreign',
  foreignAreaId: 'runtime-active-scope-area-foreign',
  foreignWarehouseId: 'runtime-active-scope-warehouse-foreign',
  foreignPointOfSaleId: 'runtime-active-scope-pos-foreign',
};

const clearTables = async (pool: Pool) => {
  await pool.query('DELETE FROM provisioning_steps');
  await pool.query('DELETE FROM provisioning_runs');
  await pool.query('DELETE FROM items');
  await pool.query('DELETE FROM item_categories');
  await deleteFromIfExists(pool, 'approval_policies');
  await deleteFromIfExists(pool, 'erp_access_invitations');
  await deleteFromIfExists(pool, 'erp_access_links');
  await deleteFromIfExists(pool, 'employee_assignments');
  await deleteFromIfExists(pool, 'positions');
  await pool.query('DELETE FROM points_of_sale');
  await pool.query('DELETE FROM warehouses');
  await deleteFromIfExists(pool, 'employees');
  await pool.query('DELETE FROM areas');
  await pool.query('DELETE FROM locals');
  await pool.query('DELETE FROM divisions');
  await pool.query('DELETE FROM company_services');
  await pool.query('DELETE FROM privacy_consents');
  await pool.query('DELETE FROM privacy_policy_acceptances');
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM memberships');
  await pool.query('DELETE FROM user_preferences');
  await pool.query('DELETE FROM theme_preferences');
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM audit_events');
  await pool.query('DELETE FROM stale_role_assignments');
  await pool.query('DELETE FROM role_assignments');
  await pool.query('DELETE FROM role_permissions');
  await pool.query('DELETE FROM roles');
  await pool.query('DELETE FROM company_profiles');
  await pool.query('DELETE FROM scope_nodes');
  await pool.query('DELETE FROM companies');
  await pool.query('DELETE FROM users');
};

const clearRuntimeTestData = async (pool: Pool) => {
  await pool.query('BEGIN');

  try {
    await pool.query(`
      CREATE TEMP TABLE runtime_test_users ON COMMIT DROP AS
      SELECT id
      FROM users
      WHERE email LIKE '%@vimcore.test'
    `);

    await pool.query(`
      CREATE TEMP TABLE runtime_test_companies ON COMMIT DROP AS
      SELECT DISTINCT c.id
      FROM companies c
      LEFT JOIN memberships m ON m.company_id = c.id
      LEFT JOIN users u ON u.id = m.user_id
      LEFT JOIN company_profiles p ON p.company_id = c.id
      WHERE u.id IN (SELECT id FROM runtime_test_users)
         OR c.id LIKE 'runtime-%'
         OR c.name LIKE 'Runtime %'
         OR p.legal_identifier LIKE 'RUNTIME-%'
         OR p.legal_identifier = 'RFC-PR1-001'
    `);

    await pool.query(
      `DELETE FROM items WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM item_categories WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await deleteFromIfExists(
      pool,
      'approval_policies',
      'company_id IN (SELECT id FROM runtime_test_companies)',
    );
    await deleteFromIfExists(
      pool,
      'erp_access_invitations',
      'company_id IN (SELECT id FROM runtime_test_companies)',
    );
    await deleteFromIfExists(
      pool,
      'erp_access_links',
      'company_id IN (SELECT id FROM runtime_test_companies)',
    );
    await deleteFromIfExists(
      pool,
      'employee_assignments',
      'company_id IN (SELECT id FROM runtime_test_companies)',
    );
    await deleteFromIfExists(
      pool,
      'positions',
      'company_id IN (SELECT id FROM runtime_test_companies)',
    );
    await pool.query(`
      DELETE FROM provisioning_steps
      WHERE run_id IN (
        SELECT id FROM provisioning_runs
        WHERE actor_user_id IN (SELECT id FROM runtime_test_users)
      )
    `);
    await pool.query(
      `DELETE FROM provisioning_runs WHERE actor_user_id IN (SELECT id FROM runtime_test_users)`,
    );
    await pool.query(
      `DELETE FROM notifications WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(`
      DELETE FROM audit_events
      WHERE company_id IN (SELECT id FROM runtime_test_companies)
         OR actor_user_id IN (SELECT id FROM runtime_test_users)
    `);
    await pool.query(
      `DELETE FROM company_services WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(`
      DELETE FROM user_preferences
      WHERE user_id IN (SELECT id FROM runtime_test_users)
         OR active_company_id IN (SELECT id FROM runtime_test_companies)
    `);
    await pool.query(
      `DELETE FROM points_of_sale WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM warehouses WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await deleteFromIfExists(
      pool,
      'employees',
      'company_id IN (SELECT id FROM runtime_test_companies)',
    );
    await pool.query(
      `DELETE FROM areas WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM locals WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM divisions WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM company_profiles WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM privacy_consents WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM privacy_policy_acceptances WHERE user_id IN (SELECT id FROM runtime_test_users)`,
    );
    await pool.query(`
      DELETE FROM theme_preferences
      WHERE user_id IN (SELECT id FROM runtime_test_users)
         OR company_id IN (SELECT id FROM runtime_test_companies)
    `);
    await pool.query(
      `DELETE FROM sessions WHERE user_id IN (SELECT id FROM runtime_test_users)`,
    );
    await pool.query(`
      DELETE FROM role_assignments
      WHERE user_id IN (SELECT id FROM runtime_test_users)
         OR company_id IN (SELECT id FROM runtime_test_companies)
    `);
    await pool.query(
      `DELETE FROM stale_role_assignments WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM role_permissions
       WHERE role_id IN (
         SELECT id FROM roles WHERE company_id IN (SELECT id FROM runtime_test_companies)
       )`,
    );
    await pool.query(
      `DELETE FROM roles WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(`
      DELETE FROM memberships
      WHERE user_id IN (SELECT id FROM runtime_test_users)
         OR company_id IN (SELECT id FROM runtime_test_companies)
    `);
    await pool.query(
      `DELETE FROM scope_nodes WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM companies WHERE id IN (SELECT id FROM runtime_test_companies)`,
    );
    await pool.query(
      `DELETE FROM users WHERE id IN (SELECT id FROM runtime_test_users)`,
    );

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
};

const seedOwner = async (pool: Pool) => {
  const passwordHasher = createArgon2PasswordHasher();
  const passwordHash = await passwordHasher.hash(ownerUser.password);

  await pool.query(
    `
      INSERT INTO users (id, email, username, password_hash)
      VALUES ($1, $2, $3, $4)
    `,
    [ownerUser.id, ownerUser.email, ownerUser.username, passwordHash],
  );
};

const seedActiveScopeHierarchy = async (pool: Pool) => {
  await clearRuntimeTestData(pool);

  const passwordHasher = createArgon2PasswordHasher();
  const passwordHash = await passwordHasher.hash(activeScopeRuntime.password);
  const now = new Date();

  await pool.query('BEGIN');

  try {
    await pool.query(
      `INSERT INTO users (id, email, username, password_hash)
       VALUES ($1, $2, $3, $4)`,
      [
        activeScopeRuntime.userId,
        activeScopeRuntime.email,
        activeScopeRuntime.username,
        passwordHash,
      ],
    );

    await pool.query(
      `INSERT INTO companies (id, name, status, created_at)
       VALUES
         ($1, $2, 'active', $5),
         ($3, $4, 'active', $5)`,
      [
        activeScopeRuntime.companyId,
        activeScopeRuntime.companyName,
        activeScopeRuntime.foreignCompanyId,
        activeScopeRuntime.foreignCompanyName,
        now,
      ],
    );

    await pool.query(
      `INSERT INTO memberships (user_id, company_id, division_id, local_id, role)
       VALUES ($1, $2, NULL, NULL, 'company-owner')`,
      [activeScopeRuntime.userId, activeScopeRuntime.companyId],
    );

    await pool.query(
      `INSERT INTO roles (id, company_id, key, name, is_system, created_at)
       VALUES ($1, $2, 'company-owner', 'Company Owner', true, $3)`,
      [activeScopeRuntime.roleId, activeScopeRuntime.companyId, now],
    );

    await pool.query(
      `INSERT INTO divisions (id, company_id, name, created_at)
       VALUES
         ($1, $2, 'Runtime Division', $5),
         ($3, $4, 'Foreign Division', $5)`,
      [
        activeScopeRuntime.divisionId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.foreignDivisionId,
        activeScopeRuntime.foreignCompanyId,
        now,
      ],
    );

    await pool.query(
      `INSERT INTO locals (id, company_id, division_id, name, locale)
       VALUES
         ($1, $2, $3, 'Runtime Local', NULL),
         ($4, $5, $6, 'Foreign Local', NULL)`,
      [
        activeScopeRuntime.localId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.divisionId,
        activeScopeRuntime.foreignLocalId,
        activeScopeRuntime.foreignCompanyId,
        activeScopeRuntime.foreignDivisionId,
      ],
    );

    await pool.query(
      `INSERT INTO areas (id, company_id, division_id, local_id, name, kind, created_at)
       VALUES
         ($1, $2, NULL, $3, 'Runtime Area', 'area', $7),
         ($4, $5, NULL, $6, 'Foreign Area', 'area', $7)`,
      [
        activeScopeRuntime.areaId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.localId,
        activeScopeRuntime.foreignAreaId,
        activeScopeRuntime.foreignCompanyId,
        activeScopeRuntime.foreignLocalId,
        now,
      ],
    );

    await pool.query(
      `INSERT INTO warehouses (id, company_id, area_id, local_id, name, created_at)
       VALUES
         ($1, $2, $3, NULL, 'Runtime Warehouse', $7),
         ($4, $5, $6, NULL, 'Foreign Warehouse', $7)`,
      [
        activeScopeRuntime.warehouseId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.areaId,
        activeScopeRuntime.foreignWarehouseId,
        activeScopeRuntime.foreignCompanyId,
        activeScopeRuntime.foreignAreaId,
        now,
      ],
    );

    await pool.query(
      `INSERT INTO points_of_sale (id, company_id, area_id, local_id, name, created_at)
       VALUES
         ($1, $2, $3, NULL, 'Runtime POS', $7),
         ($4, $5, $6, NULL, 'Foreign POS', $7)`,
      [
        activeScopeRuntime.pointOfSaleId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.areaId,
        activeScopeRuntime.foreignPointOfSaleId,
        activeScopeRuntime.foreignCompanyId,
        activeScopeRuntime.foreignAreaId,
        now,
      ],
    );

    const scopeNodeResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM scope_nodes
       WHERE node_type = 'company' AND source_id = $1`,
      [activeScopeRuntime.companyId],
    );
    const localScopeNodeResult = await pool.query<{ id: string }>(
      `SELECT id
       FROM scope_nodes
       WHERE node_type = 'local' AND source_id = $1`,
      [activeScopeRuntime.localId],
    );
    const companyScopeNodeId = scopeNodeResult.rows[0]?.id;
    const localScopeNodeId = localScopeNodeResult.rows[0]?.id;

    if (!companyScopeNodeId || !localScopeNodeId) {
      throw new Error('Expected scope_nodes rows for seeded runtime hierarchy.');
    }

    await pool.query(
      `INSERT INTO role_assignments (id, company_id, user_id, role_id, scope_node_id, mode, scope_type, scope_id, created_at)
       VALUES ($1, $2, $3, $4, $5, 'subtree_inclusive', 'company', $2, $6)`,
      [
        'runtime-active-scope-assignment-1',
        activeScopeRuntime.companyId,
        activeScopeRuntime.userId,
        activeScopeRuntime.roleId,
        companyScopeNodeId,
        now,
      ],
    );

    await pool.query(
      `INSERT INTO user_preferences (user_id, active_company_id, active_local_id, active_scope_node_id)
       VALUES ($1, $2, $3, $4)`,
      [
        activeScopeRuntime.userId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.localId,
        localScopeNodeId,
      ],
    );

    await pool.query(
      `INSERT INTO items (id, company_id, local_id, category_id, sku, name, type, unit, unit_price, tracks_stock, track_batch_mode, deleted_at, created_at, updated_at)
       VALUES
         ($1, $3, $4, NULL, 'LOCAL-1', 'Local Only Item', 'product', 'unit', 10, true, 'none', NULL, $5, $5),
         ($2, $3, NULL, NULL, 'COMPANY-1', 'Company Only Item', 'product', 'unit', 12, true, 'none', NULL, $5, $5)`,
      [
        activeScopeRuntime.localItemId,
        activeScopeRuntime.companyItemId,
        activeScopeRuntime.companyId,
        activeScopeRuntime.localId,
        now,
      ],
    );

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
};

const seedRrhhFoundation = async (pool: Pool) => {
  await seedActiveScopeHierarchy(pool);

  await pool.query('BEGIN');

  try {
    const existingPermissions = await pool.query<{ key: string }>(
      'SELECT key FROM permissions',
    );
    const existingKeys = new Set(existingPermissions.rows.map((permission) => permission.key));
    const missingPermissions = permissionCatalogSeeds.filter(
      (permission) => !existingKeys.has(permission.key),
    );

    for (const permission of missingPermissions) {
      await pool.query(
        'INSERT INTO permissions (id, key, family) VALUES ($1, $2, $3)',
        [randomUUID(), permission.key, permission.family],
      );
    }

    const roleResult = await pool.query<{ id: string }>(
      'SELECT id FROM roles WHERE company_id = $1 AND key = $2 LIMIT 1',
      [activeScopeRuntime.companyId, 'company-owner'],
    );
    const ownerRoleId = roleResult.rows[0]?.id;

    if (!ownerRoleId) {
      throw new Error('Expected a company-owner role for RRHH runtime seeding.');
    }

    for (const permissionKey of hrPermissionKeys) {
      await pool.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, permissions.id
         FROM permissions
         WHERE permissions.key = $2
         ON CONFLICT DO NOTHING`,
        [ownerRoleId, permissionKey],
      );
    }

    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
};

const main = async () => {
  const mode = process.argv[2] ?? 'reset-and-seed-owner';
  const pool = new Pool({
    connectionString: databaseUrl,
    allowExitOnIdle: true,
    max: 1,
  });

  try {
    if (mode === 'reset-and-seed-owner') {
      await clearTables(pool);
      await seedOwner(pool);
    } else if (mode === 'seed-active-scope-hierarchy') {
      await seedActiveScopeHierarchy(pool);
    } else if (mode === 'seed-rrhh-foundation') {
      await seedRrhhFoundation(pool);
    } else if (mode === 'cleanup-runtime') {
      await clearRuntimeTestData(pool);
    } else {
      throw new Error(`Unknown e2e state mode: ${mode}`);
    }
  } finally {
    await pool.end();
  }
};

void main();
