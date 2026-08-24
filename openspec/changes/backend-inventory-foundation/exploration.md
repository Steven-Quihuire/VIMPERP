# Exploration: backend-inventory-foundation

## Current State

The DB foundation for Inventory is fully landed and archived
(`2026-08-16-db-inventory-foundation`). Confirmed on disk today:

- `apps/api/src/db/migrations/0027_inventory_foundation.sql` — `stock_lots`,
  `stock_documents`, `stock_document_lines`, `stock_quants`; enums
  `stock_document_type` (receipt|transfer|adjustment|loss) and
  `stock_document_status` (draft|confirmed|cancelled); composite tenant FKs;
  per-type origin/destination shape CHECKs; scope-pair CHECKs; BEFORE-triggers
  enforcing `(scopeNodeId, scopeType) → scope_nodes.nodeType` with stable
  messages (`stock_documents_origin_scope_type_mismatch`, `stock_quants_scope_node_missing`, …)
  and ERRCODEs 23503/23514; `NULLS NOT DISTINCT` unique
  `stock_quants_company_item_scope_lot_uk`.
- Drizzle schema mirrors the migration: `stockLotsTable` (schema.ts:1067),
  `stockDocumentsTable` (:1103), `stockDocumentLinesTable` (:1211),
  `stockQuantsTable`, enums at :840/:847.
- Migration test `apps/api/src/db/migrations/__tests__/migration-0027-inventory-foundation.test.ts`
  (real PG): DDL/index/trigger assertions, invalid shapes + tenant leaks,
  happy path, transfer/adjustment/loss writes, reversal-confirmed-only.
- Permission seeds live but **unconsumed**: `inventoryStockPermissionKeys`
  (`inventory.stock.read|write|adjust`) and `inventoryDocumentsPermissionKeys`
  (`inventory.documents.read|write|confirm|cancel`) in
  `features/roles-management/domain/permissions.ts:30-41`, registered under
  `modulePermissionRegistry.inventory` and `permissionCatalogSeeds` — no route
  or use case references them.
- Canonical spec: `openspec/specs/inventory-stock/spec.md`.
- **No backend feature exists**: no `features/inventory*` slice, no domain,
  no use cases, no gateway, no router, no error-middleware mappings, no
  wiring in `create-app.ts`.
- `backend-timesheets-foundation` is implemented and verified (464 API tests,
  ~89% coverage) but un-archived only due to the unrelated org-hierarchy
  typecheck/build baseline (see Risks). Its slice is now the freshest and
  closest structural analog for this change.

### Backend patterns to reuse (verified in code)

| Concern | Pattern | Reference |
|---|---|---|
| Domain | Types + Gateway port + typed Error classes with `readonly code` | `features/hr-timesheets/domain/timesheets.ts` |
| Application | Use-case factories `({ gateway }) => async (input)`, domain errors, no Express objects | `features/hr-timesheets/application/*.ts` |
| Infrastructure | `createDrizzleXGateway(db, { createId, now })`, row mappers, `and(eq(companyId), eq(id))` tenancy, `unwrapCause` + PG-code/constraint translation (23P01, 23505) | `features/hr-timesheets/infrastructure/drizzle-timesheets.gateway.ts` |
| Transactional state change | `db.transaction` + `SELECT … FOR UPDATE` on the row, re-check state machine inside tx, 0-rows → null → 404/conflict | same file, `submitPeriod` |
| Cross-feature reads | Gateway-owned join/lookup (e.g. `findActiveAssignment`) instead of app-layer coupling to another feature's gateway | same file |
| Presentation | Router factory receiving `requireAuth`, capability wrapper, Zod params/query/body, `ensureCompanyAccess(getAuth(response), companyId)`, try/catch → `next(error)` | `features/hr-timesheets/presentation/timesheets.router.ts` |
| Permissions | `createRequireHrCapability` is permission-key-agnostic (takes any key string; name is historical) — reusable as-is for `inventory.*` keys | `features/roles-management/presentation/require-hr-capability.ts` |
| Errors | Centralized `instanceof` chains mapping domain errors → 400/404/409 | `shared/presentation/error.middleware.ts` |
| Composition | `create-app.ts` wires gateway/use cases/router; `CreateAppInput` accepts gateway override for tests (`timesheetGateway?` at :215) | `app/create-app.ts` |
| Tests | Supertest + in-memory gateways + stubbed `computeEffectivePermissions`; real-PG gateway tests via `createMigrationTestDatabase` + `applyMigrationsThrough('0027_inventory_foundation.sql')` | hr-timesheets `*.test.ts` |

