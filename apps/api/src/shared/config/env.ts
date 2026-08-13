import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

const envSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgres://postgres:postgres@127.0.0.1:5432/vimcore'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PROVISIONING_STALE_TIMEOUT_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    PROVISIONING_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(5 * 60 * 1000),
    APP_BASE_URL: z.string().url().default('http://127.0.0.1:5173'),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_EMAIL: z.string().email().optional(),
    SEED_ADMIN_ENABLED: z
      .enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true'),
    SESSION_COOKIE_NAME: z.string().min(1).default('vimcore_session'),
  })
  .superRefine((environment, context) => {
    if (environment.NODE_ENV === 'production' && environment.SEED_ADMIN_ENABLED) {
      context.addIssue({
        code: 'custom',
        message: 'SEED_ADMIN_ENABLED cannot be true in production',
        path: ['SEED_ADMIN_ENABLED'],
      });
    }

    const resendFields = ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'] as const;
    const hasAnyResendField = resendFields.some((field) => {
      const value = environment[field];
      return typeof value === 'string' && value.length > 0;
    });

    if (hasAnyResendField) {
      for (const field of resendFields) {
        if (!environment[field]) {
          context.addIssue({
            code: 'custom',
            message: `${field} is required when Resend email delivery is enabled`,
            path: [field],
          });
        }
      }
    }
  });

export const parseEnv = (source: Record<string, string | undefined>) => {
  return envSchema.parse(source);
};

export const parseDotEnv = (contents: string): Record<string, string> => {
  const entries: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (line.length === 0 || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
};

const readRepoRootDotEnv = (): Record<string, string> => {
  const repoRootDotEnvPath = path.resolve(__dirname, '../../../../../.env');

  if (!existsSync(repoRootDotEnvPath)) {
    return {};
  }

  return parseDotEnv(readFileSync(repoRootDotEnvPath, 'utf8'));
};

export const readEnv = () =>
  parseEnv({
    ...readRepoRootDotEnv(),
    ...process.env,
  });
