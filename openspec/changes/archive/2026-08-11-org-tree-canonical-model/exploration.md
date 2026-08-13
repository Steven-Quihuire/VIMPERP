# Exploration: org-tree-canonical-model

> Source of truth: code/runtime only. Old docs, Engram, and prior OpenSpec
> artifacts (incl. frozen `canonical-org-rbac-hierarchy` and
> `org-hierarchy-sidebar`) are NOT sources of truth and are not continued here.
> This change is intentionally isolated.

## Current State

A canonical organizational tree **already exists at the database layer** and is
**already the RBAC lineage backbone**, but the application and frontend layers
have not been migrated to it and only model 2 of the 6 node types.

### DB canonical model (source of truth)

- `apps/api/src/shared/infrastructure/db/schema.ts`
  - `scopeNodeTypeEnum` (line 69): `['company','division','local','area','warehouse','point-of-sale']` — the **full target tree** already.
  - `scopeNodesTable` (line 270): canonical node table — `id` (composite string PK), `nodeType`, `sourceId`, `companyId`, `parentScopeNodeId` (single self-FK), `name`, `createdAt`. Unique on `(nodeType, sourceId)`.
- `apps/api/src/db/migrations/0016_canonical_scope_nodes.sql`
  - Created `scope_nodes` and 6 trigger functions `sync_scope_node_*` maintaining it AFTER INSERT/UPDATE/DELETE on each source table (companies, divisions, locals, areas, warehouses, points_of_sale).
  - Composite IDs: `company:<id>`, `division:<id>`, `local:<id>`, `area:<id>`, `warehouse:<id>`, `point-of-sale:<id>`.
  - Parent resolution encoded in trigger CASE:
    - company → NULL
    - division → company
    - local → division if `division_id` set else company
    - area → local if `local_id` set else division
    - warehouse → area if `area_id` set else local
    - point-of-sale → area if `area_id` set else local
  - Backfilled `scope_nodes` from existing source rows.
- `apps/api/src/db/migrations/0017_role_assignment_scope_fk.sql`
  - Added `role_assignments.scope_node_id` FK → `scope_nodes.id`, resolved as `scope_type || ':' || scope_id`, dangling rows quarantined into `stale_role_assignments`, then `scope_node_id` made NOT NULL with FK.
  - **RBAC hard-depends on `scope_nodes` existing for every assignment.** The `type:source` ID format is load-bearing.

### Legacy per-table parent model (still present, duplicated)

Source tables still carry per-table bifurcated FK-XOR parent columns:
- `divisions`: companyId only.
- `locals`: `divisionId` nullable FK (root locals = company-level).
- `areas`: CHECK `areas_exactly_one_parent_check` — `divisionId` XOR `localId`; `kind` enum `['area','department']`.
- `warehouses`: CHECK `warehouses_exactly_one_parent_check` — `areaId` XOR `localId`.
- `points_of_sale`: CHECK `points_of_sale_exactly_one_parent_check` — `areaId` XOR `localId`.

→ The DB keeps **two** parent representations: the per-table XOR columns and the
canonical `scope_nodes.parent_scope_node_id` closure. Only the triggers keep them
aligned. No application code writes `scope_nodes` directly.

### Backend application layer (drift)

- `features/org-hierarchy` (apps/api):
  - Domain models **only** `Division` + `Local`; `OrgHierarchyGateway` only CRUDs these.
  - Use cases: `create/list/update/delete-division`, `create/list/update/delete-local`. Nothing for area/warehouse/POS.
  - `presentation/org-hierarchy.router.ts` exposes only `/companies/:companyId/divisions` and `.../locals`.
- `features/roles-management` (apps/api):
  - `domain/assignments.ts` `scopeTypeValues` already lists all 6 `ScopeType` values.
  - `infrastructure/drizzle-scope-resolver.ts` uses a **recursive CTE over `scope_nodes`** to compute lineage — already consumes the canonical tree (read-only), but via raw `db.execute(sql\`...\`)`, not the `scopeNodesTable` Drizzle object.
  - `scope-node-id.ts` mints `type:source` IDs matching the trigger convention.
