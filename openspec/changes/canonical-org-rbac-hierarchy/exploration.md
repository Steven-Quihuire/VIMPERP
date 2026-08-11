# Exploration: Canonical Org Hierarchy and RBAC Scopes

## Current State

Vimcore is a pnpm/Turbo monorepo: `apps/api` (Express 5 + Drizzle + PostgreSQL) and `apps/web` (React 19 + TanStack Query). Every feature follows domain/application/infrastructure/presentation vertical slices.

### The org tree today (DB)
A fixed 5-level model encoded as **separate tables with explicit nullable parent FKs per entity**, NOT a generic node tree:

`companies → divisions → branches (locals) → areas (kind: area|department) → warehouses | points_of_sale`

- `divisionsTable`(company, name) — `schema.ts:105`
- `branchesTable`(companyId, divisionId?, name, locale) — `schema.ts:340`. **Storage name is `branches`; every consumer calls it `local`** (`localId` columns, `Local` domain type, `active_local_id`, `/auth/me/active-local`). The only spec (`org-hierarchy`) only governs the `Sucursales` label; storage/contracts keep `branches`/`local`.
- `areasTable`(companyId, divisionId?, localId?, name, kind) — `schema.ts:348`. An area may hang off a **branch OR a division directly** (both nullable, no CHECK enforcing one parent).
- `warehousesTable`(companyId, areaId?, localId?, name) — `schema.ts:398`. May hang off an **area OR a branch** (both nullable, no CHECK).
- `pointsOfSaleTable`(companyId, areaId?, localId?, name) — `schema.ts:424`. Same ambiguous area-vs-branch parentage.

### Hierarchy validity gaps at the DB layer
- **No CHECK constraints enforce single parentage.** A warehouse/POS/area row can have `areaId` and `localId` both set, both NULL, or an inconsistent mix; the DB does not forbid it.
- **Unique indexes over nullable `local_id` do NOT enforce uniqueness when `local_id` IS NULL.** Postgres treats NULLs as distinct in btree unique indexes, so `warehouses_company_local_name_idx(company_id, local_id, name)`, `points_of_sale_company_local_name_idx`, and `areas_company_local_kind_name_idx` all fail to prevent duplicate names for company-level (parentless) rows. Validity is enforced only in application code, not the DB.
- Every node repeats `companyId` redundantly rather than deriving it from its parent; nothing guarantees a child's `companyId` matches its parent's `companyId`.

### RBAC / scope today
The `roles-management` change (in-flight, folder `openspec/changes/roles-management`) shipped three new tables in migration `0014_roles_management.sql`:

- `roles`(companyId, key, name, isSystem) — `schema.ts:175`
- `permissions`(key, family) — `schema.ts:165`
- `role_permissions` join — `schema.ts:195`
- `role_assignments`(companyId, userId, roleId, **scopeType**, **scopeId**) — `schema.ts:214`

`role_assignments.scopeType` is the PG enum `scope_node_type('company','division','branch','area','warehouse','point-of-sale')` and `scopeId` is a free `text` with **NO FK to any node table**. There is no canonical "scope node" model; the `(scopeType, scopeId)` pair is a polymorphic pointer whose referential integrity is enforced **only in application code**.

`ScopeHierarchyGateway` (`domain/assignments.ts:46`) has two methods: `assertScopeRefBelongsToCompany` and `getScopeLineage`. Its Drizzle impl (`infrastructure/drizzle-scope-resolver.ts:201`) hand-walks the tree with a separate `load*Path` function **per entity type** (`loadDivisionPath`, `loadBranchPath`, `loadAreaPath`, `loadWarehousePath`, `loadPointOfSalePath`). Each function reconstructs the lineage imperatively and encodes the area-vs-branch / branch-vs-division branching rules **in TypeScript, not in the DB**. Adding a new node type means adding another hand-written path loader.

Effective permissions: `createComputeEffectivePermissionsUseCase` (`application/compute-effective-permissions.ts`) fetches the active scope lineage, lists the user's assignments, filters to assignments whose scope is in the lineage via `scopeLineageContains` (string-key match, `application/scope-matcher.ts`), and unions the granted permission keys. Inheritance is therefore "an assignment on an ancestor scope applies to the current scope" — but only because the resolver computes the lineage by walking the ad-hoc parent FKs.

