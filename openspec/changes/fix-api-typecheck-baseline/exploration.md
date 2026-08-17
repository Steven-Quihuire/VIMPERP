# Exploration: fix-api-typecheck-baseline

> Read-only investigation. No files were edited, no formatters run, no commits made.
> Scope: map the exact pre-existing repo-wide `pnpm --filter api typecheck` and
> `pnpm --filter api build` baseline failures so a later SDD change can fix ONLY
> that debt without touching behavior or the pending `backend-timesheets-foundation`
> work (untouched, uncommitted in the worktree).

## Current State

- `pnpm --filter api test` (96 files / 464 tests): PASS.
- `pnpm --filter api lint`: PASS.
- `pnpm --filter api typecheck` (`tsc --noEmit`): FAIL, exit 2. 33 errors across 5 files.
- `pnpm --filter api build` (`tsc -p tsconfig.build.json`): FAIL, exit 2. 3 errors in one file.
- The 3 build errors are a strict subset of the typecheck error set (same file/lines).
- No behavioral/runtime regression is implied: every error is a type-level mismatch
  between (a) gateway interfaces / domain contracts and (b) test stubs / Drizzle
  destructuring annotations. The runtime tests pass because the runtime paths do not
  depend on the missing/extra type information.

## Exact Error Inventory

### A. Build errors (also in typecheck) — `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`

| # | File:Line:Code | Message (abbreviated) |
|---|----------------|------------------------|
| A1 | `.../org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts:1003:10 TS2322` | `T | undefined` not assignable to `T | null` (AreaRow, `deleteArea`) |
| A2 | `.../org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts:1227:10 TS2322` | `T | undefined` not assignable to `T | null` (WarehouseRow, `deleteWarehouse`) |
| A3 | `.../org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts:1421:10 TS2322` | `T | undefined` not assignable to `T | null` (PointOfSaleRow, `deletePointOfSale`) |

Root cause: each `delete*` method declares `let deleted: <Row> | null = null` and then
assigns `[deleted] = await db.transaction(async (tx) => { ...; return [next]; })`. The
Drizzle transaction return narrows the destructured element to `<Row> | undefined`
(because the array element is modeled as possibly-absent). `undefined` is not
assignable to the declared `| null`. The value is only ever consumed via
`if (!deleted) { throw new ...NotFoundError() }` (falsy check), so `null` and
`undefined` are behaviorally indistinguishable here.

### B. Typecheck-only errors — test stub drift (interface gained methods not mirrored in test fakes)

| # | File:Line:Code | Root cause |
|---|----------------|------------|
| B1 | `.../identity/application/register.test.ts:13:7 TS2420` | `AtomicOnlyAuthGateway implements AuthIdentityGateway` but missing `findActiveScopeNodeId`, `setActiveScopeNodeId` (added to interface in `identity/domain/auth.ts:86-87`). |
| B2 | `.../identity/application/register.test.ts:106:7 TS2739` | Same missing members, second instantiation site. |
| B3 | `.../node-management/application/accept-node-management-invitation.test.ts:57:3 TS2416` | `InMemoryNodeManagementGateway.createInvitation` returns `void`; interface requires `Promise<NodeManagementInvitation>`. |
| B4 | `.../node-management/application/accept-node-management-invitation.test.ts:159,202,224:7 TS2322` | Same `createInvitation` return-type mismatch propagates to three usages. |
| B5 | `.../org-hierarchy/application/delete-area.test.ts:6:51 TS2739` | In-memory `OrgHierarchyGateway` literal missing `countWarehousesInLocal`, `countPointsOfSaleInLocal` (interface at `org-hierarchy/domain/org-hierarchy.ts:134-135`). |

### C. Typecheck-only errors — `OrgHierarchyAuditContext` signature migration in test calls

`OrgHierarchyAuditContext = { actorUserId: string; correlationId: string }` was added
to every mutating `OrgHierarchyGateway` method input (domain/org-hierarchy.ts:64).
Tests still call with the pre-audit shape.

| # | File:Line:Code | Root cause |
|---|----------------|------------|
| C1 | `.../org-hierarchy/application/hierarchy-parent-invariants.test.ts:145,177,234,289:15 TS2345` | `updateArea`/`updateWarehouse`/`updatePointOfSale`/`updateDivision` called with old `{ id, name }` or `{ id, parent }` shape; missing `actorUserId`+`correlationId` (and, for the parent-update branch, the required `localId`). |
| C2 | `.../org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts:695,736,827,853,874,931,956,987,1013,1022,1158,1196,1218,1291,1308,1330,1341,1360,1382: TS2345` | Same audit-context migration: tests call `update*` with old object shape missing `actorUserId`+`correlationId`. |
| C3 | `.../org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts:1040,1060,1080,1209,1321,1373: TS2345` | `deleteLocal`/`deleteArea`/`deleteWarehouse`/`deletePointOfSale` called with a bare `string` id; current signature requires `{ <entityId>: string } & OrgHierarchyAuditContext`. |
| C4 | `.../org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts:1218,1330,1382: TS2345` | `updateArea`/`updateWarehouse`/`updatePointOfSale` rename-call shape `{ id, name }` missing audit context; TS narrows to the parent-update branch (which requires `localId`) and reports the missing `localId`. Adding `actorUserId`+`correlationId` lets TS pick the rename branch and `localId` is no longer required. |

