import { Client } from 'pg';

const defaultDatabaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore_e2e';

const databaseUrl = new URL(process.env.DATABASE_URL ?? defaultDatabaseUrl);
const databaseName = databaseUrl.pathname.replace(/^\//, '');

if (!databaseName || databaseName === 'postgres') {
  throw new Error('DATABASE_URL must target a dedicated e2e database.');
}

const adminDatabaseUrl = new URL(databaseUrl.toString());
adminDatabaseUrl.pathname = '/postgres';

const client = new Client({ connectionString: adminDatabaseUrl.toString() });

const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

const main = async () => {
  await client.connect();

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName],
    );
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
