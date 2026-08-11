# Design: Canonical Org Hierarchy and RBAC Scope

## Technical Approach

Project entity rows into a trigger-maintained `scope_nodes` table; use it for FK-backed `role_assignments` and one recursive lineage read. Ship as 5 PRs (stacked-to-main) under the 800-line review budget, isolating rename, FK, session, missing-surface bootstrap, and one-parent hardening work. DB integrity moves from app to DB via CHECK + partial unique indexes. Three migrations (`0016`/`0017`/`0018`); PR-4A/PR-4B are code+test only on top of already-existing tables.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Projection | Trigger-maintained `scope_nodes` | Zero drift; no CRUD coupling |
| Resolver | Single `WITH RECURSIVE` → `ScopeRef[]` | One round-trip; replaces 220-line switch |
| `scope_id` | `role_assignments.scope_node_id` FK (RESTRICT) | Spec locks RESTRICT; quarantine handles dangling |
| Quarantine | `stale_role_assignments` + one `audit_events` row | DB safety; ops can replay or purge |
| Rename | `ALTER TABLE ... RENAME` + drizzle rename | Locks diff and meta snapshot |
| Scope ref shape | All `ScopeType` use string `scopeId`; no `null` | Companies are canonical nodes; spec mandates one per company/division/local/area/warehouse/POS |
| Local naming | `scopeType: 'local'` end-to-end (no `branch`) | Spec `org-hierarchy` mandates `local`/`locals` rename |
| Session | `activeScope: ScopeRef \| null` replaces `activeLocalId` | Spec locks typed ref; lazy backfill on first read |
| Active-scope route | `POST /auth/me/active-scope` accepts `ScopeRef` | Spec owns the active-scope contract; aligned, not deferred |
| One-parent | DB CHECK XOR mirrored in zod | DB integrity; zod returns 400 |
| PRs | 5 stacked-to-main, independently revertible | Honest review budget; isolates risk per slice and separates missing-surface bootstrap from validation hardening |

## Data Flow

```
Entity CRUD → sync_scope_node_<type>() trigger → scope_nodes
   ├── role_assignments.scope_node_id        → FK (RESTRICT)
   └── getScopeLineage() [WITH RECURSIVE] → ScopeRef[] → compute-effective-permissions
```

## Sequence Diagram: Migration Backfill + Quarantine (PR-2)

```
migrator     postgres    audit_events   stale_role_assignments
   │            │             │                 │
   │ BEGIN      │             │                 │
   │─SELECT────►│             │                 │
   │◄─dangling  │             │                 │
   │─INSERT────►│─────────────┼────────────────►│
   │─DELETE────►│             │                 │
   │─INSERT────►│────────────►│                 │
   │─UPDATE────►│             │                 │
   │─FK + NOT NULL            │                 │
   │ COMMIT     │             │                 │
   │─parity CI─►│             │                 │
   │◄─rows match│             │                 │
```

## File Changes

| File | PR | Action |
|------|----|--------|
| Migrations `0016/0017/0018` + tests | 1,2,3 | `scope_nodes` + 6 sync triggers; CHECK + partial unique indexes; `branches`→`locals` rename; `role_assignments.scope_node_id` FK + `stale_role_assignments` |
| `schema.ts` + `drizzle-scope-resolver.ts` + test | 1,2 | `scopeNodesTable`/`staleRoleAssignmentsTable`; `branchesTable`→`localsTable`; 5 `load*Path` → 1 `WITH RECURSIVE` |
| `branchesTable` consumers in 8 `apps/api/src/features/*` folders | 1 | Codemod to `localsTable` |
| `apps/api/src/features/{areas,warehouses,points-of-sale}/{domain,application,infrastructure,presentation}/*` | 4A,4B | PR-4A bootstraps full CRUD slices on existing tables; PR-4B adds parent-validation/error translation |
| `apps/api/src/features/identity/{domain,application,infrastructure}/*` + router | 3 | `activeScope` replaces `activeLocalId`; lazy backfill; route `/auth/me/active-local` → `/auth/me/active-scope` accepting `ScopeRef` |
| `apps/web/src/features/auth/*` | 3 | `AuthSession.activeScope`; `switchActiveScope` posts `ScopeRef`; `Sucursales` preserved |
| `apps/api/src/app/create-app.ts`, `apps/api/src/shared/presentation/error.middleware.ts` | 4A,4B | Wire new routers in PR-4A; add 400 parent-conflict mapping in PR-4B |
| `apps/web/src/features/{areas,warehouses,points-of-sale}/{domain,application,infrastructure,presentation}/*` | 4A,4B | PR-4A adds management pages/forms/routes; PR-4B adds invalid-parent UX |
| `apps/web/src/app/app.tsx`, `apps/web/src/features/dashboard/presentation/dashboard-app-sidebar.tsx` | 4A | Register routes and navigation for the new pages |
| Test fixtures (both apps) | 1,3,4A,4B | Replace `activeLocalId`; add happy-path bootstrap fixtures in PR-4A and invalid-parent fixtures in PR-4B |

