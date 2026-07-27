import { describe, expect, it } from 'vitest';

import { parseEnv } from './env';

describe('parseEnv', () => {
  it('refuses seeded admin in production', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
        HOST: '127.0.0.1',
        PORT: '3000',
        NODE_ENV: 'production',
        SEED_ADMIN_ENABLED: 'true',
      }),
    ).toThrow('SEED_ADMIN_ENABLED cannot be true in production');
  });

  it('parses explicit false as disabled in production', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
      HOST: '127.0.0.1',
      PORT: '3000',
      NODE_ENV: 'production',
      SEED_ADMIN_ENABLED: 'false',
    });

    expect(env.SEED_ADMIN_ENABLED).toBe(false);
  });

  it('allows seeded admin in development', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
      HOST: '127.0.0.1',
      PORT: '3000',
      NODE_ENV: 'development',
      SEED_ADMIN_ENABLED: 'true',
    });

    expect(env.SEED_ADMIN_ENABLED).toBe(true);
    expect(env.NODE_ENV).toBe('development');
  });
});
