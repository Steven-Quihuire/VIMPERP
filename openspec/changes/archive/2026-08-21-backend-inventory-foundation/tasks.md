# Tasks: Backend Inventory Foundation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500 (12 routes × 12 use cases + domain + infra + tests + wiring) |
| 400-line budget risk | High |
| Team per-PR review budget | 800 changed lines |
| Chained PRs recommended | Yes |
| Suggested split | PR #1 (S1) → PR #2 (S2) → PR #3 (S3) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units (feature-branch-chain, each ≤800 lines)

| # | Goal | PR base | Focused test command | Runtime harness | Rollback boundary |
|---|------|---------|----------------------|-----------------|-------------------|
| 1 | Domain + 12 use cases + in-memory gateway | `backend-inventory-foundation` (tracker) | `pnpm --filter api test -- inventory/application` | N/A — pure TS, no HTTP/PG (reason: tested via `InMemoryStockDocumentsGateway`) | Drop `apps/api/src/features/inventory/{domain,application}/`; revert PR #1 only |
| 2 | Drizzle gateway + PG tx + trigger translator + integration | PR #1 branch | `pnpm --filter api test -- inventory/infrastructure` | `createMigrationTestDatabase` + `applyMigrationsThrough('0027_*.sql')` (Vitest, real PG) | Revert PR #2 commits; S1 stays |
| 3 | Router + 12 routes + Zod + error mw + `create-app` wiring + supertest | PR #2 branch | `pnpm --filter api test -- inventory/presentation` | supertest + `createApp` w/ in-memory gateway (Vitest HTTP) | Revert PR #3 wiring + middleware edits; S2 stays |

### Pre-apply prerequisite (orchestrator-owned, NOT code)

- [x] P.0 Rebase/reset `backend-inventory-foundation` onto `horas` (34 commits: migration 0027 + hr-timesheets). Verify `git log horas..HEAD --oneline` empty + `pnpm --filter api typecheck` passes. Blocks `sdd-apply`.

## Phase 1 — Domain + Application (S1, PR #1)

- [x] 1.1 Create `apps/api/src/features/inventory/domain/stock-documents.ts`: `StockDocument`/`Line` types, `TrackBatchMode`, `computeNewAvg(prevQty,prevAvg,addQty,addCost)` → `toFixed(4)`, pure `generateDocumentNo({companyCode,originShort,seq})`, lot validator, 6 typed errors
- [x] 1.2 RED `domain/__tests__/stock-documents.test.ts`: table-driven MWA (qty→0 ⇒ null avg), `generateDocumentNo` format, lot mode (batch/serial/none)
- [x] 1.3 Create 6 document use-case factories: `application/{create,list,get,confirm,cancel,reverse}-document.ts` (asserts, lot gating, MWA, documentNo gen/retry 23505, adjustment double-gate)
- [x] 1.4 Create 3 draft-line use-case factories: `application/lines/{add,update,remove}-line.ts` (reject unless status==='draft')
- [x] 1.5 Create 3 lot/quant use-case factories: `application/lots/{create,list}-lot.ts` + `list-quants.ts`
- [x] 1.6 Add `application/__tests__/support.ts`: `InMemoryStockDocumentsGateway` + builders
- [x] 1.7 RED `application/__tests__/*.test.ts`: 12 use cases incl. adjustment double-gate 403, cancel compensates, reversal chain, draft-only edits

## Phase 2 — Infrastructure (S2, PR #2)

- [x] 2.1 RED `infrastructure/translate-stock-scope-trigger-error.ts`: match 5 stable PG messages + ERRCODE 23514/23503 → typed errors
- [x] 2.2 Create `infrastructure/drizzle-stock-documents.gateway.ts`: composite-tenant gateway; raw `INSERT … ON CONFLICT (company,item,scope,lot) NULLS NOT DISTINCT DO UPDATE`; tx confirm (`FOR UPDATE` + status flip + upsert); cancel (negate quants, status='cancelled'); reversal (clone negated lines + `reversalOfId`, then confirm); transfer OUT+IN
- [x] 2.3 RED/GREEN `infrastructure/__tests__/drizzle-stock-documents.gateway.test.ts`: real PG via `createMigrationTestDatabase` + `applyMigrationsThrough('0027_*.sql')`; confirm tx, NULL-lot upsert, NULL-avg at qty 0, transfer out+in, reversal chain, lot uniq 23505, trigger translation

## Phase 3 — Presentation + Wiring (S3, PR #3)

- [x] 3.1 Modify `apps/api/src/shared/presentation/error.middleware.ts`: add 6 inventory error classes (400/404/409) wired to translator output
- [x] 3.2 Create `apps/api/src/features/inventory/presentation/stock.router.ts`: 12 routes under `/companies/:companyId/stock-*`, Zod schemas, `requireAuth` + `requireCapability(inventory.*)` + `ensureCompanyAccess`
- [x] 3.3 RED `presentation/__tests__/stock.router.test.ts`: supertest + `createApp`; 401/403/404/409, cross-company 403, adjustment double-gate, Zod 400
- [x] 3.4 Modify `apps/api/src/app/create-app.ts`: construct composite gateway; mount `createStockRouter(...)`
- [x] 3.5 Run `pnpm --filter api test` (full slice) + `pnpm --filter api typecheck`; capture exit codes in apply-progress

## Notes

- Strict-TDD per slice (Vitest). `config.yaml:rules.apply.tdd=true`.
- Threat matrix all N/A (HTTP only). 5 PG messages + ERRCODE 23514/23503 RED-tested in S2.
- All 12 routes behind `requireAuth` + `requireCapability(inventory.*)` + `ensureCompanyAccess`. No frontend.
- Per-child base: PR #1 → tracker, PR #2 → PR #1 branch, PR #3 → PR #2 branch. If child PR shows previous slice diff, retarget/rebase.
