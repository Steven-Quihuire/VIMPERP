# Apply Progress: org-tree-canonical-model

## Change
- `org-tree-canonical-model`

## Mode
- Strict TDD

## Delivery
- Strategy: `auto-chain`
- Chain strategy: `stacked-to-main`
- Previous completed slices: `slice0-migration-metadata-repair`, `pr1a-backend-org-tree`, `pr1b-org-tree-web-switcher`
- Current slice: `final-scope-authority-remediation`
- Boundary: completed tasks `0.1` through `5.1`; final remediation limited to the remaining verify blockers on sibling visibility and scope-bound authority enforcement
- Review budget: target `400` changed lines; remediation stayed within the bounded fix scope

## Status
- Preserved all previously completed Phase `0`–`2` work.
- Completed the PR-2 runtime scope widening, the `/auth/me/active-scope` endpoint, the items scoping update, the web active-scope mutation path, and the Playwright runtime scenario.
- Cleared the earlier verify blockers by restoring `activeScope` lockstep in login/register flows, aligning legacy in-memory gateways and web fixtures with the widened auth contract, and fixing the migration tests needed by the required verify commands.
- Final remediation added same-company sibling visibility coverage in the in-memory and Drizzle scope resolvers.
- Final remediation now blocks scope-bound item access when `activeScope` is missing, which enforces explicit scope selection for multi-scope users before protected scope-bound access.
- Re-verified `pnpm --filter api test:coverage`, `pnpm test`, and `pnpm build` successfully with Docker PostgreSQL running after the final remediation.

## Completed Tasks
- [x] 0.1 Restore missing journal entries (0013/0014/0016/0017) + matching `_snapshot.json` in `apps/api/src/db/migrations/meta/`.
- [x] 0.2 RED+GREEN `migrations/__tests__/migration-journal.test.ts` asserts clean migrate on local PG.
- [x] 1.1 RED `migrations/__tests__/migration-0018-role-assignment-mode.test.ts` asserts enum + default column + nullable `user_preferences.active_scope_node_id`.
- [x] 1.2 GREEN create `apps/api/src/db/migrations/0018_role_assignment_mode.sql`; journal entry added.
- [x] 1.3 RED+GREEN create `shared/infrastructure/scope-hierarchy/scope-hierarchy.port.ts` + `port.test.ts`.
- [x] 1.4 GREEN create `shared/infrastructure/scope-hierarchy/drizzle-scope-resolver.ts`.
- [x] 1.5 GREEN `features/roles-management/infrastructure/drizzle-scope-resolver.ts` delegates to shared port.
- [x] 2.1 RED+GREEN `features/roles-management/application/compute-effective-permissions.test.ts`.
- [x] 2.2 GREEN extend `compute-effective-permissions.ts` to honor `assignment.mode`.
- [x] 2.3 RED+GREEN create API `org-tree` slice + tests.
- [x] 2.4 RED+GREEN create `web/features/org-tree/{application/org-tree-queries.ts,infrastructure/org-tree-http-gateway.ts,domain}` with tests.
- [x] 2.5 GREEN rename `web/features/org-hierarchy/presentation/active-local-switcher.tsx` → `web/features/org-tree/presentation/active-scope-switcher.tsx`; render 6-type subtree; update sidebar.
- [x] 3.1 RED+GREEN extend `identity/infrastructure/drizzle-auth.gateway.test.ts` for `findActiveScopeNodeId` / `setActiveScopeNodeId`; `setActiveCompanyId` now clears `activeScopeNodeId`.
- [x] 3.2 RED+GREEN extend `identity/application/resolve-auth-session.test.ts` for `activeScope` backfill and out-of-scope clearing.
- [x] 3.3 GREEN extend `identity/domain/auth.ts` with `activeScope`, `SwitchActiveScopeInput`, and widened `AuthIdentityGateway`.
- [x] 3.4 RED+GREEN extend `identity/presentation/auth.route.test.ts`; add `POST /auth/me/active-scope` and lockstep `activeScope` schema coverage.
- [x] 4.1 RED+GREEN `items/presentation/item.route.test.ts` proves `localId` comes from `activeScope` only when `scopeType === 'local'`.
- [x] 4.2 RED+GREEN web `features/auth/{domain/auth.test.ts,infrastructure/auth-client.test.tsx}` for `activeScope` lockstep and `useSwitchActiveScope` invalidation of items/categories/orgTree.
- [x] 4.3 Playwright E2E: sidebar switcher → warehouse; items re-scope; bad switch rejected.
- [x] 5.1 `pnpm --filter api test:coverage` ≥ 80%; `pnpm test` + `pnpm build` green.

