import { describe, expect, it } from 'vitest';

import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';

import {
  itemsTable,
  stockDocumentLinesTable,
  stockDocumentsTable,
  stockDocumentStatusEnum,
  stockDocumentTypeEnum,
  stockLotsTable,
  stockQuantsTable,
} from './schema';

describe('inventory schema metadata', () => {
  it('defines stock lots and stock documents with tenant-safe foreign keys and document constraints', () => {
    expect(stockDocumentTypeEnum.enumValues).toEqual([
      'receipt',
      'transfer',
      'adjustment',
      'loss',
    ]);
    expect(stockDocumentStatusEnum.enumValues).toEqual([
      'draft',
      'confirmed',
      'cancelled',
    ]);

    const lotColumns = getTableColumns(stockLotsTable);
    const lotConfig = getTableConfig(stockLotsTable);

    expect(stockLotsTable[Symbol.for('drizzle:Name') as never]).toBe('stock_lots');
    expect(lotColumns.id.notNull).toBe(true);
    expect(lotColumns.id.hasDefault).toBe(true);
    expect(lotColumns.companyId.notNull).toBe(true);
    expect(lotColumns.itemId.notNull).toBe(true);
    expect(lotColumns.lotNumber.notNull).toBe(true);
    expect(lotColumns.expiresAt.notNull).toBe(false);
    expect(lotColumns.updatedAt.notNull).toBe(true);
    expect(lotConfig.foreignKeys.map((foreignKey) => foreignKey.getName()).sort()).toEqual([
      'stock_lots_company_id_companies_id_fk',
      'stock_lots_item_company_fk',
      'stock_lots_item_id_items_id_fk',
    ]);
    expect(lotConfig.indexes.map((index) => index.config.name).sort()).toEqual([
      'stock_lots_company_item_lot_idx',
      'stock_lots_expires_at_idx',
      'stock_lots_id_company_idx',
      'stock_lots_item_idx',
    ]);

    const documentColumns = getTableColumns(stockDocumentsTable);
    const documentConfig = getTableConfig(stockDocumentsTable);

    expect(stockDocumentsTable[Symbol.for('drizzle:Name') as never]).toBe(
      'stock_documents',
    );
    expect(documentColumns.id.notNull).toBe(true);
    expect(documentColumns.companyId.notNull).toBe(true);
    expect(documentColumns.documentNo.notNull).toBe(true);
    expect(documentColumns.type.enumValues).toEqual(stockDocumentTypeEnum.enumValues);
    expect(documentColumns.status.enumValues).toEqual(stockDocumentStatusEnum.enumValues);
    expect(documentColumns.status.hasDefault).toBe(true);
    expect(documentColumns.originScopeNodeId.notNull).toBe(false);
    expect(documentColumns.originScopeType.notNull).toBe(false);
    expect(documentColumns.destinationScopeNodeId.notNull).toBe(false);
    expect(documentColumns.destinationScopeType.notNull).toBe(false);
    expect(documentColumns.createdByUserId.notNull).toBe(true);
    expect(documentColumns.reversalOfId.notNull).toBe(false);
    expect(documentColumns.note.notNull).toBe(false);
    expect(documentConfig.foreignKeys.map((foreignKey) => foreignKey.getName()).sort())
      .toEqual([
        'stock_documents_company_id_companies_id_fk',
        'stock_documents_created_by_user_id_users_id_fk',
        'stock_documents_destination_scope_node_company_fk',
        'stock_documents_destination_scope_node_id_scope_nodes_id_fk',
        'stock_documents_origin_scope_node_company_fk',
        'stock_documents_origin_scope_node_id_scope_nodes_id_fk',
        'stock_documents_reversal_company_fk',
        'stock_documents_reversal_of_id_stock_documents_id_fk',
      ]);
    expect(documentConfig.checks.map((check) => check.name).sort()).toEqual([
      'stock_documents_destination_scope_pair_chk',
      'stock_documents_destination_scope_type_warehouse_pos_chk',
      'stock_documents_loss_adjustment_shape_chk',
      'stock_documents_origin_scope_pair_chk',
      'stock_documents_origin_scope_type_warehouse_pos_chk',
      'stock_documents_receipt_shape_chk',
      'stock_documents_reversal_confirmed_chk',
      'stock_documents_transfer_shape_chk',
    ]);
    expect(documentConfig.indexes.map((index) => index.config.name).sort()).toEqual([
      'stock_documents_company_document_no_idx',
      'stock_documents_company_idx',
      'stock_documents_destination_scope_idx',
      'stock_documents_id_company_idx',
      'stock_documents_origin_scope_idx',
      'stock_documents_type_status_idx',
    ]);
  });

  it('defines stock document lines and stock quants with quantity bounds and tenant-safe links', () => {
    const itemConfig = getTableConfig(itemsTable);

    expect(itemConfig.indexes.map((index) => index.config.name)).toContain(
      'items_id_company_idx',
    );

    const lineColumns = getTableColumns(stockDocumentLinesTable);
    const lineConfig = getTableConfig(stockDocumentLinesTable);

    expect(stockDocumentLinesTable[Symbol.for('drizzle:Name') as never]).toBe(
      'stock_document_lines',
    );
    expect(lineColumns.id.notNull).toBe(true);
    expect(lineColumns.companyId.notNull).toBe(true);
    expect(lineColumns.documentId.notNull).toBe(true);
    expect(lineColumns.itemId.notNull).toBe(true);
    expect((lineColumns.quantity as { precision?: number; scale?: number }).precision).toBe(
      14,
    );
    expect((lineColumns.quantity as { precision?: number; scale?: number }).scale).toBe(3);
    expect((lineColumns.unitCost as { precision?: number; scale?: number }).precision).toBe(
      14,
    );
    expect((lineColumns.unitCost as { precision?: number; scale?: number }).scale).toBe(4);
    expect(lineColumns.lotId.notNull).toBe(false);
    expect(lineConfig.foreignKeys.map((foreignKey) => foreignKey.getName()).sort()).toEqual([
      'stock_document_lines_company_id_companies_id_fk',
      'stock_document_lines_document_company_fk',
      'stock_document_lines_document_id_stock_documents_id_fk',
      'stock_document_lines_item_company_fk',
      'stock_document_lines_item_id_items_id_fk',
      'stock_document_lines_lot_company_fk',
      'stock_document_lines_lot_id_stock_lots_id_fk',
    ]);
    expect(lineConfig.checks.map((check) => check.name)).toEqual([
      'stock_document_lines_quantity_positive_chk',
    ]);
    expect(lineConfig.indexes.map((index) => index.config.name).sort()).toEqual([
      'stock_document_lines_document_idx',
      'stock_document_lines_id_company_idx',
      'stock_document_lines_item_idx',
    ]);

    const quantColumns = getTableColumns(stockQuantsTable);
    const quantConfig = getTableConfig(stockQuantsTable);

    expect(stockQuantsTable[Symbol.for('drizzle:Name') as never]).toBe('stock_quants');
    expect(quantColumns.id.notNull).toBe(true);
    expect(quantColumns.companyId.notNull).toBe(true);
    expect(quantColumns.itemId.notNull).toBe(true);
    expect(quantColumns.scopeNodeId.notNull).toBe(true);
    expect(quantColumns.scopeType.notNull).toBe(true);
    expect(quantColumns.lotId.notNull).toBe(false);
    expect((quantColumns.quantity as { precision?: number; scale?: number }).precision).toBe(
      14,
    );
    expect((quantColumns.quantity as { precision?: number; scale?: number }).scale).toBe(3);
    expect((quantColumns.avgUnitCost as { precision?: number; scale?: number }).precision).toBe(
      14,
    );
    expect((quantColumns.avgUnitCost as { precision?: number; scale?: number }).scale).toBe(4);
    expect(quantColumns.quantity.hasDefault).toBe(true);
    expect(quantColumns.reservedQuantity.hasDefault).toBe(true);
    expect(quantColumns.quarantineQuantity.hasDefault).toBe(true);
    expect(quantConfig.foreignKeys.map((foreignKey) => foreignKey.getName()).sort()).toEqual([
      'stock_quants_company_id_companies_id_fk',
      'stock_quants_item_company_fk',
      'stock_quants_item_id_items_id_fk',
      'stock_quants_lot_company_fk',
      'stock_quants_lot_id_stock_lots_id_fk',
      'stock_quants_scope_node_company_fk',
      'stock_quants_scope_node_id_scope_nodes_id_fk',
    ]);
    expect(quantConfig.checks.map((check) => check.name).sort()).toEqual([
      'stock_quants_quantity_nonnegative_chk',
      'stock_quants_quarantine_nonnegative_chk',
      'stock_quants_reserved_nonnegative_chk',
      'stock_quants_reserved_quarantine_within_quantity_chk',
      'stock_quants_scope_type_warehouse_pos_chk',
    ]);
    expect(quantConfig.indexes.map((index) => index.config.name).sort()).toEqual([
      'stock_quants_company_item_scope_idx',
      'stock_quants_id_company_idx',
      'stock_quants_scope_node_idx',
    ]);
  });
});
