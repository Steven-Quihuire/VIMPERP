# Exploration: Frontend Timesheets + Inventory Backend Readiness

Scope: determine what backend exists or is missing for Timesheets ("Registro de horas") and Inventory ("Inventario"), aligned to the archived DB foundations, so the frontend SDD can start safely. Read-only investigation; no application code modified.

## Current State

### Timesheets (Registro de horas)

- **DB — COMPLETE & ARCHIVED** (`db-timesheets-foundation`, migration `0026_timesheets.sql`). Canonical spec `openspec/specs/hr-timesheets/spec.md`: `timesheet_periods` + `time_entries` (uuid PKs, tenant-safe composite FKs), status `draft|submitted|approved|rejected`, `approvalPolicyId` snapshot, `btree_gist` exclusion constraint `timesheet_periods_no_overlap_excl` (no overlapping periods per assignment), hours `numeric(5,2)` with `0 < hours <= 24`, submit/approve timestamp+user pair CHECKs, permission seeds `hr.timesheets.read|write|submit|approve`.
- **Backend — COMPLETE & COMMITTED, NOT YET ARCHIVED** (`backend-timesheets-foundation`, commits `487991c` + `4e117ca`). Full vertical slice at `apps/api/src/features/hr-timesheets/` (domain/application/infrastructure/presentation):
  - 11 routes under `/companies/:companyId/timesheets`: POST/GET collection, GET/PATCH `:periodId`, POST/PATCH/DELETE `:periodId/entries/:entryId?`, POST `:periodId/submit|approve|reject|reopen`.
  - Domain state machine `draft→submitted→approved|rejected`, `rejected→draft` (reopen); draft-only mutation; self-approval rejection; rejection reason required.
  - Submit is transactional (SELECT FOR UPDATE) and auto-resolves the active approval policy snapshot via `approvalPolicyGateway.findActivePolicyForScope`.
  - Auth-scoped visibility: `resolveTimesheetPermissionScope` resolves only `self` (via active ERP-access link) or `direct_reports` (via direct-report assignments); no company/node fallback.
  - 10 typed domain errors mapped in `shared/presentation/error.middleware.ts` (400/404/409, incl. 23P01 overlap → `TIMESHEET_PERIOD_OVERLAP`, 23505 → `TIMESHEET_ENTRY_CONFLICT`).
  - Permissions via `requireAuth` + `requireHrCapability(key)` + `ensureCompanyAccess`.
  - Evidence: 464 API tests pass, 89.01% coverage, lint green; verify 5/5 requirements, 10/10 scenarios, 26/26 tasks. **Verdict FAIL only on the unrelated org-hierarchy typecheck/build baseline** (re-confirmed failing today), which keeps the SDD change un-archived but is not a functional gap. Wiring in `create-app.ts` intact (current working-tree diff there is unrelated hr-erp-access pagination work).
- **Frontend — NONE.** No `apps/web/src/features/hr-timesheets`, no route in `app.tsx`, no sidebar entry. The web app already has the established pattern to consume it: typed `HttpClient` (`shared/lib/http/http-client.ts`), TanStack Query gateways (`features/items/infrastructure/item-queries.ts`), Zustand client state, company-scoped route wrappers.

### Inventory (Inventario)

- **DB — COMPLETE & ARCHIVED** (`db-inventory-foundation`, migration `0027_inventory_foundation.sql`). Canonical spec `openspec/specs/inventory-stock/spec.md`: `stock_lots`, `stock_documents` (type `receipt|transfer|adjustment|loss`, status `draft|confirmed|cancelled`, `reversalOfId` reversal model, origin/destination shape CHECKs, warehouse|point-of-sale scope restriction), `stock_document_lines` (`numeric(14,3)` quantity, `numeric(14,4)` unitCost, nullable lotId), `stock_quants` (non-negative quantity/reserved/quarantine, `reserved+quarantine <= quantity`, `avgUnitCost` moving weighted average, null-safe uniqueness per company/item/scope/lot), permission seeds `inventory.stock.read|write|adjust` + `inventory.documents.read|write|confirm|cancel`.
- **Backend — ZERO.** No `apps/api/src/features/` inventory slice exists: no domain types, no use cases, no gateway, no router, no error mappings, no tests. Permission seeds exist in `roles-management/domain/permissions.ts` (`inventoryStockPermissionKeys`, `inventoryDocumentsPermissionKeys`) but nothing consumes them. `backend-inventory-foundation` was the declared next step in session #1314 and was never started (no commits, no openspec change folder).
- **Frontend — NONE.** The existing `items` web feature is the item catalog (item-catalog-web spec), i.e. the item master — not stock. No stock/inventory pages or routes.

