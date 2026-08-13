# Design: Org Tree Canonical Model

## Technical Approach

Make `scope_nodes` the **official read tree** by extracting the recursive-CTE
resolver in `roles-management` into a shared `ScopeResolver` port, introducing a
new `org-tree` feature (api + web) over that port for all six node types,
formalising role↔scope semantics with an `assignment_mode` column on
`role_assignments` (`subtree_inclusive` default, `exact_node` opt-in), and
widening `AuthSession.activeLocalId` → typed `activeScope: ScopeRef` with lazy
backfill. DB foundation (0016/0017) stays untouched; ONE additive nullable
migration `0018_role_assignment_mode.sql` carries the mode column. Ship as a
chained pair of stacked PRs (Target ≤400 changed lines each).

## Architecture Decisions

### Decision 1: Shared `ScopeResolver` port over two private CTEs

| Option | Tradeoff | Decision |
| --- | --- | --- |
| Keep `drizzle-scope-resolver.ts` inside `roles-management` and duplicate the recursive CTE for `org-tree` | Two copies of identical SQL, risk drift, no single authority on lineage | **Reject** |
| Extract into `apps/api/src/shared/infrastructure/scope-hierarchy/`; both `org-tree` and `roles-management` depend on the port | One port, both adapters point at the same Drizzle impl, blast radius bounded by the port | **Choose** |

Port shape:

```ts
type ScopeResolver = {
  getLineage: (companyId: string, scope: ScopeRef) => Promise<ScopeRef[]>;
  isAuthorized: (companyId: string, userId: string, scope: ScopeRef) => Promise<boolean>;
  listAuthorizedDescendants: (companyId: string, scope: ScopeRef) => Promise<ScopeRef[]>;
};
```

### Decision 2: Model `subtree_inclusive` (default) vs `exact_node` per assignment

| Option | Tradeoff | Decision |
| --- | --- | --- |
| Encode on the **role** (catalog-wide) — role definitions include scope breadth | Couples role definition with scope geography (SAP legacy); violates our modified spec ("role definitions MUST NOT encode scope breadth") | **Reject** |
| Encode per **assignment** with a pgEnum `role_assignment_mode` column, default `subtree_inclusive` | Matches spec wording, lives where the assignment lives, additive nullable column makes migration safe | **Choose** |
| Encode as derived (deepest node wins) — no column, compute from sibling/lineage | Ambiguous when a user has 2 assignments on the same role at different nodes; unobservable in audit logs | **Reject** |