### DB ↔ backend ↔ frontend disagreements (the core problem)
1. **Naming schism:** storage = `branches`, contract/domain/SQL columns = `local` (`local_id`, `Local`, `listLocals`, `active_local_id`); UI label = `Sucursales`. Three vocabularies for one concept.
2. **Validity schism:** the DB permits parentage/NULL combinations the application forbids (and vice-versa); the manual resolver is the de-facto source of truth, so a row the DB accepts can be rejected (or silently mis-parented) by the resolver, and a DB-level duplicate-name for parentless nodes is never caught.
3. **Scope schism:** `role_assignments.scopeId` has no FK, so a node can be deleted (area/warehouse/POS) while `role_assignments` rows keep pointing at a now-dangling `scopeId` (no `ON DELETE`), and the resolver only notices at runtime via `ScopeRefDanglingError`.
4. **Session scope vs assignment scope:** `AuthSession` carries `activeCompanyId` + `activeLocalId` only (`web/features/auth/domain/auth.ts`, `schema.ts userPreferencesTable`). The hierarchy has 5 levels but only company + branch are switchable. The connection between assignment scope and active session scope is implicit and not modeled.

### Active related changes
- `openspec/changes/roles-management` (in-flight) — already exploring scoped assignments; its exploration flagged the polymorphic-scope dangling risk and the deferred session-scope expansion. This change is the **structural follow-up**: it does not reinvent roles, it makes the scope target canonical and shared.
- archived `2026-08-05-org-hierarchy-areas-warehouses-pos` — introduced areas/warehouses/POS with the ambiguous nullable-FK pattern; explicitly deferred AuthSession scope and capability changes.

## Affected Areas

- `apps/api/src/shared/infrastructure/db/schema.ts` — `branchesTable`, `areasTable`, `warehousesTable`, `pointsOfSaleTable`, `divisionsTable`, `role_assignments.scopeType/scopeId`, the `scope_node_type` enum. Pivotal: the model of "node" lives here.
- `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.ts` — the per-type `load*Path` lineage reconstruction; becomes EITHER a single generic query OR a thin reader over a canonical node/lineage table.
- `apps/api/src/features/roles-management/domain/assignments.ts` — `ScopeType`, `ScopeRef`, `ScopeHierarchyGateway` contract; the polymorphic `scopeId` shape.
- `apps/api/src/features/roles-management/application/compute-effective-permissions.ts` and `scope-matcher.ts` — depend on `getScopeLineage` output shape.
- `apps/api/src/features/org-hierarchy/` (domain, application, infrastructure `drizzle-org-hierarchy.gateway.ts`) — owns division/branch CRUD; must keep working against the canonical model.
- `apps/api/src/features/{areas,warehouses,points-of-sale,items,employees-management}/` — every node-bearing feature reads/writes parent FKs and `localId`; affected by any parentage constraint tightening.
- `apps/api/src/features/identity/` (`auth.ts`, `resolve-auth-session.ts`, `auth.middleware.ts`) — active scope resolution; ties session scope to the hierarchy.
- `apps/api/src/db/migrations/__tests__/migration-*.test.ts` — next migration test must validate new canonical model + backfill.
- `apps/web/src/features/auth/domain/auth.ts` — `AuthSession.activeLocalId` and the web `ScopeType`/`ScopeRef` mirrors (`features/roles-management/domain/roles.ts`); must stay consistent with backend.
- `apps/web/src/features/{org-hierarchy,areas,warehouses,points-of-sale,roles-management}/` — UI assumes the loose area-or-branch parentage; tightening changes form options.
- `openspec/specs/org-hierarchy/spec.md` — currently only the Sucursales label; will receive the canonical tree contract.
- `openspec/specs/identity-access/spec.md` and the in-flight `roles-management` deltas — must stay non-destructively consistent with a canonical scope target.

## Approaches

### Approach A — Canonical `org_nodes` table + lineage/closure (generic node model)
Introduce a single `org_nodes` table `(id, company_id, node_type, parent_id→org_nodes, name, …)` that materializes every hierarchy node (company/division/branch/area/warehouse/POS), plus a **closure table** `org_node_ancestors(node_id, ancestor_id, depth)` maintained by triggers. Existing entity tables become "typed detail" rows keyed by `node_id`, or are folded in entirely. `role_assignments.scopeId` becomes a real FK to `org_nodes.id`.

- Pros: single source of truth; FK-backed scope integrity (`ON DELETE` works); lineage by closure JOIN (no per-type loader); survives new levels without schema change; matches "explicit scopes + inherited permissions + strong integrity".
- Cons: large destructive migration of the recently-shipped `2026-08-05` hierarchy; every existing feature query selects by explicit FK and must be rewritten; high test-rewrite cost; polymorphic `node_type` reintroduces discriminator logic (but at one table).
- Effort: **High** (high blast radius).

