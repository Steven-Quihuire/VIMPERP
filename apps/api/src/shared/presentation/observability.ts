import { randomUUID } from 'node:crypto';

import type { RequestHandler, Router } from 'express';
import { Router as createRouter } from 'express';
import pino, { type Logger } from 'pino';

const CORRELATION_ID_MAX_LENGTH = 128;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

export type RequestContext = {
  correlationId: string;
  requestId: string;
};

export type RequestMetrics = {
  recordRequestStart: () => void;
  recordRequestComplete: (statusCode: number) => void;
  renderPrometheus: (options?: { inFlightOffset?: number }) => string;
};

export const createLogger = (enabled: boolean): Logger =>
  pino({
    enabled,
    name: 'vimcore-api',
  });

export const createRequestMetrics = (): RequestMetrics => {
  let totalRequests = 0;
  let inFlightRequests = 0;

  return {
    recordRequestStart: () => {
      totalRequests += 1;
      inFlightRequests += 1;
    },
    recordRequestComplete: () => {
      inFlightRequests = Math.max(0, inFlightRequests - 1);
    },
    renderPrometheus: (options) => {
      const inFlightOffset = options?.inFlightOffset ?? 0;

      return [
        '# HELP http_requests_total Total HTTP requests handled by the API',
        '# TYPE http_requests_total counter',
        `http_requests_total ${totalRequests}`,
        '# HELP http_requests_in_flight Requests currently in progress',
        '# TYPE http_requests_in_flight gauge',
        `http_requests_in_flight ${Math.max(0, inFlightRequests - inFlightOffset)}`,
      ].join('\n');
    },
  };
};

export const createRequestContextMiddleware = ({
  logger,
  metrics,
}: {
  logger: Logger;
  metrics: RequestMetrics;
}): RequestHandler => {
  return (request, response, next) => {
    const requestId = randomUUID();
    const correlationIdHeader = request.headers['x-correlation-id'];
    const startedAt = Date.now();
    const correlationId =
      typeof correlationIdHeader === 'string'
        ? (() => {
            const boundedValue = correlationIdHeader.trim().slice(0, CORRELATION_ID_MAX_LENGTH);

            if (boundedValue.length === 0 || !CORRELATION_ID_PATTERN.test(boundedValue)) {
              return requestId;
            }

            return boundedValue;
          })()
        : requestId;

    metrics.recordRequestStart();
    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);
    (response.locals as { requestContext: RequestContext }).requestContext = {
      correlationId,
      requestId,
    };

    response.on('finish', () => {
      metrics.recordRequestComplete(response.statusCode);
      logger.info({
        correlationId,
        method: request.method,
        path: request.path,
        requestId,
        responseTimeMs: Date.now() - startedAt,
        statusCode: response.statusCode,
      });
    });

    next();
  };
};

export const createMetricsRouter = (metrics: RequestMetrics): Router => {
  const router = createRouter();

  router.get('/metrics', (_request, response) => {
    response.type('text/plain').send(metrics.renderPrometheus({ inFlightOffset: 1 }));
  });

  return router;
};