ERP alignment — SAP (authorization object with org-level ranges) and
Dynamics 365 (BusinessUnit + Position + Scope — assignment-level) both store
breadth at the assignment edge, not on the role catalogue. The assignment
becomes the atom of "where + how-wide", which is exactly the contract our
modified spec mandates ("scope assignments determine where; subtree-inclusive
assignments expose descendants; exact-node mode may restrict").

Schema (additive; new migration `0018`):

```sql
CREATE TYPE role_assignment_mode AS ENUM ('subtree_inclusive', 'exact_node');
ALTER TABLE role_assignments
  ADD COLUMN mode role_assignment_mode NOT NULL DEFAULT 'subtree_inclusive';
-- existing rows all become 'subtree_inclusive' (default behaviour preserved)
```

The existing `role_assignments_unique_scope_idx` does not need changes —
uniqueness is per assignment, not per mode.

### Decision 3: `activeScope` widening — typed `ScopeRef` with lazy backfill

| Option | Tradeoff | Decision |
| --- | --- | --- |
| Add a generic `activeScope: ScopeRef` next to `activeLocalId`; backfill derives `localId` for legacy clients | Two fields, additive, no consumer breaks during rollout | **Choose** |
| Drop `activeLocalId` immediately and break every consumer | Cleanest surface but rewrites items/sidebar/tests in one PR — pushes past 400-line budget | **Reject** |
| Add only `activeScope` and remove `activeLocalId` lazily behind a flag | Flag lifecycle overhead, releases late the thing people expect | **Reject** |

`AuthSession`:

```ts
type AuthSession = {
  user: PublicAuthUser;
  memberships: AuthMembership[];
  activeCompany: ActiveCompany | null;
  activeScope: ScopeRef | null;          // NEW — six-type
  activeLocalId: string | null;          // legacy, derived
  capabilities: AuthCapability[];
};
```

Backfill: if `activeLocalId` is set and resolves to a `scope_nodes` row with
`node_type='local'`, mirror to `activeScope`. The legacy field stays readable
for items router via a one-line getter.

### Decision 4: Active-scope gateway contract — the `user_preferences` table

`activeScope` persists as a **single nullable scope node id** in a new
`active_scope_node_id text` column on `user_preferences` (0018). One row per
user. Avoids a `jsonb`-of-Shape complexity and respects the relational model
already in use.

## Data Flow

    Browser ──POST /auth/me/active-scope──▶ identity.router
                                              │   scopeResolver.isAuthorized()
                                              │   ↳ rejects out-of-subtree ✓
                                              ▼
                                        user_preferences UPDATE
                                              │
                                              ▼
    GET /auth/me ───┐
                   ├──▶ resolveAuthSession ──▶ lineage(loadByNodeId)
                   │       ├─ activeCompany
                   │       ├─ activeScope ←── user_preferences row
                   │       └─ activeLocalId ← derived (legacy getter)
                   ▼
              AuthSession JSON (Zod schema lockstep)
                   │
                   ▼
          items router reads auth.activeScope
          org-tree UI renders assigned subtree via listAuthorizedDescendants

## File Changes

| File | Action | Description |
| --- | --- | --- |
| `apps/api/src/shared/infrastructure/scope-hierarchy/drizzle-scope-resolver.ts` | Create | Promote current resolver to shared module; expose `getLineage`, `isAuthorized`, `listAuthorizedDescendants` |
| `apps/api/src/shared/infrastructure/scope-hierarchy/scope-hierarchy.port.ts` | Create | Port TS interface, framework-agnostic |
| `apps/api/src/features/org-tree/**` | Create | New vertical slice (domain/application/infrastructure/presentation) over the shared port |
| `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.ts` | Modify | Delegate to the shared module; delete the raw CTE here |
| `apps/api/src/features/identity/domain/auth.ts` | Modify | Add `ScopeRef` to AuthSession as `activeScope`; keep `activeLocalId` |
| `apps/api/src/features/identity/application/resolve-auth-session.ts` | Modify | Resolve `activeScope` via `ScopeResolver.getLineage`; backfill legacy field |
| `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts` | Modify | Add `findActiveScopeNodeId` / `setActiveScopeNodeId`; legacy `setActiveCompanyId` clears BOTH columns |
| `apps/api/src/features/identity/presentation/auth.router.ts` | Modify | New `POST /auth/me/active-scope` using the same authorization pattern as the local switcher; Zod schema gains `activeScope` |
| `apps/api/src/db/migrations/0018_role_assignment_mode.sql` | Create | Add `role_assignment_mode` enum + `role_assignments.mode` column; add `user_preferences.active_scope_node_id` column |
| `apps/web/src/features/org-tree/**` | Create | Mirror api slice; React-Query `useOrgTree`, `useAuthorizedDescendants` |
| `apps/web/src/features/auth/domain/auth.ts` + `infrastructure/auth-client.ts` | Modify | Mirror API shape; `useSwitchActiveScope` mutation invalidates items/categories/orgTree |
| `apps/web/src/features/org-hierarchy/presentation/active-local-switcher.tsx` | Modify | Rename to `active-scope-switcher`; render assigned subtree, not just locals |
| `openspec/specs/org-tree/spec.md` (already exists) | None | Already aligned — no delta beyond what exploration already produced |
| `openspec/specs/identity-access/spec.md` | Verify | Already-aligned delta in this change |

## Interfaces / Contracts

```ts
// domain/org-tree (apps/api)
export type ScopeNodeKind =
  | 'company' | 'division' | 'local'
  | 'area' | 'warehouse' | 'point-of-sale';

export type OrgTreeNode = {
  ref: ScopeRef;
  parentRef: ScopeRef | null;
  companyId: string;
  name: string;
};

// application/org-tree (apps/api)
export type ListOrgTreeInput = {
  companyId: string;
  actorUserId: string;
};

// domain/assignments (apps/api) — already exists; widened
export const assignmentModeValues = ['subtree_inclusive', 'exact_node'] as const;
export type AssignmentMode = (typeof assignmentModeValues)[number];

export type RoleAssignment = {
  /* …existing fields… */
  mode: AssignmentMode;   // NEW
};

// presentation/auth.router.ts (apps/api) — switch endpoint
const switchActiveScopeBodySchema = z.object({
  scope: z.object({
    scopeType: z.enum(scopeTypeValues),
    scopeId: z.string().min(1),
  }),
});
```

`exact_node` semantics (definition, becomes a contract requirement for
`compute-effective-permissions`):

- An assignment with `mode = 'exact_node'` is eligible **only** when the
  active `ScopeRef` keys match exactly (same `type:source` ID).
- An assignment with `mode = 'subtree_inclusive'` is eligible when the
  assignment's `ScopeRef` is contained in the lineage of the active
  `ScopeRef` (current behaviour — unchanged).

## Testing Strategy

| Layer | What to test | Approach |
| --- | --- | --- |
| Unit (api) | `isAuthorized` honours `assignmentModeValues`; `subtree_inclusive` matches lineage containment; `exact_node` rejects descendants | Vitest, in-memory fake resolver + assignment fixtures |
| Unit (api) | `resolveAuthSession` backfills `activeScope` from `activeLocalId` and clears the legacy when out-of-scope | Replace `authIdentityGateway` with fake; assert both fields |
| Integration (api) | `POST /auth/me/active-scope` rejects unauthorised nodes via the shared `ScopeResolver`; lockstep Zod ↔ web `auth` schema accepts `activeScope` | Supertest + drizzle against migrate-tested DB |
| Integration (api) | `0018_role_assignment_mode` default-fills existing rows as `subtree_inclusive`; new `exact_node` blocks descendant access | Migration test helpers — pattern from `0017` test file |
| E2E (web) | Sidebar switcher navigates warehouses / POS without leaving the auth page; `useSwitchActiveScope` invalidates items/categories/orgTree | Playwright |
| Coverage | ≥80% on the final PR per `openspec/config.yaml` `verify.coverage_threshold` | V8 via `pnpm --filter api test:coverage` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file
classification, or process-integration boundary is touched. Layered validation
+ tests above are sufficient.

## Migration / Rollout

| Step | Action | Reversible? |
| --- | --- | --- |
| 1 | Merge the additive `0018_role_assignment_mode.sql` (enum + nullable-ish default column + `user_preferences.active_scope_node_id` column) | Yes — `DROP COLUMN` + `DROP TYPE` |
| 2 | Ship the shared `ScopeResolver` port alongside the existing private CTE; both implementations present | Yes — revert the wiring |
| 3 | Make `roles-management` delegate to the shared port; remove its private CTE | Yes — restore file from git |
| 4 | Land `org-tree` feature slices (api + web) | Yes — remove folder |
| 5 | Widen `AuthSession.activeScope` behind the additive column; keep legacy `activeLocalId` derived | Yes — nullify only |
| 6 | Switch the sidebar to a 6-type `ActiveScopeSwitcher` | Yes — restore `ActiveLocalSwitcher` |

Two PRs (≤400 changed lines each):

- PR-1: migration 0018 + shared port + `org-tree` read tree + sidebar hook
- PR-2: `activeScope` widening + `/auth/me/active-scope` route + E2E coverage

Feature flag: none required; the additive column provides the safety net. Old
clients that ignore `activeScope` still resolve `activeLocalId` correctly.

## Open Questions

- [ ] Confirm with product whether `activeScope = 'company'` (the company
      root) is selectable from the switcher, or only rendered as the
      default "Nivel empresa" entry. Default proposal: render as a
      sentinel entry that maps to `{ scopeType: 'company', scopeId: companyId }`.
- [ ] Confirm whether the audit event `auth.active_scope_switched` should
      replace `auth.active_company_switched` for non-company switches, or
      coexist. Default proposal: emit both event types but alias
      `targetScope`/`targetLocal` in details.