## Files Changed
| File | Action | What Was Done |
|---|---|---|
| `apps/api/src/features/identity/domain/auth.ts` | Modified | Added `activeScope`, `SwitchActiveScopeInput`, and the active-scope gateway contract. |
| `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts` | Modified | Added `findActiveScopeNodeId` / `setActiveScopeNodeId`; company switching now clears active scope. |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | Modified | Resolved persisted `activeScope`, backfilled from legacy `activeLocalId`, and derived legacy local output from scope type. |
| `apps/api/src/features/identity/presentation/auth.router.ts` | Modified | Added `activeScope` to the auth payload and introduced `POST /auth/me/active-scope` guarded by `ScopeResolver.isAuthorized`. |
| `apps/api/src/app/create-app.ts` | Modified | Wired `scopeResolver` into auth-session resolution and the new active-scope switching path. |
| `apps/api/src/features/items/presentation/item.router.ts` | Modified | Scoped item/category routes from `auth.activeScope` instead of trusting legacy `activeLocalId`. |
| `apps/api/src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts` | Modified | Added same-company sibling visibility coverage proving out-of-branch nodes stay hidden from the authorized subtree. |
| `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts` | Modified | Added PostgreSQL-backed sibling-visibility coverage so the shared resolver proves hidden same-company branches at integration level. |
| `apps/web/src/features/auth/domain/auth.ts` | Modified | Mirrored API `activeScope` and added the web switch-active-scope input contract. |
| `apps/web/src/features/auth/infrastructure/auth-client.ts` | Modified | Added `switchActiveScope()` calling `POST /auth/me/active-scope`. |
| `apps/web/src/features/auth/presentation/use-auth.ts` | Modified | Added `useSwitchActiveScope()` and invalidated `items`, `categories`, and `org-tree`. |
| `apps/web/src/features/org-tree/presentation/active-scope-switcher.tsx` | Modified | Switched the sidebar control from legacy local-only mutation to full-scope switching. |
| `apps/web/src/features/auth/domain/auth.test.ts` | Created | Added web auth helper coverage around `activeScope` sessions. |
| `apps/web/src/features/auth/infrastructure/auth-client.test.tsx` | Created | Added repository + mutation invalidation coverage for active-scope switching. |
| `e2e/active-scope.e2e.spec.ts` | Created | Seeded a runtime org tree and proved local→warehouse switching, items re-scoping, and unauthorized rejection. |
| `apps/api/src/features/identity/application/login.ts` | Modified | Added `activeScope: null` to both login session constructors. |
| `apps/api/src/features/identity/application/register.ts` | Modified | Added `activeScope: null` to the register session constructor. |
| `apps/api/src/features/identity/application/login.test.ts` | Created | Added RED→GREEN coverage for seeded and persisted login sessions exposing `activeScope`. |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | Modified | Auto-selects the only authorized scope and keeps multi-scope sessions selection-blocked. |
| `apps/api/src/features/identity/application/resolve-auth-session.test.ts` | Modified | Added single-scope auto-selection and multi-scope explicit-selection coverage. |
| `apps/api/src/features/admin/presentation/admin.route.test.ts` | Modified | Restored the widened auth contract and injected an in-memory scope resolver for test-only auth/session resolution. |
| `apps/api/src/features/companies/presentation/company.route.test.ts` | Modified | Restored the widened auth contract and injected an in-memory scope resolver for company route auth/session tests. |
| `apps/api/src/features/org-hierarchy/presentation/org-hierarchy.router.test.ts` | Modified | Restored the widened auth contract and injected an in-memory scope resolver for org-hierarchy route tests. |
| `apps/api/src/db/migrations/__tests__/migration-0012-org-hierarchy.test.ts` | Modified | Updated the canonical-table assertion from `branches` to `locals`. |
| `apps/api/src/db/migrations/__tests__/migration-journal.test.ts` | Modified | Raised the migrate smoke-test timeout so the root runner can complete under coverage and turbo load. |
| `apps/web/src/features/items/presentation/{categories-page.test.tsx,item-catalog-page.test.tsx,item-form-panel.test.tsx}` | Modified | Added `activeScope: null` to AuthSession fixtures so web typecheck/build stays lockstep with the widened auth model. |
| `apps/web/src/features/org-hierarchy/presentation/{divisions-page.test.tsx,locals-page.test.tsx}` | Modified | Added `activeScope: null` to AuthSession fixtures for build-time contract completeness. |

