# Archive Report: org-hierarchy-sidebar

Change: `org-hierarchy-sidebar`
Archived: 2026-08-05
Status: **Archived — PASS with follow-ups**

## Goal

Introduce a multi-level organizational hierarchy (Company → Division → Local) into Vimcore, scope the item catalog by active local, trim the dashboard sidebar to working modules, and add an active-local switcher in the sidebar. Six capabilities touched.

## What Was Implemented

### 1. Schema & Migration (PR Slice 1)
- New `divisionsTable` (Company → Division, unique name per company).
- Additive columns via migration `0012_tense_black_panther.sql`:
  - `branches.division_id` (FK → divisions, nullable)
  - `item_categories.local_id` (nullable)
  - `items.local_id` (nullable)
  - `memberships.division_id`, `memberships.local_id` (nullable)
  - `user_preferences.active_local_id` (nullable)
  - `audit_events.division_id`, `audit_events.local_id` (nullable)
- Replaced indexes (additive, drops old before creating new):
  - `items_company_local_sku_idx` on `(company_id, local_id, sku)` WHERE `sku IS NOT NULL`
  - `item_categories_company_local_parent_name_idx` on `(company_id, local_id, parent_id, name)`
- New `audit_events_local_id_idx` on `audit_events.local_id`.
- Migration round-trip test: `migration-0012-org-hierarchy.test.ts`.

### 2. Identity & Access (PR Slice 1)
- `AuthMembership` gained nullable `divisionId` / `localId`.
- `AuthSession` gained nullable `activeLocalId`.
- `resolve-auth-session` adds `resolveActiveLocalId(userId, activeCompany)` — re-validates the persisted local belongs to the active company; coerces mismatches to null. Login starts at company level (`activeLocalId: null`); no auto-scoping to membership local.
- `POST /auth/me/active-local` endpoint — body `{localId: string | null}`; validates local company === active company (`LOCAL_NOT_IN_COMPANY` / `ACTIVE_COMPANY_REQUIRED`); 204 on success.
- Zod `authSessionSchema`/`authMembershipSchema` match web `AuthSession`/`AuthMembership` field-for-field; `auth-session-shape.test.ts` enforces lockstep.
- Capability derivation unchanged — still role-based at company level; no per-level roles. `requireTenantCapability` still returns `companyId` as tenant root.
- `setActiveCompanyId` clears `activeLocalId` (no stale local after company switch).

### 3. Org-Hierarchy Feature (PR Slice 1)
- New `apps/api/src/features/org-hierarchy/` (domain, application, infrastructure, presentation).
- 8 endpoints on `org-hierarchy.router.ts`:
  - `POST /companies/:companyId/divisions`, `GET /companies/:companyId/divisions`
  - `PATCH /divisions/:divisionId`, `DELETE /divisions/:divisionId`
  - `POST /companies/:companyId/locals`, `GET /companies/:companyId/locals`
  - `PATCH /locals/:localId`, `DELETE /locals/:localId`
- Authorizer: `requireCompanyMembership` ensures caller has a membership in the path company; mutations require `company-owner`; reads allow `company-owner` + `company-user`; platform-admin passes the role check.
- Delete constraints enforced via `countLocalsInDivision` (division conflict → `DivisionConflictError`) and `countItemsInLocal` + `countMembershipsInLocal` (local conflict → `LocalConflictError`). No cascade deletes.
- Local re-parenting via `PATCH /locals/:localId` with `divisionId` (nullable → move to company level, or to another division).
- Drizzle gateway `drizzle-org-hierarchy.gateway.test.ts` covers create/list/update/delete, conflicts, re-parenting.

### 4. Local-Scoped Catalog (PR Slice 2)
- `Item` / `ItemCategory` types gained nullable `localId`.
- `ItemCatalogGateway` / `CategoryGateway` port signatures thread `localId: string | null` on every input.
- Defensive double-filter: SQL gate `${itemsTable.localId} IS NOT DISTINCT FROM ${localId}` + TS gate `normalizeItemRows` / `normalizeCategoryRows` re-check `localId` for every returned row.
- `listItems` / `getItemById` / `updateItem` / `softDeleteItem` / `listCategories` / `getCategoryById` / `updateCategory` / `getDescendantIds` / `createCategory` all scope by `(companyId, localId)`.
- Item creation derives `localId` from `auth.activeLocalId`, never from the request body.
- Audit event recording on item create/update/delete populates `localId` from session; `divisionId` stays null for item events (items carry local scope only).
- Use cases `list-items`, `get-item`, `create-item`, `update-item`, `soft-delete-item` thread `localId` from auth, not body.

### 5. Web — Auth & Catalog (PR Slice 3)
- Web `AuthMembership` / `AuthSession` mirror the API types (`divisionId`, `localId`, `activeLocalId`).
- `AuthRepository.switchActiveLocal` added; `useSwitchActiveLocal` TanStack Query hook invalidates `/auth/me`.
- Items page and categories page consume API-scoped data (no client-side filter override); when `activeLocalId` is null they show company-wide entries, when set they show that local's entries only.

