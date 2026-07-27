import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default('postgres://postgres:postgres@127.0.0.1:5432/vimcore'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export const readEnv = () => envSchema.parse(process.env);