## Interfaces / Contracts

```ts
type ScopeType = 'company' | 'division' | 'local' | 'area' | 'warehouse' | 'pos';
// All scope types carry a canonical scope_node_id — company included.
type ScopeRef = { scopeType: ScopeType; scopeId: string };

type AuthSession = {
  user: PublicAuthUser;
  memberships: AuthMembership[];
  activeCompany: ActiveCompany | null;
  activeScope: ScopeRef | null;        // replaces activeLocalId
  capabilities: string[];
  effectivePermissions?: string[];
};

class ScopeParentConflictError extends Error { readonly code = 'SCOPE_PARENT_CONFLICT'; }
```

`POST /auth/me/active-scope` body is `ScopeRef`; web client translates branch selections to `{ scopeType: 'local', scopeId }`. `Sucursales` UI label preserved.

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Migration | Parity + CHECK + rename (PR-1); backfill + quarantine + audit + FK RESTRICT (PR-2); session backfill (PR-3) | `applyMigrationsThrough` + raw SQL in `migration-0016/0017/0018.test.ts` |
| Unit | Resolver lineage per `node_type`, chains up to 5 deep | `drizzle-scope-resolver.test.ts` vs Vitest + pg container |
| Integration | CRUD maintains `scope_nodes`; lazy backfill; PR-4A happy-path CRUD on valid parents; PR-4B invalid-parent 400 + error translation; widened body | Existing router test pattern + new use-case tests |
| E2E | `Sucursales` switcher round-trips; role visibility respects scope | Playwright (existing `playwright.config.ts`) |
| Coverage | 80% on touched files (per `openspec/config.yaml`) | `pnpm --filter api test:coverage` |

## Threat Matrix

N/A — no shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. HTTP changes are route rename + body widening.

## Migration / Rollout

Chain order: PR-2 depends on `scope_nodes` from PR-1; PR-3 reads `activeScope` end-to-end; PR-4A bootstraps missing areas/warehouses/POS surfaces on top of already-existing tables; PR-4B hardens single-parent validation and UX on those new slices. Triggers land with `scope_nodes`; production never sees an empty projection. PR-2 backfill paginates by `userId`. PR-3 keeps legacy `AuthSession.activeLocalId` for lazy backfill on first read. PR-4A and PR-4B add no new migrations on the real base.

Rollback per PR: PR-1 drop triggers + `scope_nodes`; reverse rename. PR-2 drop FK; restore polymorphic `scope_id`; rehydrate from `stale_role_assignments`; restore 5 `load*Path`. PR-3 drop `activeScope`; restore `AuthSession.activeLocalId` and route `/auth/me/active-local`. PR-4A removes the new areas/warehouses/POS surface slices and their route wiring. PR-4B re-loosens parent validation/error translation and UI conflict feedback.

## Open Questions

None.

## Next Step

Ready for `sdd-tasks`. Tasks MUST group by PR, sequence migrations (`0016`→`0017`→`0018`), and bootstrap the test runner first.
