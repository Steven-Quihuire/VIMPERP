import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import {
  ForbiddenError,
  InvalidSessionError,
  UnauthorizedError,
} from '../../features/identity/domain/auth';
import {
  sanitizeApplicationError,
  type SanitizedApplicationError,
} from '../infrastructure/observability/error-sanitizer';

const toResponseBody = (code: string, message: string) => ({
  error: { code, message },
});

export type ApplicationErrorRecorder = {
  record: (error: SanitizedApplicationError) => Promise<void>;
};

const noopApplicationErrorRecorder: ApplicationErrorRecorder = {
  record: async () => await Promise.resolve(),
};

export const createErrorMiddleware = ({
  now = () => new Date(),
  recorder = noopApplicationErrorRecorder,
}: {
  now?: () => Date;
  recorder?: ApplicationErrorRecorder;
} = {}): ErrorRequestHandler => {
  return (error, request, response, next) => {
    void next;

    if (error instanceof UnauthorizedError || error instanceof InvalidSessionError) {
      response.status(401).json(toResponseBody('UNAUTHORIZED', error.message));
      return;
    }

    if (error instanceof ForbiddenError) {
      response.status(403).json(toResponseBody('FORBIDDEN', error.message));
      return;
    }

    if (error instanceof ZodError) {
      response.status(400).json(toResponseBody('BAD_REQUEST', 'Invalid request'));
      return;
    }

    const requestContext = (response.locals as {
      requestContext?: { correlationId: string; requestId: string };
    }).requestContext;
    const requestId = requestContext?.requestId ?? String(response.getHeader('x-request-id') ?? 'unknown');
    const correlationId = requestContext?.correlationId ?? requestId;

    const sanitizedError = sanitizeApplicationError({
      context: {
        code:
          typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : undefined,
        method: request.method,
        process: 'http-request',
        route: request.path,
        statusCode: 500,
      },
      error,
      now: now(),
      requestContext: {
        correlationId,
        requestId,
      },
    });

    try {
      void Promise.resolve(recorder.record(sanitizedError)).catch(() => undefined);
    } catch {
      // Recording must never prevent the generic error response.
    }

    response.status(500).json(toResponseBody('INTERNAL_SERVER_ERROR', 'Unexpected server error'));
  };
};

export const errorMiddleware = createErrorMiddleware();
