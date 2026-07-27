import express, { type Express } from 'express';

import { createGetHealth } from '../features/sample-health/application/get-health';
import type { HealthGateway } from '../features/sample-health/domain/health';
import { createDrizzleHealthGateway } from '../features/sample-health/infrastructure/drizzle-health.gateway';
import { createHealthRouter } from '../features/sample-health/presentation/health.router';
import { createDb } from '../shared/infrastructure/db/client';

type CreateAppInput = {
  databaseUrl?: string;
  healthGateway?: HealthGateway;
};

export const createApp = (input: CreateAppInput = {}): Express => {
  const db = createDb(input.databaseUrl);
  const app = express();
  const getHealth = createGetHealth(
    input.healthGateway ?? createDrizzleHealthGateway(db),
  );

  app.use(express.json());
  app.use(createHealthRouter(getHealth));

  return app;
};