### Approach B — Canonical `scope_nodes` projection table + keep entity tables (additive, recommended)
Keep the existing entity tables (branches/areas/warehouses/POS/divisions) as the typed owners, but add a **derived canonical `scope_nodes` table** `(id, company_id, node_type, entity_id, parent_node_id→scope_nodes, depth)` that holds one row per addressable node, indexed by `(company_id, node_type, entity_id)`. Maintain it via triggers on the entity tables (insert/update parent/soft-delete). Add **CHECK constraints** to entity tables enforcing exactly-one-parent per level and a **partial unique index** `WHERE local_id IS NULL` to actually enforce company-level name uniqueness. `role_assignments.scopeId` migrates to a FK `scope_node_id` (with `ON DELETE CASCADE` for the dangling problem) while keeping `scopeType` as a read-only discriminator.

- Pros: non-destructive — entity tables and their feature CRUD keep working; FK-backed scope integrity solves dangling `scopeId`; lineage becomes a single recursive/recursive-CTE read over `scope_nodes` (delete the 5 `load*Path` functions); fixes the NULL-uniqueness and one-parent gaps at the DB layer; incremental: `roles-management` tables already exist and just gain a real FK. Suits "controlled hierarchical ERP model with strong integrity" without a full rewrite.
- Cons: two writes per node change (entity + scope_node trigger); `scope_nodes` must stay in sync (triggers handle it, but tests must cover drift); an extra table/join in read paths; `node_type` discriminator still exists (but centralized, normalized).
- Effort: **Medium-High** (migration + resolver rewrite + tests), bounded blast radius.

### Approach C — Normalize names + tighten entity FKs only (minimal)
Leave RBAC scope polymorphic, but: rename `branches`→`locals` across storage/contract to kill the naming schism, add CHECK constraints for exactly-one-parent and partial-unique-null indexes, and add a `scope_nodes` **view** (not table) so the resolver can read lineage generically. No FK on `role_assignments.scopeId`.

- Pros: smallest migration; keeps resolver shape; cheap.
- Cons: scope integrity still NOT enforced at the DB (dangling `scopeId` persists; no `ON DELETE`); a view cannot give FK target; the "single source of truth / strong integrity" goal is only half-met. The rename alone is a wide, risky diff with little structural payoff.
- Effort: **Medium** (mostly mechanical risk, low structural gain).

### Approach D — Postgres `ltree` paths on entity tables
Add an `ltree`-typed `path` column to each entity table (and to `role_assignments`) and maintain it on parent change. Lineage = `path @> ancestor::ltree`.

- Pros: native Postgres hierarchy + index support; concise ancestry queries; inherited-scope checks become one operator.
- Cons: `ltree` path strings duplicate and can desync from FKs; node identity still per-table (no single FK target for `scopeId`); label/name safe-path handling in `ltree` is fiddly; less team-portable than a plain closure/projection table; does not by itself enforce one-parent or null-name uniqueness.
- Effort: **Medium** (but solves fewer of the stated goals than B).

## Recommendation

**Approach B** — a derived canonical `scope_nodes` projection table on top of the existing entity tables, with CHECK/partial-unique constraints on the entity tables and an FK-backed `role_assignments.scope_node_id`.

Rationale:
- It directly establishes a **single source of truth for scope** — one addressable row per org node, foreign-keyable from `role_assignments` — which is the unmet requirement. Dangling `scopeId` becomes impossible (`ON DELETE CASCADE` or `RESTRICT` decision surfaced in the proposal).
- It is **additive and non-destructive**: the existing entity features (areas/warehouses/POS/org-hierarchy/items) keep their per-table CRUD and queries; only the resolver is replaced by a single `scope_nodes` read. This keeps the blast radius compatible with stacked-to-main PRs.
- It moves validity into the DB (CHECK constraints + partial unique indexes for NULL-parent rows), closing the DB-vs-backend-vs-frontend disagreement at its source.
- It is the natural structural follow-up to the in-flight `roles-management` change, which left `scopeId` polymorphic on purpose; B is the smallest change that makes that polymorphic pointer referentially safe without renaming `branches` everywhere in the same PR.

