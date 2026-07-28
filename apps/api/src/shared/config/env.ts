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
  });

export const parseEnv = (source: Record<string, string | undefined>) => {
  return envSchema.parse(source);
};

export const readEnv = () => parseEnv(process.env);