## Work Unit Evidence

### Slice 0 Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-journal.test.ts src/db/migrations/__tests__/migration-0017-role-assignment-scope-fk.test.ts` → exit `0`, `2` files, `4` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm db:up && pnpm --filter api exec drizzle-kit migrate` → exit `0`; Docker PostgreSQL was running and Drizzle reported `migrations applied successfully`. |
| Rollback boundary | Revert `apps/api/src/db/migrations/meta/_journal.json`, delete `0013_snapshot.json` / `0014_snapshot.json` / `0016_snapshot.json`, restore `0017_snapshot.json`, and remove `migration-journal.test.ts`. |

### PR-1A Backend Slice Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0018-role-assignment-mode.test.ts src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts src/features/roles-management/application/compute-effective-permissions.test.ts src/features/org-tree/presentation/org-tree.router.test.ts` → exit `0`, `5` files, `11` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm db:up && pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0018-role-assignment-mode.test.ts src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts` → exit `0`, `2` files, `4` integration tests passed against Docker PostgreSQL. |
| Rollback boundary | Revert `0018_role_assignment_mode.sql`, remove `shared/infrastructure/scope-hierarchy/`, restore the previous feature-local resolver, remove `features/org-tree/`, and undo the schema/assignment-mode wiring. |

### PR-1B Web Slice Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter web exec vitest run src/features/org-tree/application/org-tree-queries.test.tsx src/features/org-tree/presentation/active-scope-switcher.test.tsx` → exit `0`, `2` files, `4` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter web typecheck` → exit `0`; the dashboard sidebar import and the new org-tree feature compiled cleanly. |
| Rollback boundary | Remove `apps/web/src/features/org-tree/`, restore `dashboard-app-sidebar.tsx` to `ActiveLocalSwitcher`, and leave Phase 3+ auth widening untouched. |

### PR-2 Runtime Slice Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/features/identity/infrastructure/drizzle-auth.gateway.test.ts src/features/identity/application/resolve-auth-session.test.ts src/features/identity/presentation/auth.route.test.ts src/features/identity/presentation/auth-session-shape.test.ts src/features/items/presentation/item.route.test.ts && pnpm --filter web exec vitest run src/features/auth/domain/auth.test.ts src/features/auth/infrastructure/auth-client.test.tsx src/features/org-tree/presentation/active-scope-switcher.test.tsx` → exit `0`; API `5` files / `51` tests passed, web `3` files / `6` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm exec playwright test e2e/active-scope.e2e.spec.ts` → exit `0`, `1` spec passed; login starts at local scope, sidebar switches to warehouse, items re-scope, and out-of-scope switch returns `403`. |
| Rollback boundary | Revert the identity active-scope changes in `apps/api/src/features/identity/**`, remove the `/auth/me/active-scope` route wiring from `create-app.ts`, restore item scoping to legacy `activeLocalId`, revert the web active-scope repository/mutation + switcher updates, and delete `e2e/active-scope.e2e.spec.ts`. |