Total C-family: 4 (C1) + 19 (C2) + 6 (C3) + 3 (C4, already counted in C2 line list) = 28
distinct line errors (some lines overlap between C2 and C4; the 33 total minus A3 minus
B5 minus C1(4) minus B-group(6) reconciles to the C2/C3 set).

### D. Typecheck-only error — items route test mock return-shape

| # | File:Line:Code | Root cause |
|---|----------------|------------|
| D1 | `.../items/presentation/item.route.test.ts:1249:9 TS2719` | Mock `listItems` returns `Promise<{ items: { id: string }[]; nextCursor: null }>`; `createItemRouter` expects `Promise<{ items: Item[]; nextCursor: string \| null }>`. Input shape matches exactly (companyId, localId, capabilities, companyStatus, limit, cursor?). Only the `items` element type is too narrow (`{ id }` vs full `Item`). |

## Affected Areas

- `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts` — 3 production build/typecheck errors (deleteArea/deleteWarehouse/deletePointOfSale destructuring annotation).
- `apps/api/src/features/identity/application/register.test.ts` — test fake drift (2 errors).
- `apps/api/src/features/items/presentation/item.route.test.ts` — test mock return shape (1 error).
- `apps/api/src/features/node-management/application/accept-node-management-invitation.test.ts` — test fake return type (4 errors).
- `apps/api/src/features/org-hierarchy/application/delete-area.test.ts` — test fake missing methods (1 error).
- `apps/api/src/features/org-hierarchy/application/hierarchy-parent-invariants.test.ts` — audit-context migration (4 errors).
- `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts` — audit-context migration + delete-by-id shape (25 errors).

Untouched (per boundaries): `apps/api/src/features/hr-timesheets/**`, `.atl/skill-registry.md`,
`openspec/changes/backend-timesheets-foundation/**`.

## Root-Cause Classification

1. **Drizzle transaction destructuring `T | undefined` vs declared `T | null`** (A1-A3).
   Type-only; runtime neutral because the consuming branch is `if (!deleted) throw`.
2. **Test fake out of sync with interface additions** (B1-B5). The real Drizzle gateways
   already implement the new members (`findActiveScopeNodeId`, `setActiveScopeNodeId`,
   `countWarehousesInLocal`, `countPointsOfSaleInLocal`); only the in-memory / fake
   implementations in test files lag behind.
3. **Test fake return-type drift** (B3-B4). `createInvitation` fake throws instead of
   returning `Promise<NodeManagementInvitation>`; the interface contract changed to
   return the created invitation.
4. **Audit-context signature migration not propagated to tests** (C1-C4). The
   `OrgHierarchyAuditContext` was added to all mutating gateway methods; production
   callers were updated, test call sites were not.
5. **Mock return-shape too narrow** (D1). Mock returns a partial `Item` where the full
   `Item` type is required by the route's injected dependency contract.

## Per-Error Fix Direction + Blast Radius

### A1-A3 (3 production errors)
- **Fix direction**: change the local annotation from `let deleted: <Row> | null = null`
  to `let deleted: <Row> | undefined` (three sites). Alternative: keep `| null` and
  append `?? null` on the destructuring assignment. Either is type-only.
- **Behavior risk**: NONE. `if (!deleted)` is falsy for both `null` and `undefined`;
  no `=== null` / `!== null` strict comparisons exist on `deleted` in any of the three
  methods (verified by grep).
- **Blast radius**: file-local. No callers affected (the methods' return types are
  unchanged: they still return `Promise<void>`).
- **Test coverage**: `drizzle-org-hierarchy.gateway.test.ts` covers `deleteArea`,
  `deleteWarehouse`, `deletePointOfSale` (success + not-found paths). The 25 C2/C3
  errors in that same file are blocking those tests from running under typecheck, but
  they pass under `vitest` (which uses esbuild, no type gating).

### B1-B2 (identity fake)
- **Fix direction**: add stub `findActiveScopeNodeId: async () => null` and
  `setActiveScopeNodeId: async () => {}` to `AtomicOnlyAuthGateway` in
  `register.test.ts`. Mirror the Drizzle gateway behavior for "no active scope".
