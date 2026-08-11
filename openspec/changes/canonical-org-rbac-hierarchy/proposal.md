# Proposal: Canonical Org Hierarchy and RBAC Scope

## Intent

DB, backend, and frontend disagree about the org hierarchy: `branches` storage vs `local` contracts vs `Sucursales` UI; entity tables permit parentage/NULL combinations the application forbids; `role_assignments.scopeId` is polymorphic with no FK so deleted nodes leave dangling assignments; the session carries only `activeCompanyId` + `activeLocalId` despite a 5-level tree. Establish a single source of truth for scope across DB, backend, and frontend, with referentially safe role assignments and a general active-scope session.

## Scope

### In Scope
- Canonical `scope_nodes` projection table (one row per addressable org node) maintained by DB triggers; CHECK constraints enforce exactly-one parent per level; partial unique indexes enforce parentless-name uniqueness
- `role_assignments.scopeId` migrated to FK `scope_node_id`; dangling existing assignments quarantined into `stale_role_assignments` with audit
- `drizzle-scope-resolver.ts` replaced by a single `scope_nodes` lineage read (delete the 5 per-type `load*Path` functions)
- Rename `branches` storage/contracts/SQL → `locals` end-to-end; UI label `Sucursales` unchanged
- Session active scope generalized from `activeLocalId` to a typed canonical scope-node reference (company/division/local/area/warehouse/pos)
- Migration tests + CI parity invariant between `scope_nodes` and entity tables

### Out of Scope
- Role catalog and permission semantics (owned by in-flight `roles-management` change)
- Active-scope switcher UI beyond backend session support
- Employees feature scoping (deferred by prior changes)
- Replacing entity tables with a generic `org_nodes` model (Approach A rejected)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `org-hierarchy`: REPLACE the Sucursal-only-label contract with the canonical `scope_nodes` model — node identity, lineage semantics, exactly-one-parent rules, trigger-maintenance contract, FK-backed `role_assignments` scope, dangling-assignment quarantine, and the `branches`→`locals` storage/contract rename. Remove the existing "SHALL NOT rename" clause.
- `identity-access`: Generalize "Active Company Context" into "Active Scope Context" — session carries a typed canonical scope-node reference; capability checks resolve scope via `scope_nodes` lineage.
- `areas-management`: ADDED single-parent enforcement requirement (exactly one of division or local).
- `warehouses-management`: ADDED single-parent enforcement requirement (exactly one of area or local).
- `points-of-sale-management`: ADDED single-parent enforcement requirement (exactly one of area or local).
- `audit-event-management`: ADDED requirement to capture dangling-assignment quarantine events.

## Approach

Approach B from exploration: derived `scope_nodes` projection on top of existing entity tables, trigger-maintained; FK-backed `role_assignments.scope_node_id`; resolver becomes one closure-style lineage read. Entity CRUD stays additive and non-destructive. Validity moves into the DB via CHECK + partial-unique indexes. Dangling assignments are quarantined and audited, never CASCADE-deleted.

Stacked-to-main delivery (work exceeds the 800-line review budget); three migrations sequence `0016`→`0017`→`0018` and PR-4 is code+test only:
- PR-1 (migration `0016`): DB foundation — `scope_nodes` table + 6 sync triggers, CHECK/partial-unique indexes, `branches`→`locals` rename; no behavior change.
- PR-2 (migration `0017`): `role_assignments.scope_node_id` FK RESTRICT + `stale_role_assignments` quarantine/audit + backfill; resolver rewrite over `scope_nodes`.
- PR-3 (migration `0018`): Session active-scope generalization (api identity + web `AuthSession`); lazy backfill from legacy `activeLocalId`.
- PR-4 (no migration): Cross-feature single-parent validation tightening for areas/warehouses/POS.

## Affected Areas