## Affected Areas

- `apps/api/src/features/hr-timesheets/**` — existing complete backend slice the Timesheets frontend will consume (contract source of truth: router Zod schemas + domain DTO shapes).
- `apps/api/src/app/create-app.ts` — timesheets wiring done; would also be the wiring point for a future inventory slice.
- `apps/api/src/shared/presentation/error.middleware.ts` — has 10 timesheet error mappings; inventory errors would be added here by a future backend change.
- `apps/api/src/shared/infrastructure/db/schema.ts` — inventory stock tables already defined (no changes needed for backend work).
- `apps/api/src/features/roles-management/domain/permissions.ts` — inventory permission seeds already present.
- `apps/web/src/app/app.tsx`, `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` — where new Timesheets/Inventory frontend routes and nav entries would be registered.
- `apps/web/src/shared/lib/http/http-client.ts` + existing feature examples (`features/items/**`, `features/hr-employees/**`) — the frontend contract pattern to replicate.
- `openspec/specs/hr-timesheets/spec.md`, `openspec/specs/inventory-stock/spec.md` — canonical DB specs backing both modules.
- `openspec/changes/backend-timesheets-foundation/` — un-archived change (verify FAIL only on baseline gate).
- `openspec/changes/fix-api-typecheck-baseline/` — stuck at exploration (propose phase blocked by the `sdd_task_result_empty` tool defect); blocks the timesheets archive gate and repo-wide green typecheck/build.

## Backend Readiness Matrix

| Layer | Timesheets | Inventory |
|---|---|---|
| DB schema + migration + tests | ✅ archived (0026) | ✅ archived (0027) |
| Canonical spec | ✅ `hr-timesheets` | ✅ `inventory-stock` |
| Permission seeds | ✅ `hr.timesheets.*` consumed by router | ⚠️ `inventory.stock.*` / `inventory.documents.*` seeded, **unconsumed** |
| Domain types/errors | ✅ (state machine, 10 errors) | ❌ none |
| Application use cases | ✅ 11 (create/get/list/patch period, 3 entry ops, submit/approve/reject/reopen) | ❌ none |
| Repository port + Drizzle adapter | ✅ `drizzle-timesheets.gateway.ts` (real-PG tests, 23P01/23505 translation) | ❌ none |
| API routes + Zod validation | ✅ 11 routes | ❌ none |
| Error middleware mappings | ✅ 10 mappings | ❌ none |
| Auth-scoped visibility rules | ✅ self + direct_reports | ❌ undefined (needs decision: likely company/node scope via role assignments) |
| API tests (unit + real-PG + router) | ✅ 464 tests / 89% coverage | ❌ none |
| SDD change status | implemented+committed; **archive blocked on baseline typecheck/build only** | not started |
| Frontend feature | ❌ none | ❌ none |

## Backend Gaps Before Frontend

### Must-have before Inventory frontend MVP (a full `backend-inventory-foundation` slice, mirrors hr-timesheets)

1. Domain: stock document/quant/lot types, document state machine (`draft→confirmed|cancelled`, reversal via `reversalOfId`), typed error catalog.
2. Use cases: create draft document (per type shape), confirm document — transactional quant maintenance (upsert `stock_quants`, moving weighted average cost, lot-safe quant updates, negative-stock rejection), cancel/reverse document, list/get documents, list on-hand quants (by item/scope).
3. Drizzle gateway: tenant-safe queries, quant row locking on confirm (SELECT FOR UPDATE precedent from timesheets submit), constraint translation (23505/23P01/check violations → typed errors).
4. Router + Zod schemas + error middleware mappings; permission wiring for `inventory.documents.*` / `inventory.stock.*`; warehouse|point-of-sale scope validation; `items.trackBatchMode` gating of `lotId` (explicitly deferred to application logic by the DB spec).
5. Tests per strict TDD (unit + real-PG migration tests + router tests).

### Must-have before Timesheets frontend MVP

- **None.** The API is complete, committed, and stable. Optionally: archive `backend-timesheets-foundation` (process gate only, blocked on the typecheck baseline).

### Optional / later (both modules)

