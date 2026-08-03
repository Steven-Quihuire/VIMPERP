# Tasks: Org Hierarchy & Sidebar Cleanup

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,400 (across API + web + migration + tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (schema+identity+org-hierarchy API) → PR 2 (local-scoped catalog) → PR 3 (web UI + sidebar) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Additive schema migration 0012 + identity-access session scope + org-hierarchy CRUD API | PR 1 | `pnpm --filter api test --filter '*org-hierarchy*' --filter '*auth*'` | Docker Compose Postgres for gateway tests | Revert migration + new feature dir; old sessions still resolve (new fields default NULL) |
| 2 | Local-scoped item/catalog gateway + use cases + audit scope | PR 2 | `pnpm --filter api test --filter '*item*'` | Docker Compose Postgres | Revert item gateway/use-case threads; `localId IS NULL` queries behave as today |
| 3 | Web auth mirror + org-hierarchy UI + sidebar trim + active-local switcher + E2E | PR 3 | `pnpm --filter web test && pnpm test:e2e` | Playwright against running api+web | Revert web feature dir + sidebar; routes return 404 |

## Phase 0: Bootstrap & Test Infrastructure

- [ ] 0.1 Verify `pnpm test` passes on current main (establishes RED/GREEN baseline). Files: none. Acceptance: green run. Deps: none.
- [ ] 0.2 Verify `pnpm build` (tsc across apps) passes. Acceptance: tsc green. Deps: none.
- [ ] 0.3 Verify `pnpm lint` passes. Acceptance: lint green. Deps: none.
- [ ] 0.4 Confirm Docker Compose Postgres is reachable for gateway integration tests; document port in tasks notes. Deps: 0.1.

## Phase 1: Schema & Migration (PR Slice 1)

- [ ] 1.1 RED: Write migration round-trip test (`apps/api/src/db/migrations/migration-0012.test.ts`) asserting migration applies and rolls back cleanly on an empty schema snapshot. Acceptance: test fails (no 0012 migration yet). Deps: 0.1.
- [ ] 1.2 Add `divisionsTable` to `apps/api/src/shared/infrastructure/db/schema.ts` (id, companyId FK, name, createdAt, uniqueIndex on companyId+name). Acceptance: tsc green. Deps: 1.1.
- [ ] 1.3 Add nullable `divisionId` (FK→divisions) to `branchesTable` in schema.ts. Acceptance: tsc green. Deps: 1.2.
- [ ] 1.4 Add nullable `divisionId` and `localId` (no FK, matches `companyId` pattern) to `membershipsTable`. Deps: 1.2.
- [ ] 1.5 Add nullable `localId` to `itemsTable`; replace `items_company_sku_idx` unique index with `items_company_local_sku_idx` on (companyId, localId, sku) WHERE sku IS NOT NULL. Deps: 1.2.
- [ ] 1.6 Add nullable `localId` to `itemCategoriesTable`; replace `item_categories_company_parent_name_idx` with `item_categories_company_local_parent_name_idx` on (companyId, localId, parentId, name). Deps: 1.2.
- [ ] 1.7 Add nullable `activeLocalId` to `userPreferencesTable` (no FK, matches activeCompanyId shape). Deps: 1.2.
- [ ] 1.8 Add nullable `divisionId` and `localId` to `auditEventsTable`; add `audit_events_local_id_idx` index on localId. Deps: 1.2.
- [ ] 1.9 Run `pnpm --filter api drizzle-kit generate` → migration `0012_*`. Manually verify generated SQL is additive-only and contains `DROP INDEX items_company_sku_idx` + `DROP INDEX item_categories_company_parent_name_idx` before the `CREATE UNIQUE INDEX` statements. Deps: 1.2–1.8.
- [ ] 1.10 GREEN: migration round-trip test passes; verify rollback migration drops new columns/tables. Deps: 1.1, 1.9.

## Phase 2: Identity Access (PR Slice 1 continued)

- [ ] 2.1 RED: Extend `drizzle-auth.gateway.test.ts` to assert `listMemberships` returns `divisionId`/`localId`, `setActiveLocalId(null)` clears the column, and `setActiveCompanyId` clears `activeLocalId`. Acceptance: fails. Deps: 1.10.
- [ ] 2.2 RED: Extend `resolve-auth-session` tests to assert `activeLocalId` defaults null on login and coerces to null when the persisted local belongs to another company. Deps: 1.10.
- [ ] 2.3 Update `AuthMembership` and `AuthSession` types in `apps/api/src/features/identity/domain/auth.ts` (nullable divisionId, localId, activeLocalId). Deps: 2.1.
- [ ] 2.4 Update `authSessionSchema`/`authMembershipSchema` Zod in `apps/api/src/features/identity/presentation/auth.router.ts` to include the new nullable fields. Deps: 2.3.
- [ ] 2.5 Update `application/resolve-auth-session.ts`: add `resolveActiveLocalId(userId, activeCompany)` helper that re-validates `local.companyId === activeCompany.companyId` and coerces mismatches to null. Deps: 2.2, 2.3.
- [ ] 2.6 Update `infrastructure/drizzle-auth.gateway.ts`: `listMemberships` selects divisionId/localId; add `findActiveLocalId(userId)` and `setActiveLocalId(userId, localId|null)`; `setActiveCompanyId` clears `activeLocalId`. Deps: 2.1.
- [ ] 2.7 RED: Write `auth-session-shape.test.ts` comparing Zod `authSessionSchema`/`authMembershipSchema` field shape vs web `AuthSession`/`AuthMembership` types (compile-time + runtime `.shape` introspection). Deps: 2.4.
- [ ] 2.8 Add `POST /auth/me/active-local` endpoint in `auth.router.ts` (body `{localId: string|null}`, validates local belongs to active company via `orgHierarchyGateway.findLocalById`, 204 on success, 400 `LOCAL_NOT_IN_COMPANY` on mismatch, 400 `ACTIVE_COMPANY_REQUIRED` when no active company). Deps: 2.6, 3.3.
- [ ] 2.9 RED: Extend `auth.router.test.ts` for `/auth/me/active-local` happy path, null (clear) path, and cross-company rejection (per spec scenarios). Deps: 2.8.
- [ ] 2.10 GREEN: gateway + resolve-auth-session + auth route tests pass. Deps: 2.1, 2.2, 2.9.
- [ ] 2.11 Update web `apps/web/src/features/auth/domain/auth.ts`: mirror `AuthMembership` (divisionId, localId) + `AuthSession` (activeLocalId); add `switchActiveLocal` to `AuthRepository`. Deps: 2.4.

## Phase 3: Org-Hierarchy Feature (PR Slice 1 continued)

- [ ] 3.1 RED: Write `infrastructure/drizzle-org-hierarchy.gateway.test.ts` covering create/list/update/delete division + local, re-parenting, name conflicts (`DivisionNameConflictError`, `LocalNameConflictError`), and deletion conflicts (count > 0 ⇒ `DivisionConflictError`/`LocalConflictError`). Acceptance: fails (gateway missing). Deps: 1.10.
- [ ] 3.2 RED: Write `presentation/org-hierarchy.router.test.ts` covering all 8 endpoints, authorization (company-owner write, company-user read 403, company-user read 200), 409 on delete-with-children, backward-compat empty-list for company with no hierarchy, re-parent scenarios from spec. Deps: 3.1.
- [ ] 3.3 Create `apps/api/src/features/org-hierarchy/domain/org-hierarchy.ts`: `Division`, `Local`, `DivisionDraft`, `LocalDraft`, `OrgHierarchyGateway` port, `DivisionConflictError`, `LocalConflictError`, `DivisionNameConflictError`, `LocalNameConflictError` (per design §4.1). Deps: 2.3.
- [ ] 3.4 Create use cases in `apps/api/src/features/org-hierarchy/application/`: `create-division`, `list-divisions`, `update-division`, `delete-division` (checks `countLocalsInDivision > 0`), `create-local`, `list-locals`, `update-local`, `delete-local` (checks `countItemsInLocal > 0 || countMembershipsInLocal > 0`). Factory pattern `(deps) => (input) => Promise<output>`. Deps: 3.3.
- [ ] 3.5 Create `infrastructure/drizzle-org-hierarchy.gateway.ts` implementing `OrgHierarchyGateway` against `divisionsTable`/`branchesTable` using `AppDb` injection. Deps: 3.3.
- [ ] 3.6 Create `presentation/org-hierarchy.router.ts` with the 8 endpoints (design §4.5). Mutating routes use `createRequireRole('company-owner')`; reads use `createRequireRole('company-owner','company-user')` plus active-membership company match. Deps: 3.4, 3.5.
- [ ] 3.7 Wire router in `apps/api/src/app/create-app.ts` with its deps. Deps: 3.6.
- [ ] 3.8 Export `OrgHierarchyGateway` and use cases from feature barrel (`index.ts`). Deps: 3.4.
- [ ] 3.9 GREEN: gateway + router tests pass. Deps: 3.1, 3.2, 3.7.

## Phase 4: Local-Scoped Catalog (PR Slice 2)

- [ ] 4.1 RED: Extend `drizzle-item.gateway.test.ts` with cases — company-level list returns only `localId IS NULL`, local-scoped list returns only that local's rows, SKU collision across locals vs company-wide succeeds, `normalizeItemRows` filters out a wrong-`localId` row injected at SQL layer (defensive double-filter), `IS NOT DISTINCT FROM` null matching. Deps: 1.10, 3.9.
- [ ] 4.2 RED: Extend `items.router.test.ts` — local-scoped list, item creation derives `localId` from session not body (body `localId` ignored or rejected), company-level vs local-level isolation per spec scenarios. Deps: 3.9.
- [ ] 4.3 Update `Item` and `ItemCategory` types (`apps/api/src/features/items/domain/item.ts`) to add nullable `localId`; extend `ItemCatalogGateway`/`CategoryGateway` port signatures with `localId: string|null` on every input. Deps: 4.1.
- [ ] 4.4 Update `infrastructure/drizzle-item.gateway.ts`: add `localFilter = (localId) => sql\`${itemsTable.localId} IS NOT DISTINCT FROM ${localId}\``; apply to every method; extend `normalizeItemRows` TS-side re-check; `toItem`/`toItemCategory` populate `localId`; `create/update` write `localId` from input. Deps: 4.1, 4.3.
- [ ] 4.5 Update item use cases `list-items`, `get-item`, `create-item`, `update-item`, `soft-delete-item` and category use cases `list-categories`, `create-category`, `update-category`: thread `localId` from `auth.activeLocalId` (NOT from request body). Deps: 4.4.
- [ ] 4.6 Update item/category route handlers to pass `auth.activeLocalId` into use cases. Deps: 4.5.
- [ ] 4.7 Update audit-event recording in item gateway to populate `divisionId`/`localId` from session + local lookup when available. Deps: 4.4, 2.6.
- [ ] 4.8 GREEN: item gateway + router tests pass. Deps: 4.1, 4.2, 4.6.

## Phase 5: Web — Auth & Catalog (PR Slice 3)

- [ ] 5.1 Verify/complete web auth domain mirror from 2.11; add TanStack Query `useSwitchActiveLocal` hook invalidating `/auth/me`. Deps: 2.11.
- [ ] 5.2 Update web items page to filter by `session.activeLocalId` (already comes from API scoping — verify no client-side filter override). Deps: 4.8, 5.1.
- [ ] 5.3 Update web categories page to filter by active local. Deps: 4.8.
- [ ] 5.4 Add local scope indicator ("Company-wide" vs local name resolved from `useLocals`) to items and categories UI. Deps: 5.2, 5.3.
- [ ] 5.5 RED: Update web tests for items/categories pages to assert filtering by active local and the scope indicator. Deps: 5.4.

## Phase 6: Web — Hierarchy Management UI (PR Slice 3 continued)

- [ ] 6.1 Create `apps/web/src/features/org-hierarchy/domain/org-hierarchy.ts` mirroring API types. Deps: 3.9.
- [ ] 6.2 Create `infrastructure/org-hierarchy-api.ts` fetch wrappers for the 8 endpoints (no Axios; injected `apiBaseUrl`). Deps: 6.1.
- [ ] 6.3 Create TanStack Query hooks in `application/`: `useDivisions`, `useLocals`, `useCreateDivision`, `useCreateLocal`, `useUpdateDivision`, `useUpdateLocal`, `useDeleteDivision`, `useDeleteLocal` (invalidation on mutation). Deps: 6.2.
- [ ] 6.4 Create `presentation/divisions-page.tsx` + `division-form-dialog.tsx` (list/create/update/delete, conflict error surfacing). Deps: 6.3.
- [ ] 6.5 Create `presentation/locals-page.tsx` + `local-form-dialog.tsx` (list/create/update/delete, division selector, re-parent, conflict surfacing). Deps: 6.3.
- [ ] 6.6 Add `/dashboard/divisions` and `/dashboard/locals` routes in `apps/web/src/app/app.tsx` (static routes mirroring ItemsRoute). Deps: 6.4, 6.5.
- [ ] 6.7 Guard the two routes to `company-owner` only (route guard component). Deps: 6.6.
- [ ] 6.8 RED: Write web tests for divisions and locals pages (render, create, conflict, 403 for company-user). Deps: 6.7.

## Phase 7: Sidebar Cleanup (PR Slice 3 continued)

- [ ] 7.1 RED: Update `dashboard-app-sidebar.test.tsx` to assert exactly 3 workspace items (Inicio, Items, Categorías) and absence of the 5 placeholders (Sales, Compras, Produccion, Finanzas, Proyectos). Acceptance: fails. Deps: 0.1.
- [ ] 7.2 Trim `workspaceItems` to 3 entries in `dashboard-app-sidebar.tsx`; remove the 5 placeholders (document count: code has 5, prompt said 6). Deps: 7.1.
- [ ] 7.3 Remove `isHashLink` function and hash-link rendering branch (no remaining hash-link items). Deps: 7.2.
- [ ] 7.4 Create `active-local-switcher.tsx` reading `useLocals({companyId: activeCompany?.companyId})`; shows "Company level" when `activeLocalId` null, local name otherwise; on select calls `useSwitchActiveLocal`. Deps: 2.11, 6.3.
- [ ] 7.5 Mount the active-local switcher in the sidebar header (below TeamSwitcher). Deps: 7.4.
- [ ] 7.6 GREEN: dashboard-app-sidebar test passes (3 items + switcher present). Deps: 7.1, 7.5.

## Phase 8: Integration & E2E

- [ ] 8.1 RED: E2E regression — existing company with no hierarchy behaves identically to today (sidebar 3 items, items list identical, login lands at company level with `activeLocalId: null`). Deps: 7.6, 4.8.
- [ ] 8.2 RED: E2E — company-owner creates division → creates local under it → switches active local from sidebar → creates item at local → verifies item is scoped (not visible at company level). Deps: 8.1, 7.4.
- [ ] 8.3 RED: E2E — company-user cannot access `/dashboard/divisions` or `/dashboard/locals` (route guard redirect). Deps: 8.1.
- [ ] 8.4 Run `pnpm test` + `pnpm build` — verify green across api + web. Deps: 8.1–8.3.
- [ ] 8.5 Run `pnpm --filter api test:coverage` — verify 80% threshold met (per config.yaml). Deps: 8.4.

## Notes

- Strict TDD: each implementation task is preceded by its RED test task (1.1→1.10, 2.1→2.10, 3.1→3.9, 4.1→4.8, 7.1→7.6, 8.x).
- Chain strategy: `stacked-to-main` — each PR slice merges to main in order; PR 2 depends on PR 1 being merged, PR 3 depends on PR 2.
- Rollback boundary per slice is clean because schema is additive and new fields default NULL.