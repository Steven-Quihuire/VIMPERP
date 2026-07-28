import { createHash } from 'node:crypto';

const ALLOWED_CONTEXT_KEYS = [
  'route',
  'method',
  'statusCode',
  'code',
  'process',
  'stepName',
  'companyId',
] as const;

const MESSAGE_MAX_LENGTH = 500;
const MESSAGE_INPUT_MAX_LENGTH = 2048;
const STACK_MAX_LENGTH = 4000;
const CODE_MAX_LENGTH = 128;
const REDACTED_VALUE = '[REDACTED]';

const REDACTION_PATTERNS: Array<[RegExp, string]> = [
  [
    /(["'])(password|token|secret|api[_-]?key|authorization|cookie|session)\1\s*:\s*(["'])(?:\\.|(?!\3).)*\3/gi,
    `$1$2$1:$3${REDACTED_VALUE}$3`,
  ],
  [
    /(["'])(password|token|secret|api[_-]?key|authorization|cookie|session)\1\s*:\s*(["'])(?:\\.|(?!\3).)*$/gi,
    `$1$2$1:$3${REDACTED_VALUE}$3`,
  ],
  [/\b(Bearer)\s+[A-Za-z0-9._=-]+/gi, `$1 ${REDACTED_VALUE}`],
  [
    /\b(password|token|secret|api[_-]?key|authorization|cookie|session)\b\s*([:=])\s*([^\s,;]+)/gi,
    `$1$2${REDACTED_VALUE}`,
  ],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED_VALUE],
];

type AllowedContextKey = (typeof ALLOWED_CONTEXT_KEYS)[number];

export type SanitizedErrorContext = Partial<
  Record<AllowedContextKey, string | number>
>;

export type RequestContextLike = {
  correlationId: string;
  requestId: string;
};

export type SanitizedApplicationError = {
  code: string;
  context: SanitizedErrorContext;
  correlationId: string;
  createdAt: Date;
  fingerprint: string;
  message: string;
  requestId: string;
  stack: string | null;
  status: string;
};

const redactSensitiveStrings = (value: string) => {
  let sanitized = value;

  for (const [pattern, replacement] of REDACTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
};

const truncate = (value: string, maxLength: number) => {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
};

const sanitizeText = (value: string, maxLength: number, inputMaxLength = maxLength) => {
  return truncate(redactSensitiveStrings(truncate(value, inputMaxLength)), maxLength);
};

const normalizeMessageForFingerprint = (message: string) => {
  return message.toLowerCase().replace(/\s+/g, ' ').trim();
};

const sanitizeMessageForFingerprint = (message: string) => {
  return normalizeMessageForFingerprint(
    redactSensitiveStrings(truncate(message, MESSAGE_INPUT_MAX_LENGTH)),
  );
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unexpected server error';
};

const getErrorStack = (error: unknown) => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  return null;
};

const sanitizeErrorCode = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const sanitized = sanitizeText(value.trim(), CODE_MAX_LENGTH).trim();

  return sanitized.length > 0 ? sanitized : null;
};

const getErrorCode = (error: unknown, contextCode: unknown) => {
  const sanitizedContextCode = sanitizeErrorCode(contextCode);

  if (sanitizedContextCode) {
    return sanitizedContextCode;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    const sanitizedErrorCode = sanitizeErrorCode(error.code);

    if (sanitizedErrorCode) {
      return sanitizedErrorCode;
    }
  }

  return 'INTERNAL_SERVER_ERROR';
};

const sanitizeContext = (context: Record<string, unknown> | undefined, code: string) => {
  const sanitizedContext: SanitizedErrorContext = {};

  for (const key of ALLOWED_CONTEXT_KEYS) {
    const rawValue = key === 'code' ? code : context?.[key];

    if (typeof rawValue === 'string') {
      sanitizedContext[key] = sanitizeText(rawValue.trim(), MESSAGE_MAX_LENGTH);
      continue;
    }

    if (typeof rawValue === 'number') {
      sanitizedContext[key] = rawValue;
    }
  }

  return sanitizedContext;
};

export const sanitizeApplicationError = ({
  error,
  requestContext,
  context,
  now,
}: {
  error: unknown;
  requestContext: RequestContextLike;
  context?: Record<string, unknown>;
  now?: Date;
}): SanitizedApplicationError => {
  const code = getErrorCode(error, context?.code);
  const sanitizedContext = sanitizeContext(context, code);
  const rawMessage = getErrorMessage(error);
  const message = sanitizeText(rawMessage, MESSAGE_MAX_LENGTH, MESSAGE_INPUT_MAX_LENGTH);
  const stack = getErrorStack(error);
  const process = typeof sanitizedContext.process === 'string' ? sanitizedContext.process : 'unknown';
  const route = typeof sanitizedContext.route === 'string' ? sanitizedContext.route : 'unknown';
  const fingerprint = createHash('sha256')
    .update([process, code, route, sanitizeMessageForFingerprint(rawMessage)].join('|'))
    .digest('hex');

  return {
    code,
    context: sanitizedContext,
    correlationId: requestContext.correlationId,
    createdAt: now ?? new Date(),
    fingerprint,
    message,
    requestId: requestContext.requestId,
    stack: stack ? sanitizeText(stack, STACK_MAX_LENGTH) : null,
    status: String(context?.statusCode ?? 500),
  };
};
