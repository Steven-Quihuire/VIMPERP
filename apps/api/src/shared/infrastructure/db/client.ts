import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

export type AppDb = NodePgDatabase<typeof schema>;

export const createDb = (connectionString?: string): AppDb => {
  const pool = new Pool({
    connectionString:
      connectionString ?? 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
    allowExitOnIdle: true,
    max: 1,
  });

  return drizzle(pool, { schema });
};