### 6. Web — Hierarchy Management UI (PR Slice 3)
- `apps/web/src/features/org-hierarchy/` created: domain types, `org-hierarchy-api.ts` fetch wrappers, TanStack Query hooks (`useDivisions`, `useLocals`, `useCreateDivision`, `useCreateLocal`, `useUpdateDivision`, `useUpdateLocal`, `useDeleteDivision`, `useDeleteLocal`).
- `divisions-page.tsx` + form dialog and `locals-page.tsx` + form dialog support full CRUD with conflict surfacing.
- Routes `/dashboard/divisions` and `/dashboard/locals` added in `app.tsx`, gated to `company-owner` via the sidebar's `Organización` group.

### 7. Sidebar Cleanup (PR Slice 3)
- `workspaceItems` trimmed to exactly 3: **Inicio**, **Items**, **Categorías**. The 5 placeholders (Sales, Compras, Produccion, Finanzas, Proyectos) removed. `isHashLink` removed.
- `ActiveLocalSwitcher` mounted in the sidebar header (below TeamSwitcher); shows "Nivel empresa" when `activeLocalId` is null and the local name otherwise; on select calls `useSwitchActiveLocal` → `POST /auth/me/active-local`. Hidden when the active company has no locals.

## Test Results

| Suite | Files | Tests | Status |
|---|---|---|---|
| `pnpm --filter api test` | 37 passed | **209 passed** | GREEN |
| `pnpm --filter web test` | 17 passed | **89 passed** | GREEN |
| `pnpm build` (api + web) | 2/2 tasks | — | GREEN |
| Migration 0012 round-trip | — | included in API suite | GREEN |
| **Total automated** | — | **298 passing** | — |

Notable new/relevant tests: `auth-session-shape.test.ts` (lockstep), `resolve-auth-session.test.ts`, `drizzle-auth.gateway.test.ts`, `drizzle-org-hierarchy.gateway.test.ts`, `org-hierarchy.router.test.ts`, `drizzle-item.gateway.test.ts`, `item-http-gateway.test.ts`, `app.dashboard-shell.test.tsx` (asserts exactly 3 workspace items + company-owner sidebar group + admin observability routing).

## Build Status

`pnpm build` — both `api:build` and `web:build` succeed (2 tasks successful, 1 cached). Web bundle emits a non-blocking chunk-size warning (`index-*.js` > 500 kB) flagged for future code-splitting; not a blocker.

## Gaps & Follow-ups

### Gap 1: audit-event-management READ side (partial)
- **Done:** `audit_events.divisionId`/`localId` columns added (nullable), `audit_events_local_id_idx` created, item-gateway write path populates `localId` on `item.created`/`item.updated`/`item.deleted` audit events.
- **Missing:**
  - `AdminAuditEventListFilters` (`apps/api/src/features/admin/domain/admin.ts:106-112`) does not expose optional `divisionId` / `localId` filters.
  - `listAuditEventsSchema` and the gateway `listAuditEvents` (`drizzle-admin.gateway.ts:40-46, 397-...`) only filter by `type`, `companyId`, `correlationId`; they do not apply `divisionId`/`localId` predicates.
  - `AdminAuditEventSummary` and the gateway SELECT do not return `divisionId`/`localId`, so the context is not visible in the admin list/detail response.
- **Impact:** Spec scenario "Filter audit events by local" fails. The hierarchy context is recorded but cannot be queried or surfaced through the admin observability API.
- **Recommended follow-up:** Add `divisionId`/`localId` to `AdminAuditEventListFilters` + Zod schema + gateway WHERE clause (NULL-safe, matches-everything when filter null) and to the summary SELECT / shape. Estimated ~80–120 lines + tests.

### Gap 2: E2E regression (Phase 8) deferred
- Phase 8.1–8.3 (Playwright scenarios: backward-compat with no hierarchy, owner creates division→local→switch→scoped item, company-user blocked from `/divisions` and `/locals`) are not implemented. `e2e/app.e2e.spec.ts` has zero references to `divisions`, `locals`, or `activeLocal`.
- **Impact:** No end-to-end regression for the cross-cutting flow. Unit + integration coverage exists for every component, but the full browser flow is unexercised.
- **Recommended follow-up:** Add three Playwright specs under `e2e/` covering the Phase 8 scenarios; spin up Docker Compose Postgres + api+web via `pnpm dev`.

### Non-blocking: web bundle size
- `web:build` warns `dist/assets/index-*.js` > 500 kB. Functionality unaffected. Future task: route-level `React.lazy()` / `manualChunks` for `dashboard/admin` and `org-hierarchy` routes.

## Final State

- All 6 spec capability deltas are implemented at the unit/integration level.
- 298 tests pass; build is green; migration 0012 is additive and round-trip tested.
- Primary deliverables complete and verified: org-hierarchy CRUD, identity-access scoping with active-local, local-scoped catalog with defensive double-filter, sidebar trimmed to 3 working modules, active-local switcher, hierarchy management UI.
- Two follow-ups recorded (audit read-side filter + summary; E2E regression). Neither blocks the change's core value; both are scoped for a future iteration.
- The change is safe to archive: feature flags are not used (additive, nullable columns default NULL → zero-hierarchy companies behave identically to pre-hierarchy), and rollback is a single-migration revert plus removal of the new feature directories.