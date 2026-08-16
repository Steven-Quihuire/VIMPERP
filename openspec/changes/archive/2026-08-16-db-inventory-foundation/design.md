# Design: Inventory DB Foundation

## Technical Approach

DB-only addition that lands migration `0027_inventory_foundation.sql` with four new tables (`stock_lots`, `stock_documents`, `stock_document_lines`, `stock_quants`), two enums (`stock_document_type`, `stock_document_status`), composite tenant FKs, type-shape CHECKs, a NULLS-NOT-DISTINCT unique for quant lot-deduplication, scope-type pair consistency via a BEFORE-trigger (CHECK with subquery is forbidden in PG), reversal self-FK semantics, additive permission seeds, and a per-migration test. Sequenced AFTER `db-timesheets-foundation` lands (proposal §Dependencies) to avoid schema.ts merge conflicts; no data dependency.

## Architecture Decisions

### Decision: One migration

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Single `0027_inventory_foundation.sql` | 4 tables + 2 enums; one journal entry; one test; smaller blast radius for review | **Chosen** |
| Split per-table migrations (0027 lots, 0028 docs, 0029 lines, 0030 quants) | More granular but FKs fan-in (lots ← lines, quants ← lots); ordering noisy; journal churn | Rejected |

### Decision: `UNIQUE NULLS NOT DISTINCT` for quant (companyId, itemId, scopeNodeId, lotId)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `CREATE UNIQUE INDEX stock_quants_company_item_scope_lot_uk ON stock_quants USING btree (company_id, item_id, scope_node_id, lot_id) NULLS NOT DISTINCT;` | PG 15+ syntax (project runs `postgres:17-alpine`); single index handles both null and non-null cases correctly: NULLs are NOT distinct (treated as equal) so only one null-lot quant per key. Phase 1.2 evaluated Drizzle ORM 0.44.5 and confirmed it still lacks a PostgreSQL `unique().nullsNotDistinct()` builder, so PR2 kept this as hand-written SQL (same precedent as 0016 hand-written SQL). | **Chosen** |
| Two partial indexes: `WHERE lot_id IS NOT NULL` + `WHERE lot_id IS NULL` | Two indexes; second partial unique on `(company_id, item_id, scope_node_id)` where `lot_id IS NULL` enforces "at most one null-lot per key"; more verbose, harder to read | Rejected |
| Nullable `COALESCE(lot_id, '<sentinel>')` index | Sentinel collision risk; ugly | Rejected |

### Decision: Scope-type consistency enforced by trigger, not CHECK

PG CHECK constraints cannot contain subqueries. The cross-row invariant `(scopeNodeId, scopeType) → scope_nodes.nodeType` requires a trigger. We add `BEFORE INSERT OR UPDATE` triggers `stock_documents_origin_scope_chk_trg` and `stock_quants_scope_chk_trg` that:

1. `SELECT node_type FROM scope_nodes WHERE id = NEW.scope_node_id` (raises `foreign_key_violation`-style error if missing).
2. Compare to `NEW.scope_type` and `RAISE EXCEPTION` with a stable constraint name on mismatch.

The CHECK `scope_type IN ('warehouse','point-of-sale')` stays at column level. The trigger is the only way to keep denormalized scopeType honest with `scope_nodes.nodeType` from DB side.

### Decision: Reversal pattern = reversalOfId self-FK + confirmed-only

`stock_documents.reversal_of_id uuid NULL REFERENCES stock_documents(id)`. CHECK: `reversal_of_id IS NULL OR status = 'confirmed'` (a reversal is itself confirmed; reversing a draft is meaningless). The original row is never UPDATEd or DELETEd — reversal creates a NEW row that negates quantities. The application is responsible for copying the line set with negated quantities (DB cannot enforce "lines must mirror original × -1" without complex triggers; this is documented as app-phase discipline).

### Decision: Confirm-time quant maintenance — transaction contract (described; app-phase implements)

Document contract — DB does not enforce, DB CHECKs are the safety net:

