# Proposal: Org Hierarchy & Sidebar Cleanup

## Intent

Vimcore models a flat `Company → User`. Real orgs operate as `Company → Division → Local → User`. `branchesTable` is write-only seed data with no UI, no API, no reads. The sidebar advertises 5 non-routing modules. This change introduces a mandatory-in-model / optional-in-practice hierarchy with **local-scoped catalog**, keeps `companyId` as the tenant root, and trims the sidebar to only working routes.

## Scope

### In Scope (v1)
- New `divisions` table; extend `branches` → `locals` (nullable `divisionId`).
- `memberships` + `divisionId`/`localId`; `userPreferences` + `activeLocalId`; `auditEvents` + optional scope.
- `items`/`itemCategories` + nullable `localId` → **local-scoped catalog**.
- Division/Local CRUD API + management pages.
- Auth session carries hierarchy fields (API Zod ↔ web domain lockstep); switch-active-local.
- Sidebar: remove 5 placeholders (Sales, Compras, Produccion, Finanzas, Proyectos) → 3 routes remain (Inicio, Items, Categorías).

### Out of Scope
- Onboarding capture of hierarchy (deferred — onboarding seeds only company).
- Per-level roles (no `division-manager`/`local-manager`).
- Local pricing overrides; advanced tree visualization; bulk item reassignment.

## Capabilities

### New Capabilities
- `org-hierarchy`: Company→Division→Local model, CRUD endpoints, management UI, active-local selection rules.

### Modified Capabilities
- `identity-access`: `AuthMembership` + divisionId/localId; `AuthSession` + activeLocalId; switch endpoint; Zod/web lockstep.
- `item-catalog`: items/categories + localId; gateway + use cases thread local scope; defensive double-filter preserved.
- `item-catalog-web`: web mirror + localId; pages respect active local.
- `dashboard-shell`: sidebar → 3 routes; active-local switcher concept.
- `audit-event-management`: events + optional divisionId/localId scope (companyId remains).

## Approach

**Approach A — fixed-depth adjacency list, additive nullable.** New `divisionsTable` (FK→companies). `branches` becomes `locals` (+ nullable `divisionId` FK→divisions; NULL = company-level local). `memberships` adds nullable `divisionId`/`localId` (no FK, matching existing pattern). Roles stay company-level; `deriveAuthCapabilities` unchanged; `requireTenantCapability` still returns `companyId` (tenant root); `activeLocalId` is a manual finer scope — users always start at company level. Catalog: `localId NULL` = company-wide (legacy); `NOT NULL` = local-specific. Company level sees `localId IS NULL` items; a local sees only its own items.

## Schema Changes

| Table | Change |
|---|---|
| `divisions` (new) | id, companyId FK, name, createdAt |
| `branches` (→locals) | + nullable divisionId FK→divisions |
| `memberships` | + nullable divisionId, localId (no FK) |
| `items` | + nullable localId; sku unique per (companyId, localId) |
| `item_categories` | + nullable localId; name unique per (companyId, localId, parentId) |
| `user_preferences` | + nullable activeLocalId |
| `audit_events` | + nullable divisionId, localId |

## Migration Strategy

Additive only — no `NOT NULL`, no drops, no renames. Existing rows: new columns NULL → behave as today. `branches` rows reinterpreted as company-level locals. First-local creation offers an optional async assignment of existing items (or leave company-wide/NULL). Migration `0012_*` via `drizzle-kit generate`. Backward compat is the heart of the guarantee.

## API Changes

- `POST/GET/PATCH/DELETE /companies/:companyId/divisions` and `/…/locals` (locals accept optional `divisionId`).
- `AuthSession` JSON: `memberships[].divisionId/localId`, `activeLocalId`.
- `POST /auth/me/active-local` mirrors switch-active-company.
- Item/category endpoints thread `localId` (from active session); gateway filters `companyId AND localId`.

## Frontend Changes

- New `apps/web/src/features/org-hierarchy` (domain/application/infrastructure/presentation).
- Routes `/dashboard/divisions`, `/dashboard/locals`.
- `dashboard-app-sidebar.tsx`: `workspaceItems` → 3; remove dead `isHashLink` branch.
- `auth.domain` mirror gains hierarchy fields in lockstep with API Zod.
- Route guard "needs active local" on catalog write (design-phase detail).

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `apps/api/src/shared/infrastructure/db/schema.ts` | Modified | New tables + nullable columns |
| `apps/api/src/features/identity/*` | Modified | Membership/session scope + switch |
| `apps/api/src/features/items/*` | Modified | Local-scoped gateway + use cases |
| `apps/api/src/features/org-hierarchy/*` | New | Division/Local CRUD feature |
| `apps/api/src/features/admin/*` | Modified | Optional hierarchy signals |
| `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` | Modified | Trim workspaceItems |
| `apps/web/src/features/org-hierarchy/*` | New | Management UI |
| `apps/web/src/features/auth/domain/auth.ts` | Modified | Mirror membership/session |
| `apps/web/src/app/app.tsx` | Modified | New routes |
| `apps/api/src/db/migrations/0012_*` | New | Additive migration |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Size exceeds 400-line review budget | High | Chained PRs: schema+API / catalog / UI |
| Auth Zod ↔ web domain drift | Medium | Lockstep shape-equality test |
| Items orphaned at first local | Medium | Optional async assignment; NULL stays valid |
| Active-local selection permissive in v1 | Medium | Allow any local in active company; refine later |
| Prompt said 6 placeholders, code has 5 | Low | Remove the 5 actual; document count |

## Rollback Plan

Schema is additive (nullable columns + new tables) → rollback = a drop migration for new columns/tables + code revert. Old sessions still resolve: new membership/preference fields default NULL; `localId IS NULL` queries behave as today. No data loss; no destructive migration in v1.

## Dependencies

- `company-lifecycle` — provisioning unchanged in v1; hierarchy CRUD is post-onboarding.
- `company-onboarding` — explicitly unchanged in v1 (deferred out of scope).
- `monorepo-foundation` — schema lives in `apps/api/src/shared/infrastructure/db`.

## Success Criteria

- [ ] Existing companies with no locals behave identically to today (regression E2E green).
- [ ] Divisions/locals CRUD via UI; memberships carry divisionId/localId.
- [ ] Catalog scoped by active local; company-wide items visible only at company level.
- [ ] Sidebar shows exactly 3 workspace items; no hash-link placeholders remain.
- [ ] `pnpm test` + `pnpm build` green; migration applies and rolls back cleanly.