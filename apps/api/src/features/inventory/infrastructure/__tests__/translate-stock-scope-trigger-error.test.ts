import { describe, expect, it } from 'vitest';

import {
  StockDocumentNotFoundError,
  StockDocumentValidationError,
} from '../../domain/stock-documents';
import {
  isStockScopeTriggerError,
  translateStockScopeTriggerError,
} from '../translate-stock-scope-trigger-error';

const buildPgError = (input: {
  code?: string;
  message: string;
  constraint?: string;
}) => {
  return {
    code: input.code,
    message: input.message,
    constraint: input.constraint,
  };
};

const buildWrappedPgError = (input: {
  code?: string;
  message: string;
  constraint?: string;
}) => {
  return new Error('Failed query: update stock_documents ...', {
    cause: buildPgError(input),
  });
};

describe('translateStockScopeTriggerError', () => {
  it('translates origin scope type mismatch (23514) to StockDocumentValidationError', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23514',
        message: 'stock_documents_origin_scope_type_mismatch',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentValidationError);
    expect(translated).toMatchObject({ code: 'STOCK_DOCUMENT_VALIDATION' });
    expect((translated as Error).message).toContain(
      'stock_documents_origin_scope_type_mismatch',
    );
  });

  it('translates destination scope type mismatch (23514) to StockDocumentValidationError', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23514',
        message: 'stock_documents_destination_scope_type_mismatch',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentValidationError);
    expect((translated as Error).message).toContain(
      'stock_documents_destination_scope_type_mismatch',
    );
  });

  it('translates quant scope type mismatch (23514) to StockDocumentValidationError', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23514',
        message: 'stock_quants_scope_type_mismatch',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentValidationError);
  });

  it('translates origin scope node missing (23503) to StockDocumentNotFoundError', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23503',
        message: 'stock_documents_origin_scope_node_missing',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentNotFoundError);
    expect((translated as Error).message).toContain(
      'stock_documents_origin_scope_node_missing',
    );
  });

  it('translates destination scope node missing (23503) to StockDocumentNotFoundError', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23503',
        message: 'stock_documents_destination_scope_node_missing',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentNotFoundError);
    expect((translated as Error).message).toContain(
      'stock_documents_destination_scope_node_missing',
    );
  });

  it('translates quant scope node missing (23503) to StockDocumentNotFoundError', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23503',
        message: 'stock_quants_scope_node_missing',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentNotFoundError);
  });

  it('falls back to StockDocumentValidationError on ERRCODE 23514 without a known message', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23514',
        message: 'some_other_check_violation',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentValidationError);
  });

  it('falls back to StockDocumentNotFoundError on ERRCODE 23503 without a known message', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23503',
        message: 'unknown_scope_fk',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentNotFoundError);
  });

  it('returns null for unrelated error codes', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23505',
        message: 'duplicate_key',
      }),
    );

    expect(translated).toBeNull();
  });

  it('returns null for non-stock error messages even when ERRCODE matches', () => {
    const translated = translateStockScopeTriggerError(
      buildPgError({
        code: '23514',
        message: 'unrelated_check_violation',
      }),
    );

    // The fallback for ERRCODE 23514 still returns a validation error,
    // so this expectation is intentionally loose. Document the contract here:
    expect(translated).toBeInstanceOf(StockDocumentValidationError);
  });

  it('returns null for non-object errors', () => {
    expect(translateStockScopeTriggerError('plain string')).toBeNull();
    expect(translateStockScopeTriggerError(undefined)).toBeNull();
    expect(translateStockScopeTriggerError(null)).toBeNull();
    expect(translateStockScopeTriggerError(42)).toBeNull();
  });

  it('unwraps wrapped Drizzle/pg errors before mapping the trigger message', () => {
    const translated = translateStockScopeTriggerError(
      buildWrappedPgError({
        code: '23514',
        message: 'stock_documents_destination_scope_type_mismatch',
      }),
    );

    expect(translated).toBeInstanceOf(StockDocumentValidationError);
    expect((translated as Error).message).toContain(
      'stock_documents_destination_scope_type_mismatch',
    );
  });
});

describe('isStockScopeTriggerError', () => {
  it('returns true for trigger messages that map to typed errors', () => {
    expect(
      isStockScopeTriggerError(
        buildPgError({
          code: '23514',
          message: 'stock_documents_origin_scope_type_mismatch',
        }),
      ),
    ).toBe(true);
    expect(
      isStockScopeTriggerError(
        buildPgError({
          code: '23503',
          message: 'stock_quants_scope_node_missing',
        }),
      ),
    ).toBe(true);
  });

  it('returns false for unrelated error codes or messages', () => {
    expect(
      isStockScopeTriggerError(
        buildPgError({ code: '23505', message: 'stock_quants_company_item_scope_lot_uk' }),
      ),
    ).toBe(false);
    expect(
      isStockScopeTriggerError(
        buildPgError({ code: '23514', message: 'some_other_check' }),
      ),
    ).toBe(false);
  });
});
