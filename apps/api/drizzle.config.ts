import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { defineConfig } from 'drizzle-kit';

const repoRootEnvPath = path.resolve(__dirname, '../../.env');

if (!process.env.DATABASE_URL && existsSync(repoRootEnvPath)) {
  for (const rawLine of readFileSync(repoRootEnvPath, 'utf8').split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key === 'DATABASE_URL') {
      process.env.DATABASE_URL = value;
      break;
    }
  }
}

export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/migrations',
  schema: './src/shared/infrastructure/db/schema.ts',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
  },
});
