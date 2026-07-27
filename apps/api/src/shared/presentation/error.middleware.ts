import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import {
  ForbiddenError,
  InvalidSessionError,
  UnauthorizedError,
} from '../../features/identity/domain/auth';

const toResponseBody = (code: string, message: string) => ({
  error: { code, message },
});

export const errorMiddleware: ErrorRequestHandler = (error, _request, response, next) => {
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

  response.status(500).json(toResponseBody('INTERNAL_SERVER_ERROR', 'Unexpected server error'));
};