### Change-boundary recommendation
Keep this change sharply focused on **scope/hierarchy canonicalization**, not on roles or permissions semantics:
1. **`org-hierarchy` delta** (ADDED/MODIFIED Requirements, non-destructive where possible): define the canonical `scope_nodes` contract, exactly-one-parent rules, lineage semantics, and `role_assignments` scope FK. Owns the "canonical node" definition.
2. **Small additive `identity-access` delta** ONLY if session-scope widening is in scope — otherwise defer the active-scope switcher extension and keep `AuthSession.activeLocalId` unchanged (mirrors the deferred item from the archived change).

Explicitly out of scope to prevent PR explosion:
- Renaming `branches`→`locals` in storage/contracts (defer to a separate naming-only change unless the user demands it here).
- Active-scope switcher UI past company + local (defer).
- Employees feature (already deferred by prior changes).
- Role/permission catalog semantics (owned by the in-flight `roles-management` change).

### Delivery forecast (for sdd-tasks)
This will exceed the 800-line review budget if done as one PR. Recommended stacked-to-main chain:
- **PR-1** (DB foundation): `scope_nodes` table + triggers, entity-table CHECK + partial-unique indexes, migration + migration test, **no behavior change** (resolver still reads old way). Targets main.
- **PR-2** (backend scope FK): migration to add `role_assignments.scope_node_id` FK + backfill; rewrite `drizzle-scope-resolver.ts` to read `scope_nodes`; update resolver tests. Targets main.
- **PR-3** (cross-feature parent validation): tighten area/warehouse/POS create/update use cases to the new one-parent rules; update affected feature tests. Targets main.
- **PR-4** (optional, if in scope): web `scope_node` label/manifest alignment; min web test updates. Targets main.

## Risks
- **Trigger drift:** `scope_nodes` can desync from entity tables if a write path bypasses the trigger (raw SQL, backfill scripts). Mitigation: migration test + a CI invariant query asserting row-count parity per node type.
- **Dangling assignment backfill:** existing `role_assignments.scopeId` rows may point at deleted nodes; the FK migration must delete or quarantine them, and that is a data decision the proposal must surface (CASCADE vs RESTRICT vs null-out).
- **Resolver rewrite breaking compute-effective-permissions:** `compute-effective-permissions` + `scopeLineageContains` depend on lineage shape; changing from per-type arrays to closure rows can change ordering/uniqueness. Mitigation: keep the `ScopeRef[]` output contract identical; cover with the roles-management integration tests.
- **Cross-feature test churn:** tightening one-parent rules may reject previously-valid seeds/fixtures in areas/warehouses/POS/items tests. Mitigation: PR-1 ships no behavior change; the tightening lands in PR-3 with fixture updates in the same slice.
- **Naming vs structure scope creep:** the `branches`/`local`/`Sucursales` schism is tempting to fix here, but bundling a wide rename into this change risks an oversized PR and review confusion. Mitigation: defer rename unless the user explicitly requires it; record as an ADR.
- **Postgres enum evolution:** `scope_node_type` is a PG enum; if a new level is added later it needs `ALTER TYPE`. Mitigation: B's `scope_nodes.node_type` is the discriminator going forward — keep the PG enum frozen and treat new types as data where possible.
- **Change-boundary drift during archive:** if this change also touches `item-catalog` scoping or `roles-management` semantics, the archive deltas become destructive and merge-painful. Mitigation: enforce the single-spec (`org-hierarchy`) owner rule above as a hard boundary; only touch other specs additively.

## Ready for Proposal
**Yes** — but the orchestrator must confirm with the user before `sdd-propose`:
1. **Rename scope:** keep `branches`/`local` storage naming as-is (recommended), or fold the storage rename into this change? (Recommend: keep; separate change.)
2. **Dangling assignment policy on FK migration:** CASCADE (delete stale assignments), RESTRICT (block migration until cleaned), or quarantine (move to a `stale_role_assignments` table)? (Recommend: quarantine + audit, safest for review.)
3. **Session scope widening:** keep `activeLocalId` as-is and defer the switcher (recommended), or extend active-scope to area/warehouse/POS in this change? (Recommend: defer.)
4. **Trigger vs application-maintained `scope_nodes`:** maintain `scope_nodes` with DB triggers (recommended, zero drift) or with application-layer writes in each feature gateway (more explicit, more drift surface)? (Recommend: triggers.)

With those four answers, `sdd-propose` can produce a tightly-bounded proposal scoped to the `org-hierarchy` spec (plus, at most, an additive `identity-access` clause), with the stacked-to-main PR forecast above.