import { describe, expect, it } from 'vitest';

import { parseDotEnv, parseEnv } from './env';

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

  it('provides default provisioning sweep settings', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
      HOST: '127.0.0.1',
      PORT: '3000',
      NODE_ENV: 'development',
    });

    expect(env.PROVISIONING_STALE_TIMEOUT_MS).toBe(15 * 60 * 1000);
    expect(env.PROVISIONING_SWEEP_INTERVAL_MS).toBe(5 * 60 * 1000);
    expect(env.APP_BASE_URL).toBe('http://127.0.0.1:5173');
  });

  it('rejects non-positive provisioning sweep settings', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
        HOST: '127.0.0.1',
        NODE_ENV: 'development',
        PORT: '3000',
        PROVISIONING_STALE_TIMEOUT_MS: '0',
        PROVISIONING_SWEEP_INTERVAL_MS: '-1',
      }),
    ).toThrow();
  });

  it('requires complete Resend config when email delivery is enabled', () => {
    expect(() =>
      parseEnv({
        DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
        HOST: '127.0.0.1',
        PORT: '3000',
        NODE_ENV: 'development',
        RESEND_API_KEY: 're_test_123',
      }),
    ).toThrow('RESEND_FROM_EMAIL is required when Resend email delivery is enabled');
  });

  it('accepts complete Resend config', () => {
    const env = parseEnv({
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
      HOST: '127.0.0.1',
      PORT: '3000',
      NODE_ENV: 'development',
      RESEND_API_KEY: 're_test_123',
      RESEND_FROM_EMAIL: 'noreply@vimcore.test',
      APP_BASE_URL: 'https://app.vimcore.test',
    });

    expect(env.RESEND_API_KEY).toBe('re_test_123');
    expect(env.RESEND_FROM_EMAIL).toBe('noreply@vimcore.test');
    expect(env.APP_BASE_URL).toBe('https://app.vimcore.test');
  });

  it('parses dotenv syntax used by repo-root local env files', () => {
    expect(
      parseDotEnv([
        '# comment',
        'DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/vimcore',
        'RESEND_API_KEY="re_test_123"',
        "RESEND_FROM_EMAIL='noreply@vimcore.test'",
        'EMPTY=',
      ].join('\n')),
    ).toEqual({
      DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/vimcore',
      RESEND_API_KEY: 're_test_123',
      RESEND_FROM_EMAIL: 'noreply@vimcore.test',
      EMPTY: '',
    });
  });
});