```
BEGIN;
  -- 1. Promote doc
  UPDATE stock_documents SET status='confirmed'
    WHERE id=? AND status='draft';  -- 0 rows = abort (conflict)

  -- 2. For each line, UPSERT stock_quants and recompute moving weighted avg:
  --    new_qty = old_qty + delta_signed
  --    new_avg = (old_qty*old_avg + delta*line_unit_cost) / new_qty  -- when new_qty>0
  --    new_avg = NULL                                                -- when new_qty==0
  INSERT INTO stock_quants ... ON CONFLICT (company_id, item_id, scope_node_id, lot_id)
    DO UPDATE SET quantity=..., avg_unit_cost=...;
  -- CHECK quantity>=0 rejects would-be-negative states.
COMMIT;
```

Reversal-document contract: same path with `delta_signed` negated and `reversal_of_id` set on the new document.

### Decision: Permission keys — additive, three new arrays

Append two new exported arrays in `permissions.ts`; do NOT replace `inventoryPermissionKeys` (catalog). Total new keys = 7, family normal:

```ts
export const inventoryStockPermissionKeys = [
  'inventory.stock.read', 'inventory.stock.write', 'inventory.stock.adjust',
] as const;
export const inventoryDocumentsPermissionKeys = [
  'inventory.documents.read', 'inventory.documents.write',
  'inventory.documents.confirm', 'inventory.documents.cancel',
] as const;
```

Add to `modulePermissionRegistry`:

```ts
const modulePermissionRegistry: Record<string, readonly string[]> = {
  inventory: [...inventoryPermissionKeys, ...inventoryStockPermissionKeys, ...inventoryDocumentsPermissionKeys],
  hr: hrPermissionKeys,
};
```

`permissionCatalogSeeds` picks them up automatically.

## Schema (Drizzle — `apps/api/src/shared/infrastructure/db/schema.ts`)

