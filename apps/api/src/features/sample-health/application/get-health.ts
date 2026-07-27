import type { HealthGateway, HealthStatus } from '../domain/health';

export const createGetHealth =
  (healthGateway: HealthGateway) => async (): Promise<HealthStatus> => {
    await healthGateway.ping();

    return { status: 'ok' };
  };