- `areasTable`, `warehousesTable`, `pointsOfSaleTable` are exported in schema.ts but referenced **only** by `roles-management` test setup. There is **no feature slice** for areas, warehouses, or POS — no use cases, controllers, or routes. From the application's perspective these tables are effectively trigger-only today.
- `scopeNodesTable` is exported but only used as an FK target (`roleAssignmentsTable.scopeNodeId` + self-FK); no use case reads/writes it through the ORM.

### Frontend layer (drift)

- `features/org-hierarchy` (apps/web): domain mirrors backend — only `Division` + `Local`; `OrgHierarchyApi` only lists/CRUDs those; query keys are `divisions` and `locals` only.
- Presentation: `divisions-page`, `locals-page`, `active-local-switcher`, `local-scope-badge`. **No UI** for areas, warehouses, or POS.
- Active scope granularity is `company | local` only:
  - `AuthSession.activeLocalId: string | null` (both api and web `auth` domain). No `activeAreaId`/`activeWarehouseId`/`activePointOfSaleId`.
  - `AuthMembership` carries `divisionId` + `localId` only.
  - `ActiveLocalSwitcher` offers "Nivel empresa" vs a local; no deeper nodes.
- RBAC capability derivation only keys off role + activeCompany; scope refinement by area/warehouse/POS is not modeled.

## Affected Areas

- `apps/api/src/shared/infrastructure/db/schema.ts` — canonical `scopeNodesTable` + `scopeNodeTypeEnum` + the 3 missing-type tables (`areasTable`, `warehousesTable`, `pointsOfSaleTable`); will be read/written through a new feature.
- `apps/api/src/db/migrations/0016_canonical_scope_nodes.sql`, `0017_role_assignment_scope_fk.sql` — load-bearing canonical model; any ID-format or trigger-logic change breaks RBAC.
- `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.ts` + `scope-node-id.ts` — existing canonical-tree reader; candidate to extract into a shared scope-hierarchy port.
- `apps/api/src/features/org-hierarchy/**` — current 2-type slice; either extended or superseded by a new canonical `org-tree` feature.
- `apps/api/src/features/identity/domain/auth.ts` + `application/resolve-auth-session.ts` — `activeLocalId`, `findActiveLocalId`, `findLocalCompanyById`, `setActiveLocalId` would need widening to a generic `ScopeRef` active scope (if in-scope).
- `apps/web/src/features/org-hierarchy/**` — `divisions-page`, `locals-page`, `active-local-switcher`, `local-scope-badge`, `org-hierarchy-queries.ts` (only divisions/locals query keys).
- `apps/web/src/features/auth/domain/auth.ts` + `infrastructure/auth-store.ts` — `AuthSession.activeLocalId`, `AuthMembership` shape, capability derivation.
- `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` — consumes `ActiveLocalSwitcher`.

## Approaches

1. **Expose-and-Formalize (incremental, recommended)** — Treat `scope_nodes` as the canonical **read** tree; add a unified `org-tree` feature (api + web) covering all 6 node types (read tree + CRUD for area/warehouse/POS, reusing existing division/local CRUD); keep source tables + triggers as the sole write/sync path; extend auth session active scope from `activeLocalId` to a generic `activeScope: ScopeRef` (deferred or in-scope per proposal). Do NOT touch the XOR CHECK constraints yet.
   - Pros: lowest risk — RBAC already works on `scope_nodes`, no data migration, ID format untouched, reversible per slice, matches business target.
   - Cons: leaves dual-parent duplication (tech debt) until a later cleanup change; if active-scope widening is in-scope, auth surface grows.
   - Effort: Medium-High.

2. **Full Canonical Migration (single source of truth)** — Replace the XOR parent columns on each source table with a single `parent_scope_node_id` FK; drop the `exactly_one_parent_check` constraints; make `scope_nodes` the only parent model; triggers become identity mirrors or are dropped.
   - Pros: cleanest model, single parent truth, eliminates trigger-sync drift, simpler mental model.
   - Cons: large breaking migration, RBAC re-resolution, session/items re-scoping, rollback hard, breaks any out-of-band tooling; very high blast radius.
   - Effort: High.

