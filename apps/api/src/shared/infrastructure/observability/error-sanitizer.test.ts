import { describe, expect, it } from 'vitest';

import { sanitizeApplicationError } from './error-sanitizer';

const createErrorWithStack = (message: string, stack: string) => {
  const error = Object.assign(new Error(message), { code: 'E_UPSTREAM' });

  Object.defineProperty(error, 'stack', {
    configurable: true,
    value: stack,
    writable: true,
  });

  return error;
};

describe('sanitizeApplicationError', () => {
  it('keeps only allowlisted context keys and redacts credential-shaped strings', () => {
    const sanitized = sanitizeApplicationError({
      error: createErrorWithStack(
        'Provisioning failed with password=super-secret and Bearer abc.def.ghi',
        'Error: password=super-secret\n    at authorize (token=abc.def.ghi)',
      ),
      requestContext: {
        correlationId: 'corr-1',
        requestId: 'req-1',
      },
      context: {
        authorization: 'Bearer abc.def.ghi',
        code: 'E_UPSTREAM',
        companyId: 'company-1',
        method: 'POST',
        password: 'super-secret',
        process: 'company-onboarding',
        requestBody: { token: 'abc.def.ghi' },
        route: '/companies',
        statusCode: 500,
        stepName: 'company-creation',
      },
      now: new Date('2026-07-28T00:00:00.000Z'),
    });

    expect(sanitized).toMatchObject({
      code: 'E_UPSTREAM',
      context: {
        code: 'E_UPSTREAM',
        companyId: 'company-1',
        method: 'POST',
        process: 'company-onboarding',
        route: '/companies',
        statusCode: 500,
        stepName: 'company-creation',
      },
      correlationId: 'corr-1',
      createdAt: new Date('2026-07-28T00:00:00.000Z'),
      requestId: 'req-1',
      status: '500',
    });
    expect(sanitized.message).toContain('[REDACTED]');
    expect(sanitized.message).not.toContain('super-secret');
    expect(sanitized.stack).toContain('[REDACTED]');
    expect(sanitized.stack).not.toContain('abc.def.ghi');
    expect(JSON.stringify(sanitized.context)).not.toContain('authorization');
    expect(JSON.stringify(sanitized.context)).not.toContain('requestBody');
  });

  it('redacts JSON-formatted credential fields in messages and stacks', () => {
    const sanitized = sanitizeApplicationError({
      error: createErrorWithStack(
        'Provisioning failed with {"password":"super-secret","token": "abc123","safe":"ok"}',
        'Error: {"authorization":"Bearer abc.def.ghi","cookie": "session-id"}',
      ),
      requestContext: {
        correlationId: 'corr-1',
        requestId: 'req-1',
      },
      context: {
        code: 'E_UPSTREAM',
        process: 'company-onboarding',
        route: '/companies',
        statusCode: 500,
      },
    });

    expect(sanitized.message).toContain('"password":"[REDACTED]"');
    expect(sanitized.message).toContain('"token":"[REDACTED]"');
    expect(sanitized.message).not.toContain('super-secret');
    expect(sanitized.message).not.toContain('abc123');
    expect(sanitized.stack).toContain('"authorization":"[REDACTED]"');
    expect(sanitized.stack).toContain('"cookie":"[REDACTED]"');
    expect(sanitized.stack).not.toContain('session-id');
  });

  it('sanitizes and bounds the top-level error code', () => {
    const sanitized = sanitizeApplicationError({
      error: new Error('Provisioning failed'),
      requestContext: {
        correlationId: 'corr-1',
        requestId: 'req-1',
      },
      context: {
        code: `{"password":"${'s'.repeat(600)}"}`,
        process: 'company-onboarding',
        route: '/companies',
        statusCode: 500,
      },
    });

    expect(sanitized.code).toContain('"password":"[REDACTED]"');
    expect(sanitized.code).not.toContain('ssss');
    expect(sanitized.code.length).toBeLessThanOrEqual(128);
    expect(sanitized.context.code).toBe(sanitized.code);
  });

  it('defaults the top-level error code when sanitization leaves it blank', () => {
    const sanitized = sanitizeApplicationError({
      error: Object.assign(new Error('Provisioning failed'), { code: '   ' }),
      requestContext: {
        correlationId: 'corr-1',
        requestId: 'req-1',
      },
      context: {
        code: '   ',
        process: 'company-onboarding',
        route: '/companies',
        statusCode: 500,
      },
    });

    expect(sanitized.code).toBe('INTERNAL_SERVER_ERROR');
    expect(sanitized.context.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('builds the same fingerprint for equivalent redacted messages and truncates stored text', () => {
    const baseInput = {
      context: {
        code: 'E_UPSTREAM',
        process: 'company-onboarding',
        route: '/companies',
        statusCode: 500,
      },
      requestContext: {
        correlationId: 'corr-1',
        requestId: 'req-1',
      },
    };

    const first = sanitizeApplicationError({
      ...baseInput,
      error: createErrorWithStack(
        `Provisioning failed    token=abc123 ${'x'.repeat(600)}`,
        `Error: Bearer abc123\n${'s'.repeat(5000)}`,
      ),
      now: new Date('2026-07-28T00:00:00.000Z'),
    });
    const second = sanitizeApplicationError({
      ...baseInput,
      error: createErrorWithStack(
        `provisioning failed token=xyz789 ${'x'.repeat(600)}`,
        `Error: Bearer xyz789\n${'t'.repeat(5000)}`,
      ),
      now: new Date('2026-07-28T00:00:00.000Z'),
    });

    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.message.length).toBeLessThanOrEqual(500);
    expect(first.stack?.length ?? 0).toBeLessThanOrEqual(4000);
  });

  it('does not fingerprint unbounded message suffixes', () => {
    const baseInput = {
      context: {
        code: 'E_UPSTREAM',
        process: 'company-onboarding',
        route: '/companies',
        statusCode: 500,
      },
      requestContext: {
        correlationId: 'corr-1',
        requestId: 'req-1',
      },
    };
    const hugePrefix = 'x'.repeat(10000);

    const first = sanitizeApplicationError({
      ...baseInput,
      error: createErrorWithStack(`${hugePrefix} first-unbounded-suffix`, 'Error'),
    });
    const second = sanitizeApplicationError({
      ...baseInput,
      error: createErrorWithStack(`${hugePrefix} second-unbounded-suffix`, 'Error'),
    });

    expect(first.message).toBe('x'.repeat(500));
    expect(second.message).toBe('x'.repeat(500));
    expect(first.fingerprint).toBe(second.fingerprint);
  });
});