- Timesheets: pagination/date-range/employee filters on `GET /timesheets` (today only `?status=`); per-day aggregate caps and overtime modeling (deferred by Odoo-style decisions); projects module + `projectId` FK (today free-form nullable, no FK).
- Inventory: reservation/quarantine consuming use cases (columns + CHECKs exist, unconsumed); FIFO/standard costing; reconciliation; reporting/aggregations; e2e coverage.

### DB/backend mismatch or unimplemented invariants

- Timesheets: none found — every DB invariant (overlap, hours bounds, tenant FKs, actor pairs) is enforced or translated in the backend; `entryDate` within period is app-layer duty (implemented in use cases, by design from 0026).
- Inventory: by design of the DB-only change, application invariants are ALL currently unimplemented: trackBatchMode→lot gating, quant maintenance on confirm, reversal semantics, scope-shape validation beyond DB CHECKs. Known verify warning on timesheets (approval-policy lookup uses outer `db` inside the submit transaction callback) — advisory only.

## Approaches

1. **Split-track: Timesheets frontend now, Inventory backend next (recommended)**
   - Start the Timesheets frontend SDD immediately (contract stable and tested); run `backend-inventory-foundation` as its own SDD change before its frontend.
   - Pros: zero mock drift for Timesheets; follows the user's DB→BACKEND→FRONTEND line; both tracks keep clean review budgets; backend-inventory reuses the proven hr-timesheets slice pattern (3-PR chain).
   - Cons: Inventory frontend cannot start until its backend lands (est. one SDD cycle: domain+use cases / gateway / router).
   - Effort: Low (start timesheets FE) + Medium-High (inventory backend slice).

2. **Frontend for both with mocked contracts**
   - Build both frontends now against hand-written mocks; wire to real APIs later.
   - Pros: maximum parallelism of UI work.
   - Cons: contract drift and rework risk; inventory contract would be guessed (confirm-time quant maintenance and valuation semantics are non-trivial and unimplemented); throwaway mocks; contradicts the established DB→BACKEND→FRONTEND sequence; doubles verification cost.
   - Effort: Medium now + High rework later. Not recommended.

3. **Backend-first for everything (block all frontend until inventory backend done)**
   - Pros: strictest contract-first purity; single context switch.
   - Cons: needlessly delays the Timesheets frontend whose backend is already green; wastes ready value.
   - Effort: Medium-High. Not recommended.

## Recommendation

Frontend SDD can start **now for Timesheets** — its backend is complete, committed, and verified (the only FAIL is the unrelated org-hierarchy typecheck/build baseline, which does not affect runtime behavior or the HTTP contract). For **Inventory**, the frontend must wait for a `backend-inventory-foundation` SDD change (full vertical slice, must-have list above); mock-driven UI is not advisable given the unimplemented confirm/valuation semantics.

Additionally, resolve `fix-api-typecheck-baseline` soon (fallback: direct ~60–80-line type-only fix authorized earlier by the user): it currently blocks the `backend-timesheets-foundation` archive and will trip the same baseline-build FAIL gate on every future verify.

## Risks

- Repo-wide `pnpm --filter api typecheck`/`build` still exit 2 on the known org-hierarchy baseline (re-confirmed failing today) — every new SDD verify will repeat the FAIL-BASELINE-gate pattern until fixed; timesheets archive stays blocked.
- `fix-api-typecheck-baseline` is stuck at exploration: the sdd-propose phase hit the `sdd_task_result_empty` tool defect (upstream issue gentle-ai#3318).
- Inventory confirm flow is the highest-complexity backend slice: transactional quant upserts with row locking, weighted-average cost math (numeric(14,4) rounding), lot-safe uniqueness — needs careful spec/design, not just CRUD.
- Timesheets `listPeriods` has no pagination and only a `status` filter; a large-period frontend list UX may require a small additive backend change later.
- The working tree currently holds unrelated in-progress HR page-size changes (incl. modified `create-app.ts`); new SDD work must not mix with them.
- Minor: approval-policy adapter transaction-enlistment not independently proven (verify warning); advisory.

## Ready for Proposal

**Yes** — recommend two sequenced changes: (1) `frontend-hr-timesheets` (can start immediately), and (2) `backend-inventory-foundation` (must precede `frontend-inventory`). The orchestrator should tell the user: Timesheets backend is done and green (only the process archive is blocked on the unrelated typecheck baseline); Inventory has zero backend and needs the full backend slice first; fixing the typecheck baseline is the highest-leverage unblock for the SDD pipeline itself.
