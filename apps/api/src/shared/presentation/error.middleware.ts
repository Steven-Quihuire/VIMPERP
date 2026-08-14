import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import {
  CategoryCycleError,
  CategoryNotFoundError,
  ItemNotFoundError,
  ItemSkuConflictError,
  ItemTypeImmutableError,
} from '../../features/items/domain/item';
import {
  CompanyConflictError,
  PrivacyPolicyNotAcceptedError,
} from '../../features/companies/domain/company';
import {
  DuplicateIdentityError,
  ForbiddenError,
  InvalidSessionError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../features/identity/domain/auth';
import {
  EmployeeAssignmentConflictError,
} from '../../features/hr-employees/domain/employee-assignments';
import {
  EmployeeDocumentConflictError,
  EmployeeNotFoundError,
  EmployeeValidationError,
  HrEmployeesScopeNotFoundError,
} from '../../features/hr-employees/domain/employees';
import {
  ErpAccessInvitationAlreadyAcceptedError,
  ErpAccessInvitationExpiredError,
  ErpAccessInvitationNotFoundError,
  ErpAccessInvitationPasswordRequiredError,
} from '../../features/hr-erp-access/domain/erp-access-invitations';
import {
  ErpAccessLinkConflictError,
  ErpAccessLinkNotFoundError,
} from '../../features/hr-erp-access/domain/erp-access-links';
import {
  ApprovalPolicyNotFoundError,
  ApprovalPolicyScopeNotFoundError,
  ApprovalPolicyValidationError,
} from '../../features/approval-policy/domain/approval-policy';
import {
  PositionHeadcountExceededError,
  PositionHierarchyError,
  PositionParentNotFoundError,
  PositionNotFoundError,
} from '../../features/hr-employees/domain/positions';
import {
  NodeManagementInvitationAlreadyAcceptedError,
  NodeManagementInvitationExpiredError,
  NodeManagementInvitationNotFoundError,
  NodeManagementInvitationPasswordRequiredError,
  NodeResponsibilityConflictError,
  NodeManagementScopeNotFoundError,
} from '../../features/node-management/domain/node-management';
import {
  AreaConflictError,
  AreaNameConflictError,
  AreaNotFoundError,
  DivisionConflictError,
  DivisionNameConflictError,
  DivisionNotFoundError,
  InvalidHierarchyParentError,
  LocalConflictError,
  LocalNameConflictError,
  LocalNotFoundError,
  ParentOwnershipError,
  PointOfSaleNameConflictError,
  PointOfSaleNotFoundError,
  WarehouseNameConflictError,
  WarehouseNotFoundError,
} from '../../features/org-hierarchy/domain/org-hierarchy';
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

    if (
      error instanceof UnauthorizedError ||
      error instanceof InvalidSessionError
    ) {
      response.status(401).json(toResponseBody('UNAUTHORIZED', error.message));
      return;
    }

    if (error instanceof ForbiddenError) {
      response.status(403).json(toResponseBody('FORBIDDEN', error.message));
      return;
    }

    if (error instanceof TooManyRequestsError) {
      response
        .status(429)
        .json(toResponseBody('TOO_MANY_REQUESTS', error.message));
      return;
    }

    if (error instanceof DuplicateIdentityError) {
      response.status(409).json(toResponseBody('AUTH_CONFLICT', error.message));
      return;
    }

    if (error instanceof NodeManagementInvitationPasswordRequiredError) {
      response.status(400).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof ErpAccessInvitationPasswordRequiredError) {
      response.status(400).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof ApprovalPolicyValidationError) {
      response.status(400).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof EmployeeValidationError) {
      response.status(400).json(toResponseBody(error.code, error.message));
      return;
    }

    if (
      error instanceof EmployeeAssignmentConflictError ||
      error instanceof PositionHeadcountExceededError ||
      error instanceof PositionHierarchyError ||
      error instanceof ErpAccessLinkConflictError ||
      error instanceof ErpAccessInvitationAlreadyAcceptedError
    ) {
      response.status(409).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof EmployeeDocumentConflictError) {
      response.status(409).json(toResponseBody(error.code, error.message));
      return;
    }

    if (
      error instanceof EmployeeNotFoundError ||
      error instanceof PositionNotFoundError ||
      error instanceof PositionParentNotFoundError ||
      error instanceof HrEmployeesScopeNotFoundError ||
      error instanceof ApprovalPolicyScopeNotFoundError ||
      error instanceof ErpAccessInvitationNotFoundError ||
      error instanceof ErpAccessLinkNotFoundError
    ) {
      response.status(404).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof ApprovalPolicyNotFoundError) {
      response.status(404).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof NodeManagementScopeNotFoundError) {
      response.status(404).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof NodeManagementInvitationNotFoundError) {
      response.status(404).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof NodeManagementInvitationExpiredError) {
      response.status(410).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof ErpAccessInvitationExpiredError) {
      response.status(410).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof NodeManagementInvitationAlreadyAcceptedError) {
      response.status(409).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof NodeResponsibilityConflictError) {
      response.status(409).json(toResponseBody(error.code, error.message));
      return;
    }

    if (error instanceof CompanyConflictError) {
      response.status(409).json(toResponseBody('CONFLICT', error.message));
      return;
    }

    if (error instanceof PrivacyPolicyNotAcceptedError) {
      response.status(400).json(toResponseBody('BAD_REQUEST', error.message));
      return;
    }

    if (
      error instanceof ItemNotFoundError ||
      error instanceof CategoryNotFoundError
    ) {
      response.status(404).json(toResponseBody('NOT_FOUND', error.message));
      return;
    }

    if (
      error instanceof ItemSkuConflictError ||
      error instanceof ItemTypeImmutableError ||
      error instanceof CategoryCycleError
    ) {
      response.status(409).json(toResponseBody('CONFLICT', error.message));
      return;
    }

    if (
      error instanceof DivisionConflictError ||
      error instanceof LocalConflictError ||
      error instanceof AreaConflictError ||
      error instanceof DivisionNameConflictError ||
      error instanceof LocalNameConflictError ||
      error instanceof AreaNameConflictError ||
      error instanceof WarehouseNameConflictError ||
      error instanceof PointOfSaleNameConflictError ||
      error instanceof InvalidHierarchyParentError ||
      error instanceof ParentOwnershipError
    ) {
      response.status(409).json(toResponseBody('CONFLICT', error.message));
      return;
    }

    if (
      error instanceof DivisionNotFoundError ||
      error instanceof LocalNotFoundError ||
      error instanceof AreaNotFoundError ||
      error instanceof WarehouseNotFoundError ||
      error instanceof PointOfSaleNotFoundError
    ) {
      response.status(404).json(toResponseBody('NOT_FOUND', error.message));
      return;
    }

    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const message =
        typeof firstIssue?.message === 'string' && firstIssue.message.length > 0
          ? firstIssue.message
          : 'Invalid request';

      response.status(400).json(toResponseBody('BAD_REQUEST', message));
      return;
    }

    const requestContext = (
      response.locals as {
        requestContext?: { correlationId: string; requestId: string };
      }
    ).requestContext;
    const requestId =
      requestContext?.requestId ??
      String(response.getHeader('x-request-id') ?? 'unknown');
    const correlationId = requestContext?.correlationId ?? requestId;
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as Record<'code', unknown>).code
        : undefined;

    const sanitizedError = sanitizeApplicationError({
      context: {
        code: errorCode,
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
      void Promise.resolve(recorder.record(sanitizedError)).catch(
        () => undefined,
      );
    } catch {
      // Recording must never prevent the generic error response.
    }

    response
      .status(500)
      .json(toResponseBody('INTERNAL_SERVER_ERROR', 'Unexpected server error'));
  };
};

export const errorMiddleware = createErrorMiddleware();
