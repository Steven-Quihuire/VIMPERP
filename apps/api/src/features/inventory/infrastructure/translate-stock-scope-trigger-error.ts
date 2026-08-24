import {
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../domain/stock-documents';

/**
 * Stable PG messages emitted by the inventory scope-check triggers installed in
 * migration 0027. These are the literal `MESSAGE = '...'` strings set with
 * `RAISE EXCEPTION USING MESSAGE = '...'` in the trigger functions.
 */
export const stockScopeTriggerMessages = [
  'stock_documents_origin_scope_node_missing',
  'stock_documents_origin_scope_type_mismatch',
  'stock_documents_destination_scope_node_missing',
  'stock_documents_destination_scope_type_mismatch',
  'stock_quants_scope_node_missing',
  'stock_quants_scope_type_mismatch',
] as const;

export type StockScopeTriggerMessage =
  (typeof stockScopeTriggerMessages)[number];

const isStockScopeTriggerMessage = (message: string): boolean =>
  (stockScopeTriggerMessages as readonly string[]).includes(message);

type PgErrorLike = {
  code?: unknown;
  message?: unknown;
  constraint?: unknown;
  cause?: unknown;
};

const unwrapCause = (error: unknown): unknown => {
  let candidate = error;

  while (
    typeof candidate === 'object' &&
    candidate !== null &&
    'cause' in candidate &&
    (candidate as PgErrorLike).cause
  ) {
    candidate = (candidate as PgErrorLike).cause;
  }

  return candidate;
};

const readMessage = (error: unknown): string | null => {
  const candidate = unwrapCause(error);

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const { message } = candidate as PgErrorLike;

  return typeof message === 'string' ? message : null;
};

const readCode = (error: unknown): string | null => {
  const candidate = unwrapCause(error);

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const { code } = candidate as PgErrorLike;

  return typeof code === 'string' ? code : null;
};

/**
 * Returns `true` when the given error looks like an inventory scope-trigger
 * violation — i.e. it carries one of the stable PG messages emitted by the
 * scope-check triggers installed in migration 0027.
 *
 * The predicate is intentionally strict: unrelated 23514/23503 errors do not
 * match. The looser ERRCODE fallback is exposed separately via
 * {@link translateStockScopeTriggerError}.
 */
export const isStockScopeTriggerError = (error: unknown): boolean => {
  const message = readMessage(error);

  return message !== null && isStockScopeTriggerMessage(message);
};

/**
 * Translate an inventory scope-trigger PG error into a typed domain error.
 *
 * The mapping mirrors the constraint semantics:
 *  - 23514 (check_violation) — scope_type mismatch ⇒ StockDocumentValidationError
 *  - 23503 (foreign_key_violation) — scope_node missing ⇒ StockDocumentNotFoundError
 *
 * Returns `null` when the error is unrelated to the inventory triggers so the
 * caller can re-throw or wrap it as-is.
 */
export const translateStockScopeTriggerError = (
  error: unknown,
): StockDocumentNotFoundError | StockDocumentValidationError | null => {
  const code = readCode(error);
  const message = readMessage(error);

  if (message !== null && isStockScopeTriggerMessage(message)) {
    if (code === '23503') {
      return new StockDocumentNotFoundError(
        `Inventory scope node is missing: ${message}`,
      );
    }

    return new StockDocumentValidationError(
      `Inventory scope type violation: ${message}`,
    );
  }

  if (code === '23514') {
    return new StockDocumentValidationError(
      'Inventory scope type check violation (23514).',
    );
  }

  if (code === '23503') {
    return new StockDocumentNotFoundError(
      'Inventory scope node foreign-key violation (23503).',
    );
  }

  return null;
};
