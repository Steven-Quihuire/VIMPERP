import { Pool } from 'pg';

import { createArgon2PasswordHasher } from '../features/identity/infrastructure/argon2-password-hasher';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';

const ownerUser = {
  id: 'e2e-owner-user',
  email: 'owner@vimcore.test',
  username: 'owner',
  password: 'secret123',
};

const clearTables = async (pool: Pool) => {
  await pool.query('DELETE FROM sessions');
  await pool.query('DELETE FROM memberships');
  await pool.query('DELETE FROM theme_preferences');
  await pool.query('DELETE FROM notifications');
  await pool.query('DELETE FROM audit_events');
  await pool.query('DELETE FROM branches');
  await pool.query('DELETE FROM company_profiles');
  await pool.query('DELETE FROM companies');
  await pool.query('DELETE FROM users');
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
    await clearTables(pool);

    if (mode === 'reset-and-seed-owner') {
      await seedOwner(pool);
    }
  } finally {
    await pool.end();
  }
};

void main();
