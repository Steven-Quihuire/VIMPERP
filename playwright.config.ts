import { defineConfig } from '@playwright/test';

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/vimcore';
const startPostgres = process.env.CI
  ? ''
  : 'docker compose up -d postgres && sleep 5 && ';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  globalTeardown: './playwright.global-teardown.ts',
  webServer: [
    {
      command:
        startPostgres +
        'DATABASE_URL="' +
        databaseUrl +
        '" pnpm --filter api exec drizzle-kit migrate && DATABASE_URL="' +
        databaseUrl +
        '" HOST=127.0.0.1 PORT=3000 NODE_ENV=development SEED_ADMIN_ENABLED=true pnpm --filter api exec tsx src/main.ts',
      url: 'http://127.0.0.1:3000/health',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
    {
      command:
        'VITE_API_BASE_URL=/api VITE_PROXY_TARGET=http://127.0.0.1:3000 pnpm --filter web exec vite --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 120_000,
    },
  ],
});
