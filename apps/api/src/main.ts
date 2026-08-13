import { createAppRuntime } from './app/create-app';
import { readEnv } from './shared/config/env';

export const startProvisioningSweepWorker = ({
  logger,
  run,
  sweepIntervalMs,
  schedule = setInterval,
}: {
  logger: { error: (context: unknown, message: string) => void };
  run: () => Promise<number>;
  sweepIntervalMs: number;
  schedule?: typeof setInterval;
}) => {
  const timer = schedule(() => {
    void run().catch((error: unknown) => {
      logger.error({ err: error }, 'Provisioning sweep failed');
    });
  }, sweepIntervalMs);

  timer.unref();

  return timer;
};

export const startServer = () => {
  const env = readEnv();
  const { app, sweepStaleProvisioningRuns } = createAppRuntime({
    databaseUrl: env.DATABASE_URL,
    nodeEnv: env.NODE_ENV,
    provisioningStaleTimeoutMs: env.PROVISIONING_STALE_TIMEOUT_MS,
    appBaseUrl: env.APP_BASE_URL,
    ...(env.RESEND_API_KEY ? { resendApiKey: env.RESEND_API_KEY } : {}),
    ...(env.RESEND_FROM_EMAIL ? { resendFromEmail: env.RESEND_FROM_EMAIL } : {}),
    seedAdminEnabled: env.SEED_ADMIN_ENABLED,
    sessionCookieName: env.SESSION_COOKIE_NAME,
  });

  startProvisioningSweepWorker({
    logger: console,
    run: sweepStaleProvisioningRuns,
    sweepIntervalMs: env.PROVISIONING_SWEEP_INTERVAL_MS,
  });

  return app.listen(env.PORT, env.HOST, () => {
    console.log(`api listening on http://${env.HOST}:${env.PORT}`);
  });
};

if (!process.env.VITEST) {
  startServer();
}