| Area | Impact |
|------|--------|
| `apps/api/src/shared/infrastructure/db/schema.ts` | `scope_nodes` table, `scope_node_type` enum, CHECK/partial-unique indexes, `branches`→`locals` rename, `role_assignments.scope_node_id` FK |
| `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.ts` | Rewritten: single `scope_nodes` lineage read replaces 5 `load*Path` functions |
| `apps/api/src/features/roles-management/{domain,assignments.ts;application,compute-effective-permissions.ts;scope-matcher.ts}` | `ScopeRef`/gateway anchored to `scope_node_id`; `ScopeRef[]` lineage contract preserved |
| `apps/api/src/features/org-hierarchy/` | CRUD against `locals`; triggers maintain `scope_nodes` |
| `apps/api/src/features/{areas,warehouses,points-of-sale,items,employees-management}/` | Single-parent tightening + rename consumers |
| `apps/api/src/features/identity/{auth.ts,resolve-auth-session.ts,auth.middleware.ts}` | Active scope-general resolution |
| `apps/api/src/db/migrations/0016_canonical_scope_nodes.sql`, `0017_role_assignment_scope_fk.sql`, `0018_session_active_scope.sql` | Added — `0016` (PR-1: `scope_nodes` + 6 sync triggers + CHECK/partial-unique indexes + `branches`→`locals` rename); `0017` (PR-2: `role_assignments.scope_node_id` FK RESTRICT + `stale_role_assignments` + backfill/quarantine/audit); `0018` (PR-3: active-scope session columns + lazy backfill); PR-4 code+test only |
| `apps/web/src/features/auth/domain/auth.ts` | `AuthSession` active scope typed reference |
| `apps/web/src/features/{org-hierarchy,areas,warehouses,points-of-sale,roles-management}/` | Single-parent form options + rename consumers |
| `openspec/specs/{org-hierarchy,identity-access,areas-management,warehouses-management,points-of-sale-management,audit-event-management}/spec.md` | Per Capabilities section |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `scope_nodes`/entity trigger drift | Medium | Migration tests + CI parity invariant query asserting row-count equality per node type |
| Dangling-assignment backfill data loss | Medium | Quarantine + audit (`stale_role_assignments`); never CASCADE; review audit before cleanup |
| Resolver rewrite breaks `compute-effective-permissions` | Medium | Preserve `ScopeRef[]` output contract; cover with `roles-management` integration tests |
| `branches`→`locals` rename width | High | Land in PR-1 as a rename-only slice; codemod-friendly column renames; typecheck + E2E green before PR-2 |
| Cross-feature fixture churn from one-parent tightening | Medium | PR-4 ships fixture updates in the same slice; PR-1 ships no behavior change |
| Session scope generalization breaks active-local semantics | Medium | Encode an active local as the `local` `scope_node`; documented web `AuthSession` migration path |
| Postgres enum evolution for future node types | Low | `scope_nodes.node_type` is the discriminator going forward; keep `scope_node_type` PG enum frozen |
| Change-boundary drift during archive | Medium | Enforce `org-hierarchy` as the single canonical owner; other specs touched additively only |

## Rollback Plan

Each PR is independently revertible (chain targets `main` directly, no long-lived feature branch):
- PR-1: drop `scope_nodes` table + triggers; revert entity CHECK/partial-unique indexes; restore `branches` names via `drizzle-kit generate --drop`.
- PR-2: drop `role_assignments.scope_node_id` FK; restore polymorphic `scopeId`; restore the 5 `load*Path` functions from the prior commit; replay quarantined assignments from `stale_role_assignments` after manual review.
- PR-3: restore `AuthSession.activeCompanyId`/`activeLocalId` shape; revert `resolve-auth-session.ts` to the prior commit.
- PR-4: re-loosen one-parent validation if a fixture cannot be updated.

## Dependencies

- In-flight `openspec/changes/roles-management` — owns role and permission semantics; this change adds the FK and rewrites the resolver only. Coordinate delta specs; do not modify roles semantics.
- `openspec/specs/audit-event-management` — quarantine events MUST fit the existing audit contract.
- PostgreSQL trigger support (already present in the Docker Compose image).

## Success Criteria

- [ ] One `scope_nodes` row per addressable org node; CI parity invariant reports zero drift
- [ ] Live deletion of a scope node with active assignments is rejected via FK RESTRICT; migration quarantines pre-existing dangling assignments; no `ScopeRefDanglingError` is reachable in production
- [ ] `drizzle-scope-resolver.ts` contains a single lineage read; no `load*Path` functions remain
- [ ] No `branches`/`branch` table, column, or contract identifier remains in `apps/api` or `apps/web` source; canonical `local`/`locals` naming adopted end-to-end; legacy `activeLocalId` replaced by `activeScope`; `Sucursales` UI label preserved
- [ ] `AuthSession` carries a typed active scope-node reference; capability checks resolve scope via `scope_nodes`
- [ ] Pre-migration dangling assignments exist only in `stale_role_assignments` with audit events
- [ ] `pnpm test` and `pnpm build` green on each PR; coverage threshold (80%) met on the final PR
- [ ] Each PR in the stacked-to-main chain is independently revertible