```ts
export const stockDocumentTypeEnum = pgEnum('stock_document_type', [
  'receipt', 'transfer', 'adjustment', 'loss',
]);
export const stockDocumentStatusEnum = pgEnum('stock_document_status', [
  'draft', 'confirmed', 'cancelled',
]);

export const stockLotsTable = pgTable('stock_lots', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: text('company_id').notNull().references(() => companiesTable.id, { onDelete: 'restrict' }),
  itemId: uuid('item_id').notNull().references(() => itemsTable.id),
  lotNumber: text('lot_number').notNull(),
  expiresAt: date('expires_at'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('stock_lots_id_company_idx').on(t.id, t.companyId),
  uniqueIndex('stock_lots_company_item_lot_idx').on(t.companyId, t.itemId, t.lotNumber),
  foreignKey({ columns: [t.itemId, t.companyId], foreignColumns: [itemsTable.id, itemsTable.companyId], name: 'stock_lots_item_company_fk' }),
  index('stock_lots_item_idx').on(t.itemId),
  index('stock_lots_expires_at_idx').on(t.expiresAt),
]);

export const stockDocumentsTable = pgTable('stock_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: text('company_id').notNull().references(() => companiesTable.id, { onDelete: 'restrict' }),
  documentNo: text('document_no').notNull(),
  type: stockDocumentTypeEnum('type').notNull(),
  status: stockDocumentStatusEnum('status').notNull().default('draft'),
  originScopeNodeId: text('origin_scope_node_id').references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
  originScopeType: text('origin_scope_type'),
  destinationScopeNodeId: text('destination_scope_node_id').references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
  destinationScopeType: text('destination_scope_type'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdByUserId: text('created_by_user_id').notNull().references(() => usersTable.id, { onDelete: 'restrict' }),
  reversalOfId: uuid('reversal_of_id'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('stock_documents_id_company_idx').on(t.id, t.companyId),
  uniqueIndex('stock_documents_company_document_no_idx').on(t.companyId, t.documentNo),
  foreignKey({ columns: [t.originScopeNodeId, t.companyId], foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId], name: 'stock_documents_origin_scope_node_company_fk' }),
  foreignKey({ columns: [t.destinationScopeNodeId, t.companyId], foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId], name: 'stock_documents_destination_scope_node_company_fk' }),
  foreignKey({ columns: [t.reversalOfId, t.companyId], foreignColumns: [stockDocumentsTable.id, stockDocumentsTable.companyId], name: 'stock_documents_reversal_company_fk' }),
  check('stock_documents_scope_type_warehouse_pos_chk', sql`${t.originScopeType} IS NULL OR ${t.originScopeType} IN ('warehouse','point-of-sale')`),
  check('stock_documents_destination_scope_type_warehouse_pos_chk', sql`${t.destinationScopeType} IS NULL OR ${t.destinationScopeType} IN ('warehouse','point-of-sale')`),
  check('stock_documents_reversal_confirmed_chk', sql`${t.reversalOfId} IS NULL OR ${t.status} = 'confirmed'`),
  check('stock_documents_receipt_shape_chk', sql`${t.type} <> 'receipt' OR (${t.originScopeNodeId} IS NULL AND ${t.destinationScopeNodeId} IS NOT NULL)`),
  check('stock_documents_loss_adjustment_shape_chk', sql`${t.type} NOT IN ('loss','adjustment') OR (${t.originScopeNodeId} IS NOT NULL AND ${t.destinationScopeNodeId} IS NULL)`),
  check('stock_documents_transfer_shape_chk', sql`${t.type} <> 'transfer' OR (${t.originScopeNodeId} IS NOT NULL AND ${t.destinationScopeNodeId} IS NOT NULL AND ${t.originScopeNodeId} <> ${t.destinationScopeNodeId})`),
  index('stock_documents_company_idx').on(t.companyId),
  index('stock_documents_type_status_idx').on(t.companyId, t.type, t.status),
  index('stock_documents_origin_scope_idx').on(t.originScopeNodeId),
  index('stock_documents_destination_scope_idx').on(t.destinationScopeNodeId),
]);

export const stockDocumentLinesTable = pgTable('stock_document_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: text('company_id').notNull().references(() => companiesTable.id, { onDelete: 'restrict' }),
  documentId: uuid('document_id').notNull().references(() => stockDocumentsTable.id, { onDelete: 'restrict' }),
  itemId: uuid('item_id').notNull().references(() => itemsTable.id),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 4 }),
  lotId: uuid('lot_id').references(() => stockLotsTable.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('stock_document_lines_id_company_idx').on(t.id, t.companyId),
  foreignKey({ columns: [t.documentId, t.companyId], foreignColumns: [stockDocumentsTable.id, stockDocumentsTable.companyId], name: 'stock_document_lines_document_company_fk' }),
  foreignKey({ columns: [t.itemId, t.companyId], foreignColumns: [itemsTable.id, itemsTable.companyId], name: 'stock_document_lines_item_company_fk' }),
  foreignKey({ columns: [t.lotId, t.companyId], foreignColumns: [stockLotsTable.id, stockLotsTable.companyId], name: 'stock_document_lines_lot_company_fk' }),
  check('stock_document_lines_quantity_positive_chk', sql`${t.quantity} > 0`),
  index('stock_document_lines_document_idx').on(t.documentId),
  index('stock_document_lines_item_idx').on(t.itemId),
]);

export const stockQuantsTable = pgTable('stock_quants', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: text('company_id').notNull().references(() => companiesTable.id, { onDelete: 'restrict' }),
  itemId: uuid('item_id').notNull().references(() => itemsTable.id),
  scopeNodeId: text('scope_node_id').notNull().references(() => scopeNodesTable.id, { onDelete: 'restrict' }),
  scopeType: text('scope_type').notNull(),
  lotId: uuid('lot_id').references(() => stockLotsTable.id, { onDelete: 'restrict' }),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull().default('0'),
  reservedQuantity: numeric('reserved_quantity', { precision: 14, scale: 3 }).notNull().default('0'),
  quarantineQuantity: numeric('quarantine_quantity', { precision: 14, scale: 3 }).notNull().default('0'),
  avgUnitCost: numeric('avg_unit_cost', { precision: 14, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex('stock_quants_id_company_idx').on(t.id, t.companyId),
  foreignKey({ columns: [t.itemId, t.companyId], foreignColumns: [itemsTable.id, itemsTable.companyId], name: 'stock_quants_item_company_fk' }),
  foreignKey({ columns: [t.scopeNodeId, t.companyId], foreignColumns: [scopeNodesTable.id, scopeNodesTable.companyId], name: 'stock_quants_scope_node_company_fk' }),
  foreignKey({ columns: [t.lotId, t.companyId], foreignColumns: [stockLotsTable.id, stockLotsTable.companyId], name: 'stock_quants_lot_company_fk' }),
  check('stock_quants_scope_type_warehouse_pos_chk', sql`${t.scopeType} IN ('warehouse','point-of-sale')`),
  check('stock_quants_quantity_nonnegative_chk', sql`${t.quantity} >= 0`),
  check('stock_quants_reserved_nonnegative_chk', sql`${t.reservedQuantity} >= 0`),
  check('stock_quants_quarantine_nonnegative_chk', sql`${t.quarantineQuantity} >= 0`),
  check('stock_quants_reserved_quarantine_within_quantity_chk', sql`${t.reservedQuantity} + ${t.quarantineQuantity} <= ${t.quantity}`),
  index('stock_quants_company_item_scope_idx').on(t.companyId, t.itemId, t.scopeNodeId),
  index('stock_quants_scope_node_idx').on(t.scopeNodeId),
]);
// Phase 1.2 evaluation kept stock_quants_company_item_scope_lot_uk as hand-written SQL.
```