## Inventory DB contract and deferred app-layer duties

Tables: `stock_lots` (unique `(companyId, itemId, lotNumber)`, nullable
`expiresAt`); `stock_documents` (unique `(companyId, documentNo)`, origin/dest
scope pairs, `occurredAt`, `createdByUserId`, `reversalOfId` self-FK, note);
`stock_document_lines` (`quantity numeric(14,3) > 0`, `unitCost numeric(14,4)`
nullable, `lotId` nullable); `stock_quants` (non-negative
quantity/reserved/quarantine, `reserved+quarantine ≤ quantity`,
`avgUnitCost numeric(14,4)` nullable, unique `(companyId, itemId, scopeNodeId,
lotId)` NULLS NOT DISTINCT). Scope types restricted to `warehouse|point-of-sale`
on documents and quants.

Duties the archived DB design explicitly deferred to this app phase:

1. **Confirm-time quant maintenance** — transaction contract (from design.md):
   promote `draft→confirmed` with 0-rows-abort; for each line UPSERT quants and
   recompute moving weighted average `new_avg = (old_qty·old_avg + delta·unit_cost)/new_qty`,
   `NULL` when quantity hits 0; DB `CHECK ≥ 0` is the insufficient-stock safety
   net. Transfer = two movements (origin out, destination in).
2. **Reversal semantics** — reversal creates a NEW `confirmed` document with
   `reversalOfId` set and the original line set negated (× −1). Copying/negating
   lines is app discipline; originals are never UPDATEd/DELETEd.
3. **Lot gating** — `items.trackBatchMode` (none|batch|serial) gates lot usage;
   not DB-expressible, app-enforced.
4. **Document numbering** — DB only guarantees uniqueness of `documentNo` per
   company; generation policy is unspecified (open question).

## Affected Areas

- `apps/api/src/features/inventory/` — NEW feature slice (domain/application/infrastructure/presentation). Folder name (`inventory` vs `inventory-stock`) is a small proposal decision; `inventory` matches the module-registry key.
- `apps/api/src/shared/presentation/error.middleware.ts` — register inventory domain errors (400/404/409).
- `apps/api/src/app/create-app.ts` — wire gateway, use cases, router (`stockGateway` override in `CreateAppInput`).
- Read-only references, no edits: `schema.ts` stock tables, `permissions.ts` seeds (already complete), `features/items/domain/item.ts` (`tracksStock`, `trackBatchMode`), `scope-hierarchy.port.ts` (`warehouse`, `point-of-sale` in `scopeTypeValues`).
- `apps/api/vitest.config.ts` — optional coverage-include addition (same cheap proposal decision as timesheets).

## Approaches

1. **Single monolithic backend change** — all use cases + gateway + router in one apply.
   - Pros: complete module in one change.
   - Cons: far exceeds the 800-line review budget (timesheets needed 3 slices and
     inventory adds transactional quant math, reversal, and two query families);
     heavy reviewer load.
   - Effort: High.
