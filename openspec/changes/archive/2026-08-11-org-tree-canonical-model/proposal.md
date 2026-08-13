# Proposal: Org Tree Canonical Model

## Intent

`scope_nodes` already covers all six types (`company`, `division`, `local`, `area`, `warehouse`, `point-of-sale`) and `role_assignments` is FK-bound to it (migrations `0016`/`0017`). Yet the app models only `division`+`local`; the other three have **no use cases, routes, or UI**. Capability eval reads the tree via a raw recursive CTE in `drizzle-scope-resolver.ts`; runtime active scope tops out at `company|local` (`AuthSession.activeLocalId`); ERP rules (authorized-node standing, parent-descendant visibility, operations-on-active-scope, role↔scope semantics) are unformalized. The canonical read tree and the runtime active scope are one `scope_node` reference; formalizing one alone leaves role↔scope half-coupled → one coherent change.

## Scope

### In Scope
- New `org-tree` feature (api + web) surfacing all six types over `scope_nodes` (read tree).
- Shared `ScopeResolver` port replacing the raw CTE in `roles-management/infrastructure/drizzle-scope-resolver.ts`.
- Normative rules: stand on any authorized node; parent sees authorized descendant subtrees; operations MUST execute on the active scope, NOT all visible descendants; warehouse/POS active scope drives operational defaults.
- Widen `activeLocalId` → typed `activeScope: ScopeRef` (six types); lazy backfill.
- ERP role↔scope: roles define capabilities; assignments determine where; subtree-inclusive default, exact-node opt-in per role; switching allowed within assigned scopes only.
- Lockstep API Zod ↔ web `auth` test; verify `meta/_journal.json` (0014→0016 gap).

### Out of Scope
- CRUD/UI lifecycle for area/warehouse/POS → new change `org-tree-lifecycle`.
- Drop XOR `exactly_one_parent_check` (Approach 2 from exploration) → deferred cleanup.
- Role catalog/permission **semantics** → `roles-management`; employee scoping; audit-event semantics.
- Frozen `canonical-org-rbac-hierarchy`, `org-hierarchy-sidebar` NOT reused; self-standing on current runtime.

## Capabilities

### New Capabilities
- `org-tree`: Official six-type canonical read tree over `scope_nodes` via a single `ScopeResolver` port (lineage, exactly-one-parent, parent-descendant visibility); normative requirements for authorized-node standing and operations-on-active-scope. Replaces per-type path loaders and the raw CTE.

### Modified Capabilities
- `identity-access`: "Active Company Context" → "Active Scope Context". `AuthSession.activeScope: ScopeRef` replaces `activeLocalId`; capability eval resolves via `scope_nodes` lineage; switching endpoint accepts only authorized nodes within assigned scopes; warehouse/POS `activeScope` MUST drive operational defaults; operations MUST execute on active scope, NOT all descendants; role↔scope assignments MAY be subtree-inclusive (default) or exact-node per role; backfill MUST preserve `activeLocalId` behavior.

## Approach

**Approach 1 (Expose-and-Formalize)** — DB foundation already landed; **no breaking migration v1**. Build the backend `org-tree` slice (aliasing `'point-of-sale'` to a valid TS id), extract the shared `ScopeResolver` port (`roles-management` delegates the lineage read), widen `apps/api/src/features/identity/{auth,resolve-auth-session,auth.middleware}.ts` to typed `activeScope` with backfill, mirror `org-tree` + `auth` in the web (generalizing the active-local switcher), and add ONE additive nullable migration ONLY if the exact-node marker needs persistence. Stack-PR if changed lines exceed 400. Migrations `0016`/`0017` are already landed — build atop, never reissue; PostgreSQL (Docker Compose) already has trigger support.

## Affected Areas

| Area | Impact |
|---|---|
| `apps/api/src/features/org-tree/` | New |
| `roles-management/infrastructure/drizzle-scope-resolver.ts`, `scope-node-id.ts` | Delegate to `ScopeResolver` |
| `apps/api/src/features/identity/{auth,resolve-auth-session,auth.middleware}.ts` | Typed `activeScope` |
| `apps/web/src/features/{org-tree,auth}/` + `active-local-switcher*` | New + modified |
| `openspec/specs/org-tree/spec.md` (new), `openspec/specs/identity-access/spec.md` (delta) | Spec contract |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| `activeLocalId` consumers break (items, sidebar, capability derivation) | High | Lazy backfill; keep transient during rollout; lockstep test |
| Resolver rewrite breaks `compute-effective-permissions` | Med | Preserve `ScopeRef[]` lineage; integration tests |
| Switcher unauthorized escalation | High | Endpoint verifies node ∈ assigned scopes via `ScopeResolver` |
| Migration journal gap `0014→0016` | Low | Verify `_journal.json` first |
| Warehouse/POS defaults swallowed | Med | Normative + E2E test |

## Rollback Plan

Additive and behavior-flagged; **no destructive migration v1**. Revert `org-tree` folders; rewire `drizzle-scope-resolver.ts` through the prior raw CTE. Identity: keep `activeLocalId` derivable from `activeScope.localId` for reverted clients. Optional additive nullable column: drop only. No data loss; existing sessions keep resolving through legacy `activeLocalId`.

## Success Criteria

- [ ] Single `ScopeResolver` port; no `load*Path`/raw CTE in `roles-management`.
- [ ] User MAY stand on any authorized node; parent sees authorized descendants; operations on active scope only.
- [ ] Warehouse/POS `activeScope` drives operational defaults (tested); switching endpoint rejects out-of-scope nodes (integration test).
- [ ] Typed `activeScope` on `AuthSession`; lockstep Zod/web test green; subtree-inclusive default + exact-node opt-in formalized and tested.
- [ ] `_journal.json` verified before any new migration; `pnpm test` + `pnpm build` green per PR; 80% coverage on the final PR; each PR independently revertible.