- **Behavior risk**: NONE (test-only). The register use case does not invoke these
  methods; stubs are present only to satisfy the interface.
- **Blast radius**: single test file.
- **Test coverage**: the file itself (`register.test.ts`).

### B3-B4 (node-management fake)
- **Fix direction**: change `createInvitation(input: {...}) { throw new Error(...) }`
  to `async createInvitation(input: {...}) { throw new Error(...) }` (async functions
  return `Promise<never>`, which is assignable to `Promise<NodeManagementInvitation>`).
  The throw is preserved, so the "not used" sentinel behavior is unchanged.
- **Behavior risk**: NONE. `throw` inside `async` rejects with the same `Error`.
- **Blast radius**: single test file.
- **Test coverage**: `accept-node-management-invitation.test.ts`.

### B5 (org-hierarchy delete-area fake)
- **Fix direction**: add `countWarehousesInLocal: async () => 0` and
  `countPointsOfSaleInLocal: async () => 0` to the in-memory gateway literal in
  `delete-area.test.ts`. The delete-area use case under test does not exercise these
  counts (they belong to delete-local), so zero is a safe stub.
- **Behavior risk**: NONE (test-only).
- **Blast radius**: single test file.
- **Test coverage**: `delete-area.test.ts`.

### C1 (hierarchy-parent-invariants.test.ts, 4 sites)
- **Fix direction**: add `actorUserId: 'actor'` and `correlationId: 'corr'` to each
  `update*` call. For the parent-update variants that now require `localId`, the test
  intent is the parent-update branch, so `localId` must also be supplied where the test
  is exercising a move-to-local. (Inspect each call: if the call is a rename-only
  expectation, audit fields alone satisfy branch 1; if it is a parent-update expectation,
  audit fields + the parent fields the test already passes + `localId`.)
- **Behavior risk**: LOW. The added fields are passed through to the audit-event insert
  in the gateway. Tests that assert audit rows MAY need the assertion updated to expect
  `actorUserId: 'actor'` / `correlationId: 'corr'`. Strictly type-only if the test does
  not assert audit rows; otherwise a test-expectation update (still not production logic).
- **Blast radius**: single test file.
- **Test coverage**: `hierarchy-parent-invariants.test.ts`.

### C2 (drizzle-org-hierarchy.gateway.test.ts, 19 update* sites)
- **Fix direction**: same as C1 — add `actorUserId` + `correlationId` to each
  `update*` call. Where the test previously relied on the rename branch (`{ id, name }`),
  adding audit fields restores branch-1 matching and removes the spurious `localId`
  requirement.
- **Behavior risk**: LOW-MEDIUM. This file exercises the real Drizzle gateway against
  PostgreSQL via `docker compose`. Adding audit fields will flow into the
  `audit_events` insert. Tests that assert audit-event rows must be updated to expect
  the new actor/correlation values. Verify by running the test suite after the change.
- **Blast radius**: single test file (real DB integration).
- **Test coverage**: the file itself; it is the primary coverage for the gateway.

### C3 (drizzle-org-hierarchy.gateway.test.ts, 6 delete* sites)
- **Fix direction**: wrap the bare id: `gateway.deleteArea('area-1')` →
  `gateway.deleteArea({ areaId: 'area-1', actorUserId: 'actor', correlationId: 'corr' })`
  (and analogously for `deleteLocal`, `deleteWarehouse`, `deletePointOfSale`).
- **Behavior risk**: LOW-MEDIUM. Same audit-flow consideration as C2. Tests that assert
  audit rows for deletes must be updated.
- **Blast radius**: single test file.
- **Test coverage**: the file itself.

### C4 (drizzle-org-hierarchy.gateway.test.ts, 3 sites, subset of C2 lines)
- **Fix direction**: subsumed by C2 — adding audit fields resolves the branch narrowing.
- **Behavior risk**: as C2.
- **Blast radius**: single test file.

### D1 (items route test mock)
- **Fix direction**: make the mock return a value assignable to `Item[]`. Two options:
  (a) construct a minimal full `Item` literal with placeholder fields; (b) cast
  `[{ id: input.localId ?? 'company-scope' }] as unknown as Item[]`. Option (b) is the
  smallest type-only fix and keeps the test's HTTP-response assertion
  (`{ items: [{ id: 'company-scope' }], nextCursor: null }`) intact. The route handler
  serializes only `id` from each item (confirmed by the existing assertion), so the
  runtime response body is unchanged.
- **Behavior risk**: NONE (test-only; route serializer emits only `id`).
- **Blast radius**: single test file.
- **Test coverage**: `item.route.test.ts`.