2. **One change, chained slices (RECOMMENDED)** — `backend-inventory-foundation`
   with strict-TDD slices: (S1) domain + application use cases with in-memory
   gateway (state machine, per-type shape validation, MWA as a pure function,
   reversal line negation); (S2) Drizzle gateway + real-PG tests (tenancy,
   transactional confirm/quant upsert, trigger + constraint error translation);
   (S3) router + error middleware + `create-app` wiring + supertest; optional
   (S4) split reversal and stock/lot query endpoints out if S3 forecasts over
   budget.
   - Pros: each slice fits the review budget; natural RED-GREEN-REFACTOR order;
     matches the cached `auto-chain` strategy; quant math lands with dedicated
     real-PG proof before HTTP concerns.
   - Cons: 3-4 PRs.
   - Effort: Medium.
3. **Read-only API first** — quants/lots/documents GET endpoints only.
   - Pros: smallest first PR.
   - Cons: defers the actual value (confirm, quant maintenance, reversal) and
     leaves the module non-functional.
   - Effort: Low first slice, more total changes.

## Recommendation

Approach 2. Mirror the hr-timesheets slice shape exactly; it already solved the
same class of problems (state machine, transactional transition with row lock,
PG error translation, permission-scoped routes). The genuinely new territory is
listed under Risks and must get dedicated design + tests.

## API / use-case boundaries and permission model (proposed, confirm at proposal)

Routes (all: `requireAuth` + `requireHrCapability(key)` + `ensureCompanyAccess`):

| Route | Permission | Use case |
|---|---|---|
| `POST /companies/:companyId/stock-documents` | `inventory.documents.write` | create draft document + lines (shape validated per type; documentNo policy TBD) |
| `GET /companies/:companyId/stock-documents` | `inventory.documents.read` | list (filters: type, status, origin/destination scope, item, date range; paginated) |
| `GET /companies/:companyId/stock-documents/:documentId` | `inventory.documents.read` | get document + lines |
| `PATCH /companies/:companyId/stock-documents/:documentId` | `inventory.documents.write` | update draft (header + lines; draft-only) |
| `POST …/stock-documents/:documentId/confirm` | `inventory.documents.confirm` | transactional confirm + quant maintenance (MWA); 0-rows/conflict → 409 |
| `POST …/stock-documents/:documentId/cancel` | `inventory.documents.cancel` | cancel draft (confirmed docs must be reversed, not cancelled) |
| `POST …/stock-documents/:documentId/reversal` | `inventory.documents.confirm` | create + confirm reversal doc with negated lines |
| `POST /companies/:companyId/stock-lots` | `inventory.stock.write` | create lot (gated by item `trackBatchMode`) |
| `GET /companies/:companyId/stock-lots` | `inventory.stock.read` | list lots (filters: item, expiry) |
| `GET /companies/:companyId/stock` | `inventory.stock.read` | list quants (filters: item, scope, lot) |

- `createdByUserId` = `auth.user.id`; `occurredAt` client-supplied (default now).
- State machine in application layer; DB CHECKs/triggers are the safety net.
- `inventory.stock.adjust` mapping is an open question (see below).

## Strict TDD test strategy

Strict TDD is active (`openspec/config.yaml`: `apply.tdd: true`,
`testing.strict_tdd: true`; runner `pnpm --filter api test`, Vitest). Order per slice:

1. **Domain/application (S1)**: in-memory gateway fakes; table-driven tests for
   state transitions, per-type origin/destination shapes, lot gating, reversal
   line negation, and the MWA function as a pure unit (including quantity→0
   ⇒ `avgUnitCost = NULL`, rounding to numeric(14,4)).
2. **Gateway (S2)**: real PostgreSQL via `createMigrationTestDatabase` +
   `applyMigrationsThrough('0027_inventory_foundation.sql')`; fixtures (company,
   user, item(s) with each `trackBatchMode`, warehouse + POS scope nodes);
   assert tenant scoping, quant maintenance for all four document types,
   insufficient stock mapping, trigger-message translation, duplicate
   documentNo/lot translation. Drizzle `numeric` returns strings — numeric
   mapping (string vs number in domain) must be an explicit, tested decision.
3. **Router (S3)**: supertest + `createApp` with in-memory gateways and stubbed
   `computeEffectivePermissions`; happy paths per endpoint, 403 without
   permission, 403 cross-company, 404 unknown document/lot, 409 conflicts and
   state-machine rejections, 400 Zod validation.
