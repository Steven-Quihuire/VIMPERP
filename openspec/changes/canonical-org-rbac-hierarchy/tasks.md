# Tasks: Canonical Org Hierarchy and RBAC Scope

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~860 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR-1 → PR-2 → PR-3 → PR-4A → PR-4B (stacked-to-main) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Work Units

| U | Goal | PR | Test | Harness | Rollback |
|---|------|----|------|---------|----------|
| 1 | `scope_nodes`+CHECK+rename | 1 | `migration-0016-...` | dev+pg; CRUD local | drop; rename back |
| 2 | FK+quarantine+resolver | 2 | `drizzle-scope-resolver` | dev; POST deleted; 4xx | drop FK; restore 5 |
| 3 | Active-scope session | 3 | api+web `auth/` | dev; POST `active-scope`; 204 | drop cols; revert |
| 4 | Bootstrap missing areas/warehouses/POS surfaces on existing schema | 4A | focused api+web slice tests | dev; minimal CRUD per surface | revert new feature slices |
| 5 | Single-parent validation | 4B | `areas/warehouses/POS` | dev; POST dual; 400 | drop XOR + conflict surfacing |

## Phase 1 — PR-1: DB Foundation (migration `0016`)

- [x] 1.1 RED `migration-0016-canonical-scope-nodes.test.ts`: `scope_nodes`, triggers, CHECK, partial unique, rename.
- [x] 1.2 Author `0016_canonical_scope_nodes.sql`: projection, `sync_scope_node_*` triggers, CHECK, partial unique, rename.
- [x] 1.3 `schema.ts`: add `scopeNodesTable`, swap `branch`→`local` in enum, rename `branchesTable`→`localsTable`, refresh FK.
- [x] 1.4 `drizzle-kit generate`; verify snapshot + journal.
- [x] 1.5 Codemod 8 `drizzle-*.gateway.ts` consumers + tests.
- [x] 1.6 GREEN: vitest `migration-0016-...` + typecheck.
- [x] 1.7 Add `scope-nodes-parity.test.ts` for row-count parity per node type.

## Phase 2 — PR-2: FK + Quarantine + Resolver (migration `0017`)

- [x] 2.1 RED `migration-0017-role-assignment-scope-fk.test.ts`: FK RESTRICT, quarantine, backfill, audit, live-delete.
- [x] 2.2 Author `0017_role_assignment_scope_fk.sql`: quarantine, paginated backfill, FK + NOT NULL, `audit_events` insert.
- [x] 2.3 `schema.ts`: add `staleRoleAssignmentsTable`; add `scopeNodeId` FK RESTRICT.
- [x] 2.4 RED `drizzle-scope-resolver.test.ts`: single `WITH RECURSIVE`, identical `ScopeRef[]`.
- [x] 2.5 Rewrite `drizzle-scope-resolver.ts`: delete 5 `load*Path`; one recursive read.
- [x] 2.6 GREEN: resolver + `compute-effective-permissions` integration.

## Phase 3 — PR-3: Active-Scope Session (migration `0018`)

- [x] 3.1 RED `migration-0018-session-active-scope.test.ts`: scope cols + lazy backfill.
- [x] 3.2 Author `0018_session_active_scope.sql`: add cols, backfill, drop legacy.
- [x] 3.3 `identity/domain/auth.ts`: `activeScope: ScopeRef | null`; rename gateway methods.
- [x] 3.4 `resolve-auth-session.ts`: resolve `activeScope` lazily; thread ref.
- [x] 3.5 `drizzle-auth.gateway.ts` + tests: new methods.
- [x] 3.6 Rename `/auth/me/active-local`→`/auth/me/active-scope`; body `ScopeRef`; handler rename.
- [x] 3.7 `apps/web/.../auth/domain/auth.ts`: `AuthSession.activeScope: ScopeRef | null`.
- [x] 3.8 Web `auth/{infra,presentation}/*`: `switchActiveScope` posts `ScopeRef`; `Sucursales` preserved.
- [x] 3.9 GREEN: api+web `auth/` + Playwright switcher; typecheck.

## Phase 4A — PR-4A: Missing Surface Bootstrap

- [ ] 4.1 RED: add focused API and web tests proving the clean base lacks `areas`, `warehouses`, and `points-of-sale` surfaces, then specify happy-path CRUD behavior against the already-present tables using valid parent payloads only.
- [ ] 4.2 Implement minimal API vertical slices for `areas`, `warehouses`, and `points-of-sale` on top of existing schema tables: domain types/errors, Drizzle gateway methods, create/list/update/delete use cases, routers, route tests, feature exports, app wiring, and error-middleware mappings for conflict/not-found behavior.
- [ ] 4.3 Implement minimal web vertical slices for `areas`, `warehouses`, and `points-of-sale`: domain/api/query modules, owner-facing management pages/forms, page tests, app route registration, and dashboard sidebar navigation.
- [ ] 4.4 GREEN: focused api+web slice tests and typecheck.

## Phase 4B — PR-4B: Single-Parent Validation and Conflict Surfacing

- [ ] 5.1 RED: invalid-parent fixtures for areas/warehouses/POS in router, use-case, and page tests (zero parent, dual parent, foreign parent).
- [ ] 5.2 Add `ScopeParentConflictError` (`SCOPE_PARENT_CONFLICT`); map to 400.
- [ ] 5.3 Tighten the new request schemas/forms introduced in PR-4A with XOR validation on `localId`/`divisionId` and `localId`/`areaId`; keep happy-path payloads unchanged.
- [ ] 5.4 Update create/update flows to translate existing DB check/FK violations into stable application errors instead of generic 500s.
- [ ] 5.5 Web forms: render inline parent-conflict feedback and disable save when the parent selection is invalid.
- [ ] 5.6 GREEN: tests; `test:coverage` ≥80%; `pnpm build` green. Per-PR: chain context, `Sucursales`, no `branches`. Final: `sdd-archive`.
