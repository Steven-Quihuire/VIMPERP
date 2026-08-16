# Tasks: Inventory DB Foundation

**Sequencing**: Execute AFTER `db-timesheets-foundation` lands + rebase onto `main` (avoid schema.ts conflict).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 850–1050 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (schema + perms + tags) → PR 2 (migration + meta) → PR 3 (test + verify + doc fix) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Test command | Harness | Rollback |
|------|------|-----|--------------|---------|----------|
| 1 | Inventory schema + perms | PR 1 | `pnpm --filter api typecheck` | N/A — TS compile | Revert schema.ts enums + 4 tables; perms |
| 2 | Migration SQL + meta | PR 2 | `pnpm --filter api test migration-journal` | Real PG | Drop 0027 SQL + meta entries |
| 3 | Test + verify + doc fix | PR 3 | `pnpm --filter api test migration-0027-inventory-foundation` | Real PG | Revert test file; perms merged |

## Phase 1: Foundation (repo only)

- [x] 1.1 Add 2 enums + 4 tables to `apps/api/src/shared/infrastructure/db/schema.ts` per design Schema section.
- [x] 1.2 Evaluate `unique().nullsNotDistinct()` (drizzle-orm 0.44.5) for `stock_quants` dedup. If emitted SQL matches `UNIQUE … NULLS NOT DISTINCT` exactly, use it; else hand-write SQL (decision in commit body).
- [x] 1.3 Add `inventoryStockPermissionKeys` (3 keys) and `inventoryDocumentsPermissionKeys` (4 keys) const arrays to `permissions.ts`; spread all 3 in `modulePermissionRegistry.inventory`.
- [x] 1.4 Add `0027_inventory_foundation` to `expectedJournalTags` + `expectedSnapshotTags` in `migration-journal.test.ts`.
- [ ] 1.5 `pnpm --filter api typecheck` pass; commit `feat(db-inventory): add stock tables, enums, scope-type checks, and permission arrays`.

## Phase 2: Migration + meta

- [x] 2.1 `pnpm --filter api db:generate` → `0027_inventory_foundation.sql` + `0027_snapshot.json`.
- [x] 2.2 Hand-edit `0027_inventory_foundation.sql`: append (a) `CREATE UNIQUE INDEX stock_quants_company_item_scope_lot_uk … NULLS NOT DISTINCT;` (only if 1.2 hand-written), (b) `stock_documents_scope_type_check()` plpgsql fn + trigger, (c) `stock_quants_scope_type_check()` fn + trigger.
- [x] 2.3 Confirm `meta/_journal.json` got `idx: 26, tag: '0027_inventory_foundation', breakpoints: true`; commit `feat(db-inventory): add 0027 migration with NULLS NOT DISTINCT unique and scope-type triggers`.

## Phase 3: Per-migration test (strict TDD)

- [ ] 3.1 Create `migration-0027-inventory-foundation.test.ts`: (a) `applyMigrationsThrough(0026) → applyMigrationFile(0027)` asserts columns/FKs/enums; (b) seed company+users+items+scope_nodes (warehouse, POS, division) and assert type-shape CHECKs, NULLS-NOT-DISTINCT, quantity bounds, lot uniqueness, reversal confirmed-only, scope-type trigger.
- [ ] 3.2 `pnpm --filter api test migration-0027-inventory-foundation` pass; commit `test(db-inventory): cover 0027 constraints, NULLS NOT DISTINCT, and scope triggers`.

## Phase 4: Verification

- [ ] 4.1 Full `pnpm --filter api test`, `pnpm --filter api typecheck`, `pnpm --filter api lint` — all pass.
- [ ] 4.2 Apply on fresh DB via `pnpm --filter api db:migrate`; confirm `\d+ stock_quants` lists `stock_quants_company_item_scope_lot_uk` as `NULLS NOT DISTINCT` and both triggers via `\df+`.

## Phase 5: Doc correction

- [ ] 5.1 In design.md Architecture Decisions (`UNIQUE NULLS NOT DISTINCT` for quant), replace stale "Drizzle cannot emit `NULLS NOT DISTINCT`" with Phase 1.2 evaluation result.
