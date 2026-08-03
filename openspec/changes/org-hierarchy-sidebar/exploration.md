# Exploration: `org-hierarchy-sidebar`

> SDD explore phase. Build on the current-state summary supplied by the
> orchestrator (not re-discovered here). This artifact maps the **impact
> surface** of two coupled changes and surfaces decisions for the proposal
> phase.

## Scope

Two distinct but coupled asks:

1. **Org hierarchy** — extend the flat `Company → User` model to an optional
   nested `Company → Division → Local → User` structure, backward compatible.
2. **Sidebar** — update the dashboard sidebar to "reflect the modules that are
   currently working" against the confirmed 8 workspace items.

---

## Current Architecture Summary

(See orchestrator-supplied summary. Verified and the key files are:

- Schema: `apps/api/src/shared/infrastructure/db/schema.ts` (331 lines)
- Auth domain: `apps/api/src/features/identity/domain/auth.ts`
- Auth identity adapter: `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts`
- Session resolution: `apps/api/src/features/identity/application/resolve-auth-session.ts`
- Companies domain: `apps/api/src/features/companies/domain/company.ts`
- Companies adapter: `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts`
- Provisioning recorder:
  `apps/api/src/features/companies/infrastructure/drizzle-provisioning.recorder.ts`
- Create-company use case:
  `apps/api/src/features/companies/application/create-company.ts`
- Items gateway: `apps/api/src/features/items/infrastructure/drizzle-item.gateway.ts`
- Admin gateway: `apps/api/src/features/admin/infrastructure/drizzle-admin.gateway.ts`
- Sidebar: `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx`
- App router: `apps/web/src/app/app.tsx`
- E2E: `e2e/app.e2e.spec.ts` (110 lines, smoke-level)

Verified findings worth recording:

- `membershipsTable.companyId` is nullable **and has no `.references()`** —
  platform-admin memberships are intentionally unscoped; no FK to enforce.
- `branchesTable` is a flat list (`id, companyId, name, locale`), no FK to
  `companiesTable`, **no parentId / self-reference**, and is **only** written
  during `createCompany` (`drizzle-company.gateway.ts:117-126`) from
  `CompanyBranchDraft[]`. It is **not read** anywhere except indirectly via
  tests. There is no `branches` API, no `branches` repository port, no UI.
- `AuthCapability` is hardcoded to `catalog.read | catalog.write | catalog.delete`
  and **derived purely from the active membership role** via
  `deriveAuthCapabilities` (`identity/domain/auth.ts:134-159`). Capabilities are
  **not** sticky per membership and **not** affected by any hierarchy level.
- `requireTenantCapability` (`identity/domain/auth.ts:161-182`) returns a single
  `companyId` used as the tenant scope for every catalog operation. This is the
  central assumption the hierarchy challenge must preserve.
- Every catalog/audit operation threads `companyId` through the use-case →
  gateway boundary by hand (no row-level security, no implicit tenant context).
- Catalog scoping is **defensive and redundant**: `drizzle-item.gateway.ts`
  both filters `WHERE companyId = ?` in SQL *and* re-filters in TS via
  `normalizeItemRows(rows, companyId)`. Adding a hierarchy dimension means both
  gates must stay aligned.
- Migrations: Drizzle Kit, 12 generated migrations in
  `apps/api/src/db/migrations/` (0000–0011), config at
  `apps/api/drizzle.config.ts`. No hand-written SQL EDITs — purely generated.
- Frontend routing is a static `<Routes>` tree in `apps/web/src/app/app.tsx`
  (no lazy loaders; each route component re-resolves auth via `useAuth`).

---

## Impact Analysis — Org Hierarchy

### 1. Schema (`apps/api/src/shared/infrastructure/db/schema.ts`)

Tables that reference `companyId` directly today:

| Table | FK? | Hierarchy relevance |
|---|---|---|
| `membershipsTable` | no FK | **Central**: must gain a scoping dimension (division/local). |
| `companyProfilesTable` | PK=companyId | Stays company-level. |
| `companyServicesTable` | no FK | Stays company-level (services apply to the whole company). |
| `branchesTable` | no FK | **Candidate to become `locals`** (or be superseded). |
| `userPreferencesTable.activeCompanyId` | FK | Active-company switcher — must decide if a user now switches on a `local/division` axis too. |
| `themePreferencesTable.companyId` | no FK | Per-user palette; stays as-is. |
| `notificationsTable.companyId` | no FK | Stays company-level (admin broadcast channel). |
| `auditEventsTable.companyId` | no FK | **Subtle**: audit could optionally record a finer scope, but `companyId` MUST remain for cross-cutting queries. Add nullable `divisionId`/`localId`. |
| `provisioningRunsTable` / `provisioningStepsTable` | no companyId column directly (only `companyName` + `actorUserId`) | Unaffected. |
| `applicationErrorsTable` | no companyId | Unaffected. |
| `itemCategoriesTable.companyId` | FK | **Key decision**: does a category live at company, division, or local scope? |
| `itemsTable.companyId` | FK | Same decision as categories. |

New tables required (whichever model wins, see *Approaches*):

- A `divisions` table scoped to `companyId`.
- Either a `locals` table reusing/replacing `branches`, with a nullable
  `divisionId` (locals can sit under company *or* a division).

### 2. Auth & Membership Flow

Files affected:

- `apps/api/src/features/identity/domain/auth.ts`
  - `AuthMembership` gains `divisionId?: string | null` and/or `localId?: string | null`.
  - `authSessionSchema` Zod (`auth.router.ts:36-57`) must mirror this.
  - `deriveAuthCapabilities` and `requireTenantCapability` decide where the
    tenant scope lives: still `companyId` only, or company + optional local/division.
- `apps/api/src/features/identity/application/resolve-auth-session.ts`
  - `resolveActiveCompany` picks one membership; logic must handle a finer axis
    if we let users pick an active local/division, or stay company-only and let
    the active local be a separate preference.
- `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts`
  - `listMemberships`, `findActiveCompanyId`, `setActiveCompanyId` must read/
    write the new columns (if membership gains scope) — or the new
    `activeLocalId`/`activeDivisionId` preferences if we keep membership at
    company scope.
- `apps/api/src/features/identity/presentation/auth.middleware.ts` and
  `auth.router.ts` — `authSessionSchema` and the `createRequireRole` machinery
  unchanged in shape, but the serialized session grows new fields.

Decision gate: **two viable membership models** (see *Approaches*).

### 3. Provisioning Flow

- `apps/api/src/features/companies/application/create-company.ts`
  - `createPayloadFingerprint` (lines 12-35) currently fingerprints `branches`.
    Must fingerprint the new hierarchy drafts; an **idempotency-key reuse**
    across payload shapes is a real risk — a replay of an old onboarding request
    must not collide with the new payload signature.
- `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts`
  - `createCompany` transaction (lines 47-205) inserts `branches`. Must insert
    `divisions` and `locals` (or whatever the model names them) inside the same
    transaction so a partial hierarchy insert can't dangle.
- `apps/api/src/features/companies/infrastructure/drizzle-provisioning.recorder.ts`
  - Step names (`'company-creation'`) and `payloadFingerprint` are stored in
    `provisioningSteps.detail`. New provisioning steps like
    `'hierarchy-seed'` should be considered so partial failures are
    individually traceable.
- Onboarding domain (`apps/web/src/features/onboarding/domain/onboarding.ts`)
  - `OnboardingDraft` has no hierarchy fields. If seed divisions/locals are
    captured at onboarding, the draft + `onboardingSteps` array + validator
    must grow. **Recommend: defer hierarchy capture out of onboarding v1**
    and allow it post-onboarding; otherwise onboarding grows significantly.

### 4. Admin (`apps/api/src/features/admin/*`)

- `AdminGateway` (`admin/domain/admin.ts:131-148`) and
  `drizzle-admin.gateway.ts` expose company-scoped admin signals. Hierarchy
  does not change the admin *surface* much, but `AdminCompanySignal` should
  optionally surface division/local counts, and admin audit-event filters
  (`AdminAuditEventListFilters.companyId`) stay valid because audit keeps
  `companyId`.
- No UI work beyond listing companies for `platform-admin`, unless we add a
  "view divisions/locals per company" admin page.

### 5. Items & Categories

- `apps/api/src/features/items/domain/item.ts`
  - `Item.companyId` / `ItemCategory.companyId` are the scoping keys.
  - **Decision gate**: keep catalog scoped to `companyId` only (locals share
    the company catalog) **or** optionally scope to a local (each local has its
    own catalog). The backward-compatible default is **company-scoped**.
- `apps/api/src/features/items/infrastructure/drizzle-item.gateway.ts`
  - Every method caps SQL with `eq(itemsTable.companyId, companyId)` and
    re-filters in TS. If we add local-level scoping, both gates need the same
    treatment (or a nullable `localId` filter that defaults to NULL = company-wide).
- Catalog use cases (`list-items.ts`, `get-item.ts`, `soft-delete-item.ts`,
  `create-item.ts`, `update-item.ts`) and their tests must thread the new scope.

### 6. Frontend Routing & UI

- `apps/web/src/app/app.tsx` — static `<Routes>` tree. New routes (if any):
  - `/dashboard/divisions` (list/manage)
  - `/dashboard/locals` (list/manage)
  - Per-company hierarchy tree view (nested) for `company-owner`.
- Route guard components (`ItemsRoute`, `CategoriesRoute`) currently check
  `needsActiveCompanySelection` and `hasBlockedActiveCompany`. A new guard for
  "needs an active local selection" may be needed if local-scoped catalog lands.
- No lazy loaders; each route component re-resolves `useAuth`. Adding routes
  is cheap; adding a hierarchy-scoped active-org picker (like TeamSwitcher but
  for local) is the larger UI lift.

### 7. Frontend Domain & Stores

- `apps/web/src/features/auth/domain/auth.ts` must mirror `AuthMembership`
  changes (nullable `divisionId`/`localId`).
- `TeamSwitcher` currently switches `activeCompanyId` only; if a hierarchy
  axis is selectable, a second switcher (or expanded component) is needed.
- New feature folder `apps/web/src/features/org-hierarchy` (or
  `organizations`) following the screaming-architecture rule for the
  dashboard UI.

### 8. E2E (`e2e/app.e2e.spec.ts`)

- 110 lines, smoke-level (`/dashboard` load, company registration). Hierarchy
  adds scenarios: onboarding with no hierarchy (regression), company → division
  → local creation, switching active local, admin viewing hierarchy. None
  exist today, so we are *adding* coverage, not breaking much.

### 9. Migrations

- Drizzle Kit generated. A single `drizzle-kit generate` after schema changes
  produces migration `0012_*`. Must be **additive only** (new tables, new
  nullable columns) to stay backward compatible — no destructive column drops.
- Existing companies with rows in `branchesTable` must remain valid: either
  reinterpret `branches` as `locals` (company-level, `divisionId NULL`) or
  migrate them.

---

## Impact Analysis — Sidebar Update

The 8 workspace items today:

| Label | href | Status |
|---|---|---|
| Inicio | `/dashboard` | ✅ working |
| Sales | `#sales` | placeholder |
| Compras | `#purchases` | placeholder |
| Items | `/dashboard/items` | ✅ working |
| Categorías | `/dashboard/categories` | ✅ working |
| Produccion | `#production` | placeholder |
| Finanzas | `#finance` | placeholder |
| Proyectos | `#projects` | placeholder |

Files touched:

- `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx`
  (the `workspaceItems` array, lines 38-47; the `isHashLink` gate at line 55).
- `apps/web/src/app/app.dashboard-shell.test.tsx` if it asserts on the sidebar
  tree.
- E2E: `e2e/app.e2e.spec.ts` if it asserts the link set (currently does not).

**Key decision to surface**: "reflect the modules that are currently working"
is ambiguous. Three interpretations:

1. **Hide non-working placeholders** (remove Sales/Compras/Produccion/Finanzas/Proyectos).
2. **Keep them as visible-but-disabled** (no route, disabled state, "coming soon" tooltip).
3. **Keep current behavior** (hash links, non-navigating) — they already "reflect" non-working status by not wiring to a route.

The orchestrator listed all 8 as "confirmed Workspace items", so (1) is
unlikely. The realistic choice is (2) vs (3). This must be confirmed in the
proposal phase — it changes the visual contract and the E2E expectations.

Constraints found while reading the sidebar:

- `isHashLink` is the only filter; `NavLink` vs `<a href>` branching is
  already central. A "disabled" variant would add a third branch.
- `accountItems` and the admin section are unaffected.
- The sidebar reads `session.activeCompany` for the TeamSwitcher; the hierarchy
  change will eventually surface a division/local axis here too.

---

## Approaches (Hierarchy Model)

### A. Adjacency list on `branches` (rename + extend)

Reuse `branchesTable` as `locals`, add nullable `divisionId` referencing a new
`divisions` table, and add nullable `divisionId`/`localId` to `memberships`.

- Pros: Reuses existing table and seed data; minimal schema churn; one entity
  per level; backward compatible by default (NULL division = company-level local).
- Cons: `branches` semantics drift (it already means "local"); no FK to
  companies today so we'd add one; cross-level queries need recursive CTEs for
  arbitrary depth (but depth is fixed at 3, so reachable with joins).
- Effort: Medium.

### B. Single `org_units` adjacency-list table (self-referential)

One `org_units` table with `parentId` self-reference and a `kind`
(company | division | local). Memberships reference `orgUnitId`.

- Pros: Maximally flexible; arbitrary depth; one table to rule them all.
- Cons: Big semantic change; breaks the `companiesTable` identity; every
  company-scoped query now resolves the org-unit path; `requireTenantCapability`
  rewrites; much larger blast radius; **violates the user's explicit
  Company → Division → Local → User model** by allowing unbounded depth.
- Effort: High.

### C. Nested set / materialized path

Encode the full path per node.

- Pros: Cheap descendant queries.
- Cons: Heavy writes on re-parent; overkill for a fixed 3-level hierarchy;
  Drizzle has no first-class support; complexity not justified.
- Effort: High.

### Recommendation

**Approach A (adjacency list, fixed-depth, additive)**. It matches the user's
stated `Company → Division → Local → User` shape exactly, stays backward
compatible (nullable columns mean old rows, old memberships, and old catalog
keep working unchanged), keeps `requireTenantCapability` returning a `companyId`
(true tenant root) while exposing an optional finer scope, and avoids unbounded
depth that would force recursive CTEs across the API.

Concrete shape (to be confirmed in proposal):

- New `divisionsTable`: `id, companyId (FK→companies), name, createdAt`.
- Rename concept `branchesTable` → keep table, add `divisionId` nullable
  (FK→divisions), and treat it as `locals`. `divisionId NULL` = local at
  company level.
- `membershipsTable`: add `divisionId`/`localId` nullable. Company-scoped
  owners keep both NULL.
- `items`/`itemCategories`: **stay company-scoped** for v1 unless proposal
  explicitly decides on local-scoped catalog. This is the single biggest
  scope lever and must be decided in the proposal phase.

---

## Key Architectural Decisions to Surface (Proposal Phase)

1. **Membership scope axis.** Does `AuthMembership` carry `divisionId`/
   `localId` (membership is granted at a level), or do memberships stay
   company-scoped and a *separate* `activeLocalId` preference picks the
   finer scope? The latter is simpler and avoids re-deriving capabilities per
   level; the former matches the "Division → Local → User" phrasing literally.
2. **Catalog scoping.** Does the catalog (items + categories) stay
   company-wide, or does it move to local scope? Company-wide is the
   backward-compatible default and is strongly recommended for v1; local-scoped
   catalog is a much larger change and should be a separate change.
3. **Active-org switcher UI.** Does the sidebar TeamSwitcher grow a second
   axis (active local/division), or is the finer scope auto/implicitly chosen?
   Affects `userPreferencesTable` and the onboarding/landing flow.
4. **Branches → Locals migration.** Reinterpret existing `branches` rows as
   company-level locals (divisionId NULL) — confirm acceptable.
5. **Onboarding capture.** Defer hierarchy capture out of onboarding v1 (seed
   only the company), or extend `OnboardingDraft` and `onboardingSteps` to
   capture seed divisions/locals. Recommend defer.
6. **Idempotency fingerprint.** `createPayloadFingerprint` must include the
   hierarchy drafts; confirm acceptable to break replay-equality across
   onboarding payload shapes that differ only by hierarchy.
7. **Sidebar interpretation.** Confirm whether "reflect working modules"
   means hide, disable, or keep-as-is the 6 hash-link placeholders.

---

## Risk Areas & Migration Considerations

- **Idempotency replay collisions**: same `idempotencyKey` with a
  different `payloadFingerprint` throws `CompanyIdempotencyConflictError`. If
  onboarding schema grows hierarchy fields, old in-flight replays break. Risk
  is contained (idempotency keys are short-lived), but document it.
- **Auth session schema drift**: `authSessionSchema` (Zod) in `auth.router.ts`
  and the web `auth.domain` must both gain the new optional fields in lockstep.
  A missed field silently breaks `/auth/me`. Type system will catch most of it
  but the Zod schema is hand-mirrored.
- **FK gap on memberships**: `membershipsTable.companyId` has no FK today.
  Adding `divisionId`/`localId` as FKs would be stricter than the existing
  pattern. Decision: match existing pattern (no FK) for consistency, or add
  FKs for integrity — surface in proposal.
- **`branches` semantic reuse**: nothing reads `branchesTable` today outside
  `createCompany` and tests, so reinterpreting it as `locals` is low-risk on
  the read path. The one write site (`createCompany`) must change in the same
  transaction.
- **Migration must be additive**: no `NOT NULL` new columns (use nullable +
  default), no dropped columns, no renamed public columns without a migration.
  Existing companies get `divisionId NULL`/`localId NULL` → behave exactly as
  today. This is the heart of the backward-compat guarantee.
- **Test coverage is thin**: only `app.e2e.spec.ts` exists at 110 lines and
  is smoke-level. Hierarchy logic needs unit tests at the gateway and
  resolve-auth-session levels (those gateways already have unit tests; extend
  them) and at least one E2E for "company with no hierarchy behaves as today".
- **React Compiler / hooks**: sidebar and any new switcher component must
  follow the React screaming-architecture rules (no `useEffect` for derived
  state, TanStack Query for server state, Zustand only for client preference
  state like the active-local selection).
- **Monorepo boundaries**: schema lives in `apps/api/src/shared/infrastructure/db`.
  The web `auth.domain` duplicates the `AuthMembership` shape — both must
  move together. No shared package between apps today; this duplication is
  the existing pattern (hand-mirror, not codegen).

---

## Ready for Proposal

Yes — with the 7 decisions above open. The proposal should:

- Pick Approach A and confirm.
- Answer decisions 1–7 (especially catalog scoping #2 and sidebar #7).
- Define the v1 boundary: I recommend *hierarchy shape + memberships + admin
  read* in v1, and *local-scoped catalog + active-local switcher UI* as a
  follow-up change. The sidebar update is a small, separable deliverable that
  can ship in the same change.
- Include a rollback plan (config rule `proposal`):
  - Schema additive only → rollback = drop new nullable columns/tables (safe).
  - Code rollback = revert feature flags / API routes; old sessions still
    resolve because new membership fields default NULL.