4. Commands: `pnpm --filter api test`, `pnpm --filter api test:coverage`,
   scoped typecheck.

## Open questions (must resolve before/at proposal)

**Blocking (product semantics):**

1. **Document numbering**: auto-generated per company+type (app-side sequence)
   vs client-supplied `documentNo` (DB enforces uniqueness)? DB design is silent.
2. **`inventory.stock.adjust` semantics**: gates confirming `adjustment`-type
   documents (in addition to `documents.confirm`)? A direct quant-adjust flow?
   Or unused in v1? The DB models adjustments as documents, so option 1 fits
   the existing schema best.
3. **Lot gating rules**: for `batch` items — lot required on receipt lines,
   optional or required on transfer/loss/adjustment? For `serial` — one unit
   per lot and quantity 1 per line? Auto-create lots on receipt vs
   reference-existing-only?
4. **Reversal policy**: may a reversal itself be reversed (chained)? Any
   time-window or note requirement? Confirm `documents.confirm` is the right key.
5. **Draft line editing model**: PATCH replaces the full line set (simplest,
   draft-only) vs per-line add/update/delete endpoints (timesheets-style
   nested resources)?
6. **Cancel semantics**: confirm cancel is draft-only (confirmed ⇒ reversal;
   cancelled is terminal).

**Defaults (non-blocking, confirm at proposal):** company-wide visibility gated
by permission key only (no per-node scoping in v1); lines immutable after
confirm; quants expose `reserved`/`quarantine` read-only with no workflows;
dedicated stock-movements endpoint deferred (document list + lines suffice);
pagination like approval-policy (page/pageSize ≤ 100).

## Non-goals

- No frontend (`apps/web` untouched).
- No DB schema/migration changes — `0027` is complete; every gap found
  (numbering, lot gating, line mirroring on reversal) was consciously deferred
  to the app layer by the archived DB design.
- No reservation/quarantine workflows (columns exist; no permission keys or
  product definition yet — documented debt).
- No FIFO/cost layers beyond MWA, no valuation reports, no reconciliation jobs,
  no RLS, no POS-sales-driven automatic movements.

## Risks

- **Review budget**: the largest backend slice to date; mitigated by 3-4 chained
  slices under the cached `auto-chain` strategy — `sdd-tasks` must forecast and
  split.
- **Trigger error translation is new territory**: timesheets translates PG
  errors by `code` + `constraint` name, but `RAISE EXCEPTION` triggers carry
  only MESSAGE + ERRCODE (no `constraint` field) — the gateway must match on
  the stable message strings (e.g. `stock_documents_origin_scope_type_mismatch`).
  New pattern; needs a designed, tested helper.
- **MWA math in TypeScript**: Drizzle `numeric` returns strings; MWA needs a
  rounding policy for `numeric(14,4)` and the quantity→0 ⇒ NULL rule; pure
  domain function with exhaustive unit tests before the gateway touches it.
- **Concurrency**: `SELECT … FOR UPDATE` on the document prevents double
  confirm; concurrent confirms of different documents hitting the same quant key
  rely on `ON CONFLICT DO UPDATE` against the NULLS NOT DISTINCT unique index —
  must be exercised in real-PG tests (including the null-lot case).
- **Baseline debt**: org-hierarchy typecheck/build fails repo-wide (pre-existing,
  tracked by stuck `fix-api-typecheck-baseline`); verification must scope to the
  api package and not mix in unrelated fixes. Working tree currently dirty with
  unrelated HR work.
- **`requireHrCapability` naming**: middleware is generic but HR-named; reuse
  as-is (least change) and note the naming wart, or add a thin alias — proposal
  decision, low stakes.

## Ready for Proposal

Yes — after answering blocking questions 1-6 above. The orchestrator should ask
the user those six product questions (or propose the defaults flagged in each)
before `sdd-propose`.
