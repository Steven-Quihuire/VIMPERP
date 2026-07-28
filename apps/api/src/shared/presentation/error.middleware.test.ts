import express from 'express';
import request from 'supertest';
import type { Logger } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import { createErrorMiddleware } from './error.middleware';
import {
  createRequestContextMiddleware,
  type RequestContext,
  type RequestMetrics,
} from './observability';

const createErrorWithStack = (message: string, stack: string) => {
  const error = Object.assign(new Error(message), { code: 'E_UPSTREAM' });

  Object.defineProperty(error, 'stack', {
    configurable: true,
    value: stack,
    writable: true,
  });

  return error;
};

const createMetrics = (): RequestMetrics => ({
  recordRequestComplete: vi.fn(),
  recordRequestStart: vi.fn(),
  renderPrometheus: () => '',
});

describe('createErrorMiddleware', () => {
  it('records a sanitized 500 row without breaking the request flow', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const logger = { info: vi.fn() } as unknown as Logger;
    const metrics = createMetrics();
    const app = express();
    let capturedRequestContext: RequestContext | undefined;

    app.use(createRequestContextMiddleware({ logger, metrics }));
    app.get('/boom', (_request, response, next) => {
      capturedRequestContext = (response.locals as { requestContext?: RequestContext }).requestContext;

      next(
        createErrorWithStack(
          'Provisioning failed with password=super-secret and token=abc123',
          'Error: password=super-secret\n    at syncToken (token=abc123)',
        ),
      );
    });
    app.use(
      createErrorMiddleware({
        now: () => new Date('2026-07-28T00:00:00.000Z'),
        recorder: { record },
      }),
    );

    const response = await request(app)
      .get('/boom')
      .set('x-correlation-id', `  ${'trace'.repeat(40)}  `);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
      },
    });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
    expect(response.headers['x-correlation-id']).toBe('trace'.repeat(25) + 'tra');
    expect(capturedRequestContext).toEqual({
      correlationId: 'trace'.repeat(25) + 'tra',
      requestId: response.headers['x-request-id'] as string,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'E_UPSTREAM',
        context: {
          code: 'E_UPSTREAM',
          method: 'GET',
          process: 'http-request',
          route: '/boom',
          statusCode: 500,
        },
        correlationId: 'trace'.repeat(25) + 'tra',
        createdAt: new Date('2026-07-28T00:00:00.000Z'),
        requestId: response.headers['x-request-id'],
        status: '500',
      }),
    );
    const recordedError = record.mock.calls[0]?.[0];
    expect(recordedError?.message).toContain('[REDACTED]');
    expect(recordedError?.message).not.toContain('super-secret');
    expect(recordedError?.stack).not.toContain('abc123');
  });

  it('swallows recorder failures and still returns the 500 response', async () => {
    const record = vi.fn().mockRejectedValue(new Error('write failed'));
    const logger = { info: vi.fn() } as unknown as Logger;
    const metrics = createMetrics();
    const app = express();

    app.use(createRequestContextMiddleware({ logger, metrics }));
    app.get('/boom', (_request, _response, next) => {
      next(createErrorWithStack('Provisioning failed token=abc123', 'Error: token=abc123'));
    });
    app.use(createErrorMiddleware({ recorder: { record } }));

    const response = await request(app).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
      },
    });
    expect(response.headers['x-correlation-id']).toBe(response.headers['x-request-id']);
    expect(record).toHaveBeenCalledTimes(1);
  });

  it('swallows synchronous recorder failures and still returns the 500 response', async () => {
    const record = vi.fn(() => {
      throw new Error('write failed');
    });
    const logger = { info: vi.fn() } as unknown as Logger;
    const metrics = createMetrics();
    const app = express();

    app.use(createRequestContextMiddleware({ logger, metrics }));
    app.get('/boom', (_request, _response, next) => {
      next(createErrorWithStack('Provisioning failed token=abc123', 'Error: token=abc123'));
    });
    app.use(createErrorMiddleware({ recorder: { record } }));

    const response = await request(app).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error',
      },
    });
    expect(record).toHaveBeenCalledTimes(1);
  });
});
