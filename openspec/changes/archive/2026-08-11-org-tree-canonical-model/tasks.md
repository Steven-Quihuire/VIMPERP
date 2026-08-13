# Tasks: Org Tree Canonical Model

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~850 (port + 0018 + read tree + auth widening + web + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR-1 (preflight + port + 0018 + read tree + switcher) → PR-2 (activeScope + endpoint + items + E2E) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |


Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Preflight + port + 0018 + read tree + switcher | PR-1 | api migrations/scope-hierarchy/org-tree tests | `pnpm db:migrate && pnpm dev:api`; GET org-tree returns 6 types | Revert 0018 + drop `shared/scope-hierarchy/` + `features/org-tree/` |
| 2 | activeScope widening + switch route + items + E2E | PR-2 | api identity/items + web auth/org-tree + Playwright | dev:api + dev:web; switch to warehouse, items re-scope | Drop `active_scope_node_id`; remove endpoint; web falls back to activeLocalId |

## Phase 0: Preflight (blocks PR-1)

- [x] 0.1 Restore missing journal entries (0013/0014/0016/0017) + matching `_snapshot.json` in `apps/api/src/db/migrations/meta/` so `drizzle-kit migrate` runs.
- [x] 0.2 RED+GREEN `migrations/__tests__/migration-journal.test.ts` asserts clean migrate on local PG.

## Phase 1: Shared `ScopeResolver` Port + 0018 Migration (PR-1)

- [x] 1.1 RED `migrations/__tests__/migration-0018-role-assignment-mode.test.ts` asserts enum + default column + nullable `user_preferences.active_scope_node_id`.
- [x] 1.2 GREEN create `apps/api/src/db/migrations/0018_role_assignment_mode.sql`; journal entry added.
- [x] 1.3 RED+GREEN create `shared/infrastructure/scope-hierarchy/scope-hierarchy.port.ts` + `port.test.ts` (fake) covering `getLineage`/`isAuthorized`/`listAuthorizedDescendants`.
- [x] 1.4 GREEN create `shared/infrastructure/scope-hierarchy/drizzle-scope-resolver.ts` (move CTE, add `isAuthorized`/`listAuthorizedDescendants`).
- [x] 1.5 GREEN `features/roles-management/infrastructure/drizzle-scope-resolver.ts` delegates to shared port; raw CTE removed.

## Phase 2: `org-tree` Read Tree + Mode Filter (PR-1)

- [x] 2.1 RED+GREEN `features/roles-management/application/compute-effective-permissions.test.ts` — `exact_node` blocks descendants; `subtree_inclusive` keeps lineage.
- [x] 2.2 GREEN extend `compute-effective-permissions.ts` to honor `assignment.mode`.
- [x] 2.3 RED+GREEN create `features/org-tree/{domain/org-tree.ts,application/list-org-tree.ts,infrastructure/drizzle-org-tree.gateway.ts,presentation/org-tree.router.ts,index.ts}` + tests.
- [x] 2.4 RED+GREEN create `web/features/org-tree/{application/org-tree-queries.ts,infrastructure/org-tree-http-gateway.ts,domain}` with tests.
- [x] 2.5 GREEN rename `web/features/org-hierarchy/presentation/active-local-switcher.tsx` → `web/features/org-tree/presentation/active-scope-switcher.tsx`; render 6-type subtree; update sidebar.

## Phase 3: `activeScope` Widening + Switch Endpoint (PR-2)

- [x] 3.1 RED+GREEN extend `identity/infrastructure/drizzle-auth.gateway.test.ts` for `findActiveScopeNodeId`/`setActiveScopeNodeId`; update `userPreferencesTable`; `setActiveCompanyId` clears `activeScopeNodeId`.
- [x] 3.2 RED+GREEN extend `identity/application/resolve-auth-session.test.ts` — backfill `activeScope` from `activeLocalId`; clear when out-of-scope.
- [x] 3.3 GREEN extend `identity/domain/auth.ts` — `activeScope: ScopeRef | null` on `AuthSession`, `SwitchActiveScopeInput`, widen `AuthIdentityGateway`.
- [x] 3.4 RED+GREEN extend `identity/presentation/auth.route.test.ts` — POST `/auth/me/active-scope` rejects unauthorized via `ScopeResolver.isAuthorized`; add route + Zod schema; lockstep `activeScope`.

## Phase 4: Items + Web Mirror + E2E (PR-2)

- [x] 4.1 RED+GREEN `items/presentation/item.route.test.ts` — `localId` derived from `activeScope.localId` only when `scopeType==='local'`.
- [x] 4.2 RED+GREEN web `features/auth/{domain/auth.test.ts,infrastructure/auth-client.test.ts}` — lockstep `activeScope` + `useSwitchActiveScope` invalidating items/categories/orgTree.
- [x] 4.3 Playwright E2E: sidebar switcher → warehouse; items re-scope; bad switch rejected.

## Phase 5: Verification (both PRs)

- [x] 5.1 `pnpm --filter api test:coverage` ≥ 80%; `pnpm test` + `pnpm build` green.