### Verify-Blocker Remediation Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/features/identity/application/login.test.ts src/features/identity/application/register.test.ts src/features/identity/application/resolve-auth-session.test.ts src/features/identity/presentation/auth.route.test.ts src/features/admin/presentation/admin.route.test.ts src/features/companies/presentation/company.route.test.ts src/features/org-hierarchy/presentation/org-hierarchy.router.test.ts src/db/migrations/__tests__/migration-journal.test.ts src/db/migrations/__tests__/migration-0012-org-hierarchy.test.ts` → exit `0`; `9` files / `67` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm db:up && pnpm --filter api test:coverage && pnpm test && pnpm build` → exit `0`; API coverage finished at `88.81%` statements, root `pnpm test` passed (`api 236`, `web 97`, `sum 1`), and turbo build passed for both apps. |
| Rollback boundary | Revert the login/register/resolve-auth-session remediation in `apps/api/src/features/identity/application/**`, drop the legacy test-only scope-resolver injections + added gateway methods in the affected route tests, restore the pre-remediation migration assertions/timeouts, and remove the added `activeScope` web test-fixture fields. |

### Final Scope-Authority Remediation Evidence

| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts src/features/items/presentation/item.route.test.ts` → exit `0`; `3` files / `27` tests passed. |
| Runtime harness command/scenario and exact result | `pnpm --filter api test:coverage && pnpm test && pnpm build` → exit `0`; API coverage passed at `88.81%` statements / `83.65%` branches / `97.29%` functions, root `pnpm test` passed (`api 238`, `web 97`), and turbo build passed for `api` + `web`. |
| Rollback boundary | Revert `apps/api/src/features/items/presentation/item.router.ts`, `apps/api/src/features/items/presentation/item.route.test.ts`, `apps/api/src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts`, and `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts` to remove the final scope-selection enforcement and sibling-visibility coverage without touching earlier active-scope delivery work. |

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 0.1 | `src/db/migrations/__tests__/migration-journal.test.ts` | Integration | ✅ `migration-0017-role-assignment-scope-fk.test.ts` baseline green | ✅ Missing journal assertions written before metadata repair | ✅ Focused migrate/journal run passed (`2` tests) | ✅ Snapshot-chain + migrate scenarios | ➖ None needed |
| 0.2 | `src/db/migrations/__tests__/migration-journal.test.ts` | Integration | ✅ Same baseline as `0.1` | ✅ Fresh-DB migrate assertion written before repair | ✅ Same GREEN run as `0.1` | ✅ Covered continuity + execution | ➖ None needed |
| 1.1 | `src/db/migrations/__tests__/migration-0018-role-assignment-mode.test.ts` | Integration | ➖ N/A (new file) | ✅ Migration assertions written before SQL | ✅ `2` tests passed | ✅ Schema + backfill scenarios | ➖ None needed |
| 1.2 | `src/db/migrations/__tests__/migration-0018-role-assignment-mode.test.ts` | Integration | ➖ N/A (new file) | ✅ Same RED cycle as `1.1` | ✅ Same GREEN run as `1.1` | ✅ Backfill case forced default behavior | ➖ None needed |
| 1.3 | `src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts` | Unit | ➖ N/A (new file) | ✅ Shared-port fake tests first | ✅ `3` tests passed | ✅ Lineage + authorization + descendants | ✅ Extracted shared scope helpers |
| 1.4 | `src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts` | Integration | ✅ Existing resolver baseline green | ✅ Shared authorization expectations added before adapter move | ✅ `2` tests passed | ✅ Covered lineage + authorization + descendants | ✅ Thin wrapper after extraction |
| 1.5 | `src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts` | Integration | ✅ Same baseline as `1.4` | ✅ Wrapper validated through the shared resolver test | ✅ Same GREEN run as `1.4` | ✅ Delegation only | ➖ None needed |
| 2.1 | `src/features/roles-management/application/compute-effective-permissions.test.ts` | Unit | ➖ N/A (new file) | ✅ Exact-node descendant block written first | ✅ `2` tests passed | ✅ Added subtree-inclusive counter-case | ➖ None needed |
| 2.2 | `src/features/roles-management/application/compute-effective-permissions.test.ts` | Unit | ➖ N/A (new file) | ✅ Same RED cycle as `2.1` | ✅ Same GREEN run as `2.1` | ✅ Dual-scenario filter coverage | ➖ None needed |
| 2.3 | `src/features/org-tree/presentation/org-tree.router.test.ts` | Integration | ➖ N/A (new slice) | ✅ Router tests written before slice existed | ✅ `2` tests passed | ✅ Happy-path + forbidden access | ✅ Kept the slice thin |
| 2.4 | `src/features/org-tree/application/org-tree-queries.test.tsx` | Integration | ➖ N/A (new file) | ✅ Query tests written before the web org-tree files existed | ✅ `4` tests passed | ✅ Fetch + idle-without-company scenarios | ✅ Thin gateway/query split |
| 2.5 | `src/features/org-tree/presentation/active-scope-switcher.test.tsx` | Integration | ✅ Existing org-tree query/sidebar safety net green | ✅ Switcher rendering tests written before the component existed | ✅ `4` web tests + typecheck green in PR-1B slice | ✅ Company/local + deeper-node coverage | ✅ Sidebar wiring kept minimal |
| 3.1 | `src/features/identity/infrastructure/drizzle-auth.gateway.test.ts` | Unit | ✅ Pre-existing gateway suite green (`8` tests) | ✅ Added failing active-scope persistence expectations before gateway edits | ✅ Gateway suite passed with `11` tests | ✅ Insert/update/clear scenarios for scope persistence | ➖ None needed |
| 3.2 | `src/features/identity/application/resolve-auth-session.test.ts` | Unit | ✅ Pre-existing resolver suite green (`4` tests) | ✅ Added failing `activeScope` backfill + out-of-scope cases before code changes | ✅ Resolver suite passed with `6` tests | ✅ Covered local backfill, warehouse persistence, and unauthorized clearing | ✅ Extracted `toScopeRef` + `isAuthorizedScope` helpers |
| 3.3 | `src/features/identity/presentation/auth-session-shape.test.ts` | Integration | ✅ Existing auth route/session shape suite green (`13` tests combined) | ✅ Lockstep session-shape expectation required the new field before the domain widened | ✅ Shape suite passed with `2` lockstep tests | ➖ Triangulation skipped: structural contract widened through the surrounding session/route tests | ➖ None needed |
| 3.4 | `src/features/identity/presentation/auth.route.test.ts` | Integration | ✅ Existing auth route suite green (`11` tests) | ✅ Added failing `activeScope` payload + unauthorized switch test first | ✅ Auth route suite passed with `12` tests | ✅ Covered `auth/me` shape and forbidden switch path | ✅ Shared route schema kept additive |
| 4.1 | `src/features/items/presentation/item.route.test.ts` | Integration | ✅ Existing item route suite green (`18` tests before new cases) | ✅ Added an inconsistent-auth test where warehouse scope must ignore stale `activeLocalId` | ✅ Item route suite passed with `20` tests | ✅ Covered warehouse/company and local-only derivation paths | ➖ None needed |
| 4.2 | `src/features/auth/infrastructure/auth-client.test.tsx` | Integration | ➖ N/A (new file) | ✅ Added failing repository + mutation-hook expectations before implementation | ✅ Web auth tests passed (`2` domain + `2` client tests) | ✅ Covered POST contract and invalidation of items/categories/orgTree | ✅ Added a focused `useSwitchActiveScope` hook without changing unrelated auth behavior |
| 4.3 | `e2e/active-scope.e2e.spec.ts` | E2E | ➖ N/A (new file) | ✅ Wrote the runtime local→warehouse scenario before the E2E seeding harness existed | ✅ Playwright spec passed (`1/1`) | ✅ Covered successful switch and forbidden out-of-scope API call in the same scenario | ✅ Inlined a dedicated runtime seed/cleanup harness instead of touching the pre-existing failing legacy E2E seed helper |
| 5.1 | `src/features/identity/application/login.test.ts`, `src/features/identity/application/register.test.ts`, `src/features/identity/application/resolve-auth-session.test.ts`, `src/features/identity/presentation/auth.route.test.ts`, `src/db/migrations/__tests__/migration-journal.test.ts` | Unit + Integration | ⚠️ Baseline focused suites reproduced the verify blockers: missing `activeScope`, legacy auth-gateway contract drift, and migration test incompatibilities/timeouts | ✅ Added failing login/resolve-auth-session contract coverage first, then used the pre-existing failing legacy route/migration suites as the RED signal for contract/fixture repairs | ✅ Focused remediation suites, coverage, root tests, and build all passed | ✅ Covered seed-admin + persisted login lockstep, single-scope auto-select, multi-scope selection-required behavior, route/test fixture contract parity, and canonical `locals` migration assertions | ✅ Extracted `resolveSingleAuthorizedScope` and aligned web test fixtures with the widened auth contract |
| R-final | `src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.test.ts`, `src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts`, `src/features/items/presentation/item.route.test.ts` | Unit + Integration | ⚠️ Existing item-route safety net was green; the first Drizzle integration safety-net run failed only because PostgreSQL was still starting, then passed once Docker PostgreSQL was ready | ✅ Added the multi-scope selection-block test first, alongside same-company sibling coverage, and the focused item-route run failed with `expected 200 to be 403` before the route guard change | ✅ Final focused suite passed (`3` files / `27` tests), then coverage + root tests + build all passed | ✅ Covered same-company sibling exclusion in both in-memory and PostgreSQL resolvers plus explicit-selection enforcement for scope-bound item access | ✅ Kept the fix surgical by adding one route guard and only the fixture updates needed to express explicit company/local scope selection |

## Test Summary
- **Total tests written**: 36
- **Total tests passing**: 27 in the final remediation-focused run, 67 in the earlier remediation-focused run, plus the preserved earlier slice evidence above and the full verify commands (`api 238`, `web 97`) now green
- **Layers used**: Unit, Integration, E2E
- **Approval tests** (refactoring): None — no refactoring-only tasks in this change
- **Pure functions created**: 2 (`toScopeRef`, `isAuthorizedScope`)

## Deviations from Design
- Reused a dedicated Playwright runtime seed inside `e2e/active-scope.e2e.spec.ts` instead of extending the legacy `e2e-state.ts` helper because the existing helper still references the removed `branches` table and is a pre-existing failure outside this slice.
- For the scope-selection requirement, the remediation chose the mature ERP/SaaS behavior of auto-selecting exactly one authorized scope while leaving multi-scope users unselected until they choose explicitly.

## Issues Found
- The workspace still contains large pre-existing uncommitted PR-1/PR-2 artifacts, so exact remediation diff sizing against `HEAD` remains noisy.
- Web tests still emit pre-existing React `act(...)` warnings, but they no longer fail the required verify commands.
- The first PostgreSQL-backed safety-net run hit startup timing right after `pnpm db:up`; rerunning once the container was ready passed cleanly.

## Remaining Tasks
- [x] None.

## Workload / PR Boundary
- Mode: `stacked PR slice`
- Current work unit: `final-scope-authority-remediation`
- Boundary: starts at the remaining verify blockers from `verify-report.md` and ends with green sibling-visibility coverage plus green `pnpm --filter api test:coverage`, `pnpm test`, and `pnpm build`.
- Estimated review budget impact: remediation-only delta stayed bounded; no new feature scope was added.

## Status
- 20 / 20 tasks complete.
- Required verify commands are green.
- Ready for `sdd-verify` / remediation closeout.