3. **Minimal Area/Warehouse/POS CRUD only** — Add CRUD features for the 3 missing node types on top of the existing source-table model (mirroring divisions/locals today); do NOT touch `scope_nodes` exposure or session granularity.
   - Pros: smallest change, no RBAC/session changes, ships the missing CRUD quickly.
   - Cons: does NOT make `scope_nodes` the official model, perpetuates the bifurcated XOR parent duplication, doesn't unify the tree read, active scope stays `company|local` — **fails the "official target model for the full tree" goal**.
   - Effort: Medium.

## Recommendation

**Approach 1 (Expose-and-Formalize).** The canonical `scope_nodes` tree already
exists at the DB level and already backs RBAC (migration 0017 made it load-bearing).
The business target — "official model must support the full tree including area,
warehouse, and point-of-sale" — is satisfied by surfacing that canonical model
through a unified `org-tree` feature end-to-end, **without** a breaking data
migration. The bifurcated XOR parent columns become a known tech-debt duplicate
to be retired by a later isolated cleanup change (Approach 2) once Approach 1 is
shipped and validated. Approach 3 is explicitly rejected because it fails the
business target of a unified official tree model.

Open scope decision for the proposal: whether **active-scope widening**
(`activeLocalId` → generic `activeScope: ScopeRef` covering area/warehouse/POS)
is in-scope for this change or a follow-up. It materially affects auth, items
scoping, the sidebar switcher, and likely pushes the work past the 400-line
review budget → chained PRs.

## Risks

- **Dual-parent drift:** any out-of-band write to a source table bypasses nothing (triggers fire), but any future code that writes `scope_nodes` directly or alters a source table's parent columns outside the trigger contract desyncs the two parent models. The roles-management test setup already inserts area/warehouse/POS rows directly — triggers cover it today, but no domain model guards the invariants.
- **RBAC hard dependency on `scope_nodes` IDs and parent links** (migration 0017 NOT NULL FK). Changing ID minting or parent rules orphan existing role assignments → quarantine. The `type:source` format is load-bearing.
- **Removing the XOR CHECK before `scope_nodes` is authoritative** breaks the only hard invariant guarding parent exclusivity. Only safe under Approach 2 after migration.
- **`scopeNodeTypeEnum` uses `'point-of-sale'` (hyphenated)** — not a valid JS identifier; API/domain TS types must use a normalized alias while the SQL enum string stays hyphenated.
- **Active-scope widening blast radius** — `AuthSession.activeLocalId` is consumed by identity (resolve-auth-session), auth-store, sidebar, items scoping, and capability derivation. Widening to a generic `ScopeRef` is its own multi-slice sub-project; folding it in risks exceeding the 400-line budget.
- **No existing CRUD for area/warehouse/POS** — the proposal must decide feature boundary (new unified `org-tree` feature vs extend `org-hierarchy`); the canonical-tree reader in roles-management should be extracted into a shared port to avoid duplication.
- **Migration journal gap:** migrations jump 0014 → 0016 (0015 absent from listing). Verify journal integrity (`meta/_journal.json`) before building on top — out of scope for explore, flag for proposal.
- **Recursive CTE depth** — fine today (max depth ≤ 4: company→division→local→area→warehouse/POS), but if nesting rules ever change, lineage cost grows trivially.
- **Frontend test surface** — `divisions-page`/`locals-page` already have tests; new tree UI + active-scope switcher will need parallel coverage, affecting delivery size.

## Ready for Proposal

**Yes.** Orchestrator should tell the user:

The canonical org tree (`scope_nodes`, covering all 6 node types) already exists
at the DB level and already backs RBAC. The proposal will formalize it as the
**official** org-tree model surfaced through API + web, adding area/warehouse/
point-of-sale surfaces, **without** a breaking data migration. Two decisions are
needed before proposal:

1. **Active-scope widening**: should `AuthSession.activeLocalId` be promoted to a
   generic `activeScope: ScopeRef` (any node type) inside this change, or in a
   follow-up? This materially changes auth, items scoping, sidebar UI, and the
   400-line review budget.
2. **Feature boundary**: new unified `org-tree` feature (recommended) vs extending
   the existing `org-hierarchy` feature to all 6 types.

Also flag for proposal: verify migration journal integrity (0015 gap) and decide
whether to extract the roles-management scope resolver into a shared
`scope-hierarchy` port.