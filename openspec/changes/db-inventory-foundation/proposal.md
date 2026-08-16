# Proposal: Inventory DB Foundation

## Intent

Enable the Inventory module at the DB layer only: stock documents (receipt|transfer|adjustment|loss) with lines in draft|confirmed|cancelled states, quants maintained on confirm with reversal semantics, lot/serial tracking gated by `items.trackBatchMode`, and moving weighted average valuation. Stock lives **only** on warehouse and point-of-sale nodes. No API, UI, or application logic.

## Scope

### In Scope
- `stock_lots`: id `uuid defaultRandom`; companyId FK restrict; itemId FK items + composite tenant FK; lotNumber text; expiresAt date nullable; unique (companyId, itemId, lotNumber); timestamps. Usage gated by `items.trackBatchMode` (none|batch|serial — app-enforced; cross-table CHECK not expressible).
- `stock_documents`: id uuid; companyId FK restrict; type pgEnum `receipt|transfer|adjustment|loss`; status pgEnum `draft|confirmed|cancelled`; origin/destinationScopeNodeId nullable FK scope_nodes + composite tenant FKs; denormalized origin/destinationScopeType CHECK IN ('warehouse','point-of-sale') with id↔type pair CHECKs (mirrors role_assignments pattern); type CHECKs (receipt: origin NULL + dest NOT NULL; loss/adjustment: dest NULL + origin NOT NULL; transfer: both NOT NULL AND origin ≠ dest); occurredAt timestamptz; createdByUserId FK users restrict; reversalOfId self-FK nullable (reversal semantics); note; unique (id, companyId).
- `stock_document_lines`: id uuid; companyId FK restrict; documentId FK + composite tenant FK; itemId FK items + composite tenant FK; quantity `numeric(14,3)` CHECK > 0; unitCost `numeric(14,4)` nullable; lotId nullable FK stock_lots + composite tenant FK.
- `stock_quants`: id uuid; companyId FK restrict; itemId + scopeNodeId with composite tenant FKs; scopeType CHECK IN ('warehouse','point-of-sale'); lotId nullable + composite tenant FK; quantity/reservedQuantity/quarantineQuantity `numeric(14,3)` CHECK >= 0 (negative stock globally forbidden); CHECK reserved+quarantine <= quantity; `avgUnitCost numeric(14,4)` nullable (moving weighted average); unique (companyId, itemId, scopeNodeId, lotId — nullable-lot partial/COALESCE index, spec decides). Maintained on confirm.
- Permission seeds: `inventory.stock.read|write|adjust` + `inventory.documents.*` in permissions.ts catalog.
- Migration(s) `0027+` with per-file migration tests (type/status CHECKs, non-negative quants, tenant FKs).

### Out of Scope
Routes/controllers/use cases, frontend, quants-maintenance logic (app-phase), FIFO/cost layers, items cost column, RLS, reconciliation jobs, other node types as stock locations.

## Capabilities

### New Capabilities
- `inventory-stock`: stock documents/lines/lots/quants storage, location scoping, valuation columns, permission keys.

### Modified Capabilities
- None. Builds on items + scope_nodes read-only; item-catalog spec unchanged.

## Approach

Extend `schema.ts` (same tenancy pattern as timesheets). `drizzle-kit generate` for tables/enums/FKs/indexes. Strict TDD per migration. Quants updated transactionally on confirm (app-phase); DB CHECK >= 0 is the safety net.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | 4 tables, 2 enums, tenant FKs, CHECKs, indexes |
| `apps/api/src/db/migrations/0027_*.sql` + journal | New | Inventory DDL (possibly split migrations) |
| `apps/api/src/db/migrations/__tests__/migration-0027-*.test.ts` | New | Constraint assertions per migration |
| `apps/api/src/features/roles-management/domain/permissions.ts` | Modified | `inventory.stock.*` / `inventory.documents.*` keys |

## Risks

| Risk | Likelihood | Mitigation |
|-----|------------|------------|
| Quant drift vs document ledger (app-maintained) | Medium | Same-transaction writes app-phase; reconciliation deferred, documented |
| Nullable lotId uniqueness edge | Medium | Partial/COALESCE unique index — decided at spec |
| Largest schema addition to date; schema.ts conflicts | Medium | Sequenced AFTER db-timesheets-foundation |
| Movement immutability relies on app discipline (no RLS) | Accepted | Documented; reversal pattern mandated |

## Rollback Plan

Drop `stock_document_lines`, `stock_documents`, `stock_quants`, `stock_lots`, enums, indexes; revert migration files + journal. Feature unreleased — no data migration.

## Dependencies

- **Sequenced after `db-timesheets-foundation`** rebase on schema.ts (conflict avoidance only — zero cross-FKs between the modules).
- Leverages existing `items.trackBatchMode`, `scope_nodes` (trigger-maintained), `users`.

## Success Criteria

- [ ] Migrations apply clean on fresh DB + CI; journal test green
- [ ] Type CHECK matrix, scope-type CHECKs, non-negative quant CHECK verified by tests
- [ ] Unique (companyId, itemId, lotNumber) and tenant FKs enforced
- [ ] `pnpm test` + typecheck green

## Assumptions

Accepted (binding): quantities numeric(14,3); valuation moving weighted average (avgUnitCost on quants, unitCost per line); negative stock globally forbidden; only warehouse|point-of-sale hold stock; lots included day one; documents+lines (not atomic single-row movements); uuid PKs; full tenancy pattern; per-migration tests.
