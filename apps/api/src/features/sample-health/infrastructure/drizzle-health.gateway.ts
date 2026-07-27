import { sql } from 'drizzle-orm';

import type { HealthGateway } from '../domain/health';
import type { AppDb } from '../../../shared/infrastructure/db/client';

export const createDrizzleHealthGateway = (db: AppDb): HealthGateway => ({
  ping: async () => {
    await db.execute(sql`select 1`);
  },
});