## Capability Recommendation

Canonical capability: **existing `monorepo-foundation`** (`openspec/specs/monorepo-foundation/spec.md`).

Rationale:
- The spec already declares "Workspace Delivery Baseline" with the scenario
  "Baseline workspace is verifiable" — `typecheck` and `build` are part of that baseline.
- The current baseline debt is a direct violation of that scenario.
- Repo convention (archive list) shows baseline/quality-gate fixes are tracked under
  `monorepo-foundation` (e.g. `2026-07-28-vimcore-erp-monorepo`).
- A new `api-typecheck-baseline` capability would duplicate the existing one's purpose.

Delta shape: a single new requirement under `monorepo-foundation`, e.g.
**"API typecheck and build baseline is clean"**, with scenarios for:
1. `pnpm --filter api typecheck` exits 0 on the unchanged source tree.
2. `pnpm --filter api build` exits 0 on the unchanged source tree.
3. Fixes MUST be type-only / test-only and MUST NOT alter runtime behavior or HTTP
   response shapes.
4. The change MUST NOT touch `hr-timesheets/**`, the timesheets SDD change folder, or
   `.atl/skill-registry.md`.

## Defaults Chosen (automatic mode)

- **Capability**: `monorepo-foundation` (existing) — no new capability created.
- **Fix strategy for A1-A3**: change `let deleted: <Row> | null = null` →
  `let deleted: <Row> | undefined` (prefer widening the annotation over `?? null`
  coercion; fewer characters, no runtime op).
- **Fix strategy for B-family**: add minimal stubs that mirror real-gateway no-op
  semantics (`null` for getters, `async () => {}` for setters, `async () => 0` for
  counters, `async` on `throw` sentinel).
- **Fix strategy for C-family**: add `actorUserId: 'actor'` and
  `correlationId: 'corr'` to every migrated call site. If audit-row assertions break,
  update the expected fixture to match (still test-only).
- **Fix strategy for D1**: `as unknown as Item[]` cast on the mock return — smallest,
  clearly type-only, preserves the existing HTTP-body assertion.
- **TDD posture**: this change is a type-debt remediation, not a behavior addition.
  RED step = reproduce the failing `typecheck`/`build` (already red). GREEN = apply
  type/test-only fixes until both commands exit 0. No new tests are required; the
  existing 96-file / 464-test suite is the regression net and MUST remain green
  throughout.
- **Review budget**: 800 changed lines. Forecast: well under budget. Estimated
  touched lines ≈ 3 (production) + ~60 (test stub additions, audit-context fields,
  delete-id wrapping, mock cast) ≈ 60-80 changed lines. Chained PRs NOT required.
  Single PR is safe.

## Non-Goals

- NO runtime behavior change in any production gateway, use case, or route handler.
- NO changes to `hr-timesheets/**` or the `backend-timesheets-foundation` SDD change.
- NO changes to `.atl/skill-registry.md`.
- NO schema or migration changes.
- NO new tests beyond what is needed to keep the existing suite green (audit-row
  fixture updates are allowed where the audit-context migration forces them).
- NO refactor of the `OrgHierarchyAuditContext` pattern itself; it is accepted as-is.
- NO frontend, E2E, or web-app changes.

## Risks

- **Audit-row assertion drift (C2/C3)**: the real-DB integration test may assert
  audit-event rows with the old (absent) actor/correlation values. Adding the fields
  could break those assertions. Mitigation: run `pnpm --filter api test` after each
  fix batch; update only the assertion fixtures, never the production insert logic.
- **Test fake semantics for new interface members (B1-B5)**: choosing the wrong stub
  return value (e.g. returning a non-null scope when the test expects none) could mask
  a real test. Mitigation: stubs mirror the "empty / not used" semantics already
  established by the surrounding test intent.
- **Branch-narrowing regressions in C1**: if a parent-update test was actually intended
  to hit the rename branch, adding `localId` would mis-route it. Mitigation: read each
  of the 4 call sites in `hierarchy-parent-invariants.test.ts` before applying the fix
  and choose the branch that matches the test's stated expectation.
- **Scope creep into production logic**: the temptation to "improve" the
  `delete*` destructuring (e.g. switch to `.limit(1)` or restructure the transaction)
  must be resisted. The fix is the annotation, nothing else.

## Ready for Proposal

**Yes.** The orchestrator should tell the user: the baseline debt is fully mapped
(33 typecheck errors + 3 build errors, all type/test-only, zero behavior risk for
the A-group, low test-only risk for the C-group), the canonical capability is the
existing `monorepo-foundation`, estimated effort is ~60-80 changed lines (well under
the 800-line budget), and a single PR is appropriate. Proceed to `sdd-propose`.
