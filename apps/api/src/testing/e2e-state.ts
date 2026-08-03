import { Pool } from 'pg';

import { createArgon2PasswordHasher } from '../features/identity/infrastructure/argon2-password-hasher';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@127.0.0.1:5432/vimcore';

const ownerUser = {
  id: 'e2e-owner-user',
  email: 'owner@vimcore.test',
  username: 'owner',
  password: 'secret123',
};

const clearTables = async (pool: Pool) => {
  await pool.query('DELETE FROM provisioning_steps');
  await pool.query('DELETE FROM provisioning_runs');
  await pool.query('DELETE FROM items');
  await pool.query('DELETE FROM item_categories');
  await pool.query('DELETE FROM company_services');
  await pool.query('DELETE FROM privacy_consents');
  await pool.query('DELETE FROM privacy_policy_acceptances');
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM memberships');
  await pool.query('DELETE FROM user_preferences');
  await pool.query('DELETE FROM theme_preferences');
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM audit_events');
  await pool.query('DELETE FROM branches');
  await pool.query('DELETE FROM company_profiles');
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
    await pool.query(
      `DELETE FROM branches WHERE company_id IN (SELECT id FROM runtime_test_companies)`,
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
    await pool.query(`
      DELETE FROM user_preferences
      WHERE user_id IN (SELECT id FROM runtime_test_users)
         OR active_company_id IN (SELECT id FROM runtime_test_companies)
    `);
    await pool.query(
      `DELETE FROM sessions WHERE user_id IN (SELECT id FROM runtime_test_users)`,
    );
    await pool.query(`
      DELETE FROM memberships
      WHERE user_id IN (SELECT id FROM runtime_test_users)
         OR company_id IN (SELECT id FROM runtime_test_companies)
    `);
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