## Migration `0027_inventory_foundation.sql` outline

Order (each statement ends with `--> statement-breakpoint`):

1. `CREATE TYPE stock_document_type AS ENUM ('receipt','transfer','adjustment','loss');`
2. `CREATE TYPE stock_document_status AS ENUM ('draft','confirmed','cancelled');`
3. CREATE TABLE for the four tables with column FKs and inline CHECKs/defaults.
4. ALTER TABLE composite-tenant FKs (the FK names follow `{table}_{col}_{reftable}_fk` convention).
5. CREATE UNIQUE/INDEX statements for all `*_id_company_idx`, `stock_lots_company_item_lot_idx`, `stock_documents_company_document_no_idx`, lookup indexes.
6. Hand-written unique with NULLS NOT DISTINCT (Phase 1.2 confirmed Drizzle 0.44.5 still cannot model this builder):
   ```sql
   CREATE UNIQUE INDEX stock_quants_company_item_scope_lot_uk
     ON stock_quants USING btree (company_id, item_id, scope_node_id, lot_id)
     NULLS NOT DISTINCT;
   ```
7. Hand-written scope-type pair triggers (Drizzle cannot emit `CREATE TRIGGER`; precedent: 0016):
   ```sql
   CREATE OR REPLACE FUNCTION stock_documents_scope_type_check()
   RETURNS trigger LANGUAGE plpgsql AS $$
   DECLARE origin_node_type text; dest_node_type text;
   BEGIN
     IF NEW.origin_scope_node_id IS NOT NULL THEN
       SELECT node_type INTO origin_node_type FROM scope_nodes
         WHERE id = NEW.origin_scope_node_id AND company_id = NEW.company_id;
       IF origin_node_type IS DISTINCT FROM NEW.origin_scope_type THEN
         RAISE EXCEPTION 'stock_documents_origin_scope_type_mismatch';
       END IF;
     END IF;
     IF NEW.destination_scope_node_id IS NOT NULL THEN
       SELECT node_type INTO dest_node_type FROM scope_nodes
         WHERE id = NEW.destination_scope_node_id AND company_id = NEW.company_id;
       IF dest_node_type IS DISTINCT FROM NEW.destination_scope_type THEN
         RAISE EXCEPTION 'stock_documents_destination_scope_type_mismatch';
       END IF;
     END IF;
     RETURN NEW;
   END; $$;
   CREATE TRIGGER stock_documents_scope_type_check_trg
     BEFORE INSERT OR UPDATE ON stock_documents
     FOR EACH ROW EXECUTE FUNCTION stock_documents_scope_type_check();
   -- analogous trigger for stock_quants (single scopeNodeId/scopeType pair).
   ```
