import { createApp } from './app/create-app';
import { readEnv } from './shared/config/env';

const env = readEnv();
const app = createApp({
  databaseUrl: env.DATABASE_URL,
  nodeEnv: env.NODE_ENV,
  seedAdminEnabled: env.SEED_ADMIN_ENABLED,
  sessionCookieName: env.SESSION_COOKIE_NAME,
});

app.listen(env.PORT, env.HOST, () => {
  console.log(`api listening on http://${env.HOST}:${env.PORT}`);
});
