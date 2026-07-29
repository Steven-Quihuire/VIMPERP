import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import { Pool } from 'pg';

const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';

const migrationsDir = path.resolve(__dirname, '..');

const toConnectionString = (databaseName: string) => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? defaultDatabaseUrl);
  databaseUrl.pathname = `/${databaseName}`;
  return databaseUrl.toString();
};

const adminConnectionString = toConnectionString('postgres');

const splitStatements = (sqlFile: string) => {
  return sqlFile
    .split('--> statement-breakpoint')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
};

const loadMigrationFiles = async () => {
  const entries = await readdir(migrationsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && /^\d{4}_.+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
};

export const createMigrationTestDatabase = async () => {
  const databaseName = `vimcore_migration_${randomUUID().replace(/-/g, '')}`;
  const adminPool = new Pool({
    connectionString: adminConnectionString,
    allowExitOnIdle: true,
    max: 1,
  });

  await adminPool.query(`CREATE DATABASE "${databaseName}"`);

  const connectionString = toConnectionString(databaseName);
  const pool = new Pool({
    connectionString,
    allowExitOnIdle: true,
    max: 1,
  });

  const cleanup = async () => {
    await pool.end();
    await adminPool.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await adminPool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await adminPool.end();
  };

  return {
    databaseName,
    connectionString,
    pool,
    cleanup,
  };
};

export const applyMigrationsThrough = async (pool: Pool, targetFileName: string) => {
  const migrationFiles = await loadMigrationFiles();
  const targetIndex = migrationFiles.indexOf(targetFileName);

  if (targetIndex === -1) {
    throw new Error(`Migration ${targetFileName} was not found in ${migrationsDir}`);
  }

  for (const migrationFile of migrationFiles.slice(0, targetIndex + 1)) {
    const sqlFile = await readFile(path.join(migrationsDir, migrationFile), 'utf8');

    for (const statement of splitStatements(sqlFile)) {
      await pool.query(statement);
    }
  }
};

export const applyMigrationFile = async (pool: Pool, targetFileName: string) => {
  const migrationFiles = await loadMigrationFiles();

  if (!migrationFiles.includes(targetFileName)) {
    throw new Error(`Migration ${targetFileName} was not found in ${migrationsDir}`);
  }

  const sqlFile = await readFile(path.join(migrationsDir, targetFileName), 'utf8');

  for (const statement of splitStatements(sqlFile)) {
    await pool.query(statement);
  }
};