8. `meta/_journal.json` `idx: 26, tag: '0027_inventory_foundation'`. New `0027_snapshot.json` from `drizzle-kit generate`.

## Permission Seeds — `permissions.ts` patch

Additive only (catalog already spreads `inventoryPermissionKeys`); add two new const arrays and extend `modulePermissionRegistry`:

```ts
export const inventoryStockPermissionKeys = [
  'inventory.stock.read', 'inventory.stock.write', 'inventory.stock.adjust',
] as const;
export const inventoryDocumentsPermissionKeys = [
  'inventory.documents.read', 'inventory.documents.write',
  'inventory.documents.confirm', 'inventory.documents.cancel',
] as const;
const modulePermissionRegistry = {
  inventory: [
    ...inventoryPermissionKeys,
    ...inventoryStockPermissionKeys,
    ...inventoryDocumentsPermissionKeys,
  ],
  hr: hrPermissionKeys,
};
```

`getCompanyUserPermissionKeys` still strips `catalog.delete`; new keys flow through. No other code paths change.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modify | 2 enums + 4 tables |
| `apps/api/src/db/migrations/0027_inventory_foundation.sql` | Create | All DDL + hand-written NULLS-NOT-DISTINCT + triggers |
| `apps/api/src/db/migrations/meta/_journal.json` | Modify | Append `0027_inventory_foundation` |
| `apps/api/src/db/migrations/meta/0027_snapshot.json` | Create | drizzle-kit generate output |
| `apps/api/src/db/migrations/__tests__/migration-0027-inventory-foundation.test.ts` | Create | Per-migration assertions |
| `apps/api/src/features/roles-management/domain/permissions.ts` | Modify | 2 new const arrays + registry extension |

## Testing Strategy

Per-migration test `migration-0027-inventory-foundation.test.ts` via `createMigrationTestDatabase`:

| Layer | What | Approach |
|-------|------|----------|
| Unit (real PG) | Schema baseline | `applyMigrationsThrough(0026) → applyMigrationFile(0027)`; assert column order, enum labels, FK existence (information_schema + pg_constraint) |
| Integration (real PG) | Constraints fire | Insert company, users, items, scope_nodes (warehouse + POS + division); seed items with `trackBatchMode='batch'`; assert: type-shape CHECKs reject bad receipt/loss/transfer combos, scope-type CHECK accepts valid pairs and trigger rejects mismatch, NULLS-NOT-DISTINCT unique rejects duplicate null-lot row, quantity CHECK >=0, reserved+quarantine<=quantity, lot uniqueness per (company,item,lotNumber), reversal CHECK requires confirmed |
| Journal | End-to-end | `migration-journal.test.ts` already runs `drizzle-kit migrate`; new entry auto-picked |

## Data Flow

```
                    ┌─────── document confirm (draft → confirmed) ──────┐
                    ▼                                                    │
stock_documents ──lines──▶ stock_document_lines ──UPSERT on conflict──▶ stock_quants
        │                                          (moving wtd avg)        │
        └──reversalOfId self-FK ──▶ new confirmed doc with negated qty ──┘
                                        │
stock_lots ─────────────────────────────┘  (nullable lotId; trackBatchMode gate)
```

## Threat Matrix

N/A — DB-only change; no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Single migration `0027_inventory_foundation.sql`; runs once on dev/CI/test pipelines. Rollback: drop triggers (`DROP TRIGGER ... ON stock_documents`; `DROP TRIGGER ... ON stock_quants`), drop `stock_quants_company_item_scope_lot_uk`, drop tables in reverse FK order, drop enums. No data migration — feature unreleased.

## Open Questions

None blocking. Item `trackBatchMode` lot gating (`mode='none' → lotId NULL; 'batch'/'serial' → lotId NOT NULL`) is app-phase discipline; cross-table CHECK is not expressible in PG without expensive triggers (deferred to app-layer). Quant-maintenance math is described here as a contract for the upcoming app-phase change. FIFO/cost-layer valuation deferred; moving weighted average is sufficient for foundation. Reconciliation job (drift detection between documents and quants) deferred.
