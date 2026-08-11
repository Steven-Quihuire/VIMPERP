# Apply Progress: canonical-org-rbac-hierarchy

## Change
- `canonical-org-rbac-hierarchy`

## Mode
- Strict TDD

## Delivery
- Strategy: `auto-chain`
- Chain strategy: `stacked-to-main`
- Current slice: PR-2 correction rerun
- Boundary: tasks `2.1` through `2.6` only
- Out of scope kept out of this rerun: PR-3 active-scope session work and PR-4 single-parent validation work

## Status
- PR-1 foundation retained
- PR-2 FK + quarantine + resolver corrected and re-verified
- PR-2 cleanup continuation removed out-of-slice drift and re-scoped the candidate to backend FK/resolver work only
- PR-2 closure continuation repaired the remaining `branchesTable` → `localsTable` drift in identity/org-hierarchy gateway paths and restored API typecheck coherence
- Active native PR-2 runtime attempt `sha256:1f4c3e870a5c2cf93d88857ffe2a9c6561d0facca2d3ca6a5a6cb836ad23454a` is now settled as `passed`, but the native ledger still requires a maintainer reset before any PR-3 continuation because the bounded changed-line budget remains exceeded

## Completed Tasks
- [x] 1.1 RED `migration-0016-canonical-scope-nodes.test.ts`: `scope_nodes`, triggers, CHECK, partial unique, rename.
- [x] 1.2 Author `0016_canonical_scope_nodes.sql`: projection, `sync_scope_node_*` triggers, CHECK, partial unique, rename.
- [x] 1.3 `schema.ts`: add `scopeNodesTable`, swap `branch`→`local` in enum, rename `branchesTable`→`localsTable`, refresh FK.
- [x] 1.4 `drizzle-kit generate`; verify snapshot + journal.
- [x] 1.5 Codemod 8 `drizzle-*.gateway.ts` consumers + tests.
- [x] 1.6 GREEN: vitest `migration-0016-...` + typecheck.
- [x] 1.7 Add `scope-nodes-parity.test.ts` for row-count parity per node type.
- [x] 2.1 RED `migration-0017-role-assignment-scope-fk.test.ts`: FK RESTRICT, quarantine, backfill, audit, live-delete.
- [x] 2.2 Author `0017_role_assignment_scope_fk.sql`: quarantine, paginated backfill, FK + NOT NULL, `audit_events` insert.
- [x] 2.3 `schema.ts`: add `staleRoleAssignmentsTable`; add `scopeNodeId` FK RESTRICT.
- [x] 2.4 RED `drizzle-scope-resolver.test.ts`: single `WITH RECURSIVE`, identical `ScopeRef[]`.
- [x] 2.5 Rewrite `drizzle-scope-resolver.ts`: delete 5 `load*Path`; one recursive read.
- [x] 2.6 GREEN: resolver + `compute-effective-permissions` integration.

## Correction Outcomes
- Company scope references now use canonical string `scopeId` values (`companyId`) instead of `null` in the PR-2 contract surface.
- `0017_role_assignment_scope_fk.sql` now backfills legacy company assignments to string scope IDs, recreates the role-assignment uniqueness index around the canonical `(company_id, user_id, role_id, scope_type, scope_id)` key, and enforces `scope_id NOT NULL` before the final FK lock-in.
- `drizzle-scope-resolver.ts` now returns canonical company lineage refs as `{ scopeType: 'company', scopeId: companyId }` through the same recursive path used for descendant nodes.
- Unrelated web, identity wiring, items, employees, env/main/e2e drift, archive artifacts, and extra roles-management CRUD/router files were removed from the PR-2 candidate.
- Main-based local verification still needs `0013_daily_clint_barton.sql` and `0014_roles_management.sql` as pre-`0016` migration floor dependencies even though the PR-2 review boundary remains tasks `2.1` through `2.6`.
- Remaining stale `branchesTable` imports/usages in `drizzle-auth.gateway{,.test}.ts` and `drizzle-org-hierarchy.gateway{,.test}.ts` were renamed to `localsTable`, keeping the PR-2 slice aligned with the canonical `local` storage contract introduced in PR-1.
- The native PR-2 attempt was finished with evidence revision `sha256:5de8458079b3878a59179ada391c7c015785712dc0b734bcad0c9706da16ad07`; native status now reports attempt ordinal `2` as `passed` with `decision_required: true` and `next_action: reset` because the bounded changed-line ledger still counts `30005` changed lines against a `300`-line objective cap.

## PR-2 Closure Continuation
### Work Unit Evidence
| Evidence | Value |
|---|---|
| Focused test command and exact result | Safety-net/RED: `pnpm --filter api exec vitest run src/features/identity/infrastructure/drizzle-auth.gateway.test.ts src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts` → exit `1`, `14` failed / `13` passed due stale `branchesTable` references. GREEN after the rename repair: same command → exit `0`, `2` files / `27` tests passed. Supporting PR-2 slice proof: `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0017-role-assignment-scope-fk.test.ts src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts` → exit `0`, `3` files / `6` tests passed. |
| Runtime harness command/scenario and exact result | Native continuation flow reused the open PR-2 attempt instead of starting a new one: `gentle-ai sdd-attempt status --cwd /home/linux/Vimcore --change canonical-org-rbac-hierarchy` first reported active attempt ordinal `2` with `next_action: finish`; `gentle-ai sdd-attempt settle --cwd /home/linux/Vimcore --change canonical-org-rbac-hierarchy --token sha256:1f4c3e870a5c2cf93d88857ffe2a9c6561d0facca2d3ca6a5a6cb836ad23454a ... --outcome passed --evidence-revision sha256:5de8458079b3878a59179ada391c7c015785712dc0b734bcad0c9706da16ad07` recorded the attempt as passed; a follow-up `status` shows ordinal `2` closed as `passed` with `decision_required: true` / `next_action: reset` because the bounded ledger still exceeds the objective changed-line budget. |
| Rollback boundary | Revert only `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts`, `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.test.ts`, `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`, and `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts` to restore the pre-closure stale references without disturbing the rest of the PR-2 FK/resolver slice. |

### TDD Cycle Evidence
| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| PR-2 closure coherence repair | Updated the auth/org-hierarchy gateway tests to the canonical `localsTable` contract first, then ran `pnpm --filter api exec vitest run src/features/identity/infrastructure/drizzle-auth.gateway.test.ts src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts`; the suite failed `14` tests because production gateways still imported `branchesTable`. | Renamed the gateway imports/usages to `localsTable`, reran the same focused Vitest command (`2` files / `27` tests passed), reran the PR-2 focused slice (`3` files / `6` tests passed), and reran `pnpm --filter api typecheck` (exit `0`). | Refactor stayed rename-only: no new behavior was introduced beyond restoring local-table symbol coherence with the PR-1 canonical rename. |

## Work Unit Evidence
### Work Unit 1 — `scope_nodes` + CHECK + rename
| Evidence | Value |
|---|---|
| Focused test command and exact result | Prior PR-1 focused verification already recorded in Engram apply-progress revision 2: `pnpm --filter api test -- src/db/migrations/__tests__/migration-0016-canonical-scope-nodes.test.ts src/db/migrations/__tests__/scope-nodes-parity.test.ts ...` → exit 0, `61` files / `301` tests passed |
| Runtime harness command/scenario and exact result | Prior PR-1 harness already recorded in Engram apply-progress revision 2: Docker Postgres + focused gateway checks + `pnpm --filter api typecheck` → exit 0 |
| Rollback boundary | Revert `0016_canonical_scope_nodes.sql`, related `schema.ts` projection changes, and bounded `branches`→`locals` consumer updates from PR-1 |

### Work Unit 2 — FK + quarantine + resolver
| Evidence | Value |
|---|---|
| Focused test command and exact result | `pnpm --filter api exec vitest run src/db/migrations/__tests__/migration-0017-role-assignment-scope-fk.test.ts src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts src/features/companies/infrastructure/drizzle-company.gateway.test.ts` → exit 0, `3` files / `6` tests passed |
| Focused typecheck command and exact result | Not rerun in the cleanup continuation; prior correction rerun typecheck still applies because this batch only removed out-of-slice files and preserved the same PR-2 backend codepaths |
| Runtime harness command/scenario and exact result | Not rerun in the cleanup continuation; prior correction rerun runtime migrate evidence remains the last runtime proof for `0017_role_assignment_scope_fk.sql` |
| Rollback boundary | Revert `apps/api/src/db/migrations/{0013_daily_clint_barton.sql,0014_roles_management.sql,0016_canonical_scope_nodes.sql,0017_role_assignment_scope_fk.sql}`, `apps/api/src/db/migrations/meta/0017_snapshot.json`, `apps/api/src/shared/infrastructure/db/schema.ts`, `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts`, and `apps/api/src/features/roles-management/{domain/assignments.ts,domain/permissions.ts,domain/roles.ts,application/current-context.ts,application/scope-matcher.ts,application/compute-effective-permissions.ts,infrastructure/scope-node-id.ts,infrastructure/drizzle-assignments.gateway.ts,infrastructure/drizzle-roles.gateway.ts,infrastructure/drizzle-scope-resolver.ts}` plus the focused verification tests |

## TDD Cycle Evidence
| Task | RED | GREEN | REFACTOR |
|---|---|---|---|
| 1.1 | `migration-0016-canonical-scope-nodes.test.ts` failed before `0016` existed | Focused PR-1 migration suite passed | Kept migration assertions as the safety net for projection + trigger work |
| 1.2 | Same PR-1 migration test specified the SQL before implementation | SQL landed and tests passed | Final SQL stayed hand-authored after snapshot generation |
| 1.3 | Schema rename fallout was captured by migration + gateway tests first | Focused PR-1 suite + typecheck passed | Consumer rename kept bounded to `branch`→`local` callers |
| 1.4 | Snapshot/journal expectations existed before metadata refresh | Snapshot + journal recorded and verified | No behavioral refactor beyond metadata alignment |
| 1.5 | Existing gateway tests exposed rename fallout first | All affected PR-1 gateway tests passed | Kept rename changes codemod-style and feature-local |
| 1.6 | PR-1 RED was the missing `0016` migration | Final PR-1 green run passed | Historical migration suite stabilized around the new latest migration |
| 1.7 | `scope-nodes-parity.test.ts` failed before projection existed | Parity test passed after trigger/backfill work | Preserved a dedicated parity invariant instead of folding it into broader tests |
| 2.1 | `migration-0017-role-assignment-scope-fk.test.ts` failed before `0017` existed | Corrected migration test now passes in the focused rerun | Kept quarantine/audit/live-delete in one migration-focused suite |
| 2.2 | Same `0017` migration test specified company/local backfill + quarantine rules first | Corrected SQL passed focused verification and runtime migration | Refactor kept the migration hand-authored while updating the uniqueness/index contract |
| 2.3 | Schema/table expectations failed before `scope_node_id`/`stale_role_assignments` alignment | Focused tests + focused typecheck passed | Current schema now matches canonical string company scope IDs |
| 2.4 | `drizzle-scope-resolver.test.ts` failed before the recursive lineage contract existed | Focused resolver test passed | Company lineage now flows through the same recursive reader with canonical string IDs |
| 2.5 | Resolver contract was specified before implementation | Focused resolver + gateway tests passed | Removed special-case company-null behavior and kept one lineage strategy |
| 2.6 | Effective-permissions integration was asserted before final wiring | Focused gateway/use-case tests passed | Contract now stays consistent from assignment storage to lineage evaluation |

## Files Changed in This Correction Rerun
- `apps/api/src/db/migrations/0013_daily_clint_barton.sql`
- `apps/api/src/db/migrations/0014_roles_management.sql`
- `apps/api/src/db/migrations/0016_canonical_scope_nodes.sql`
- `apps/api/src/db/migrations/0017_role_assignment_scope_fk.sql`
- `apps/api/src/db/migrations/__tests__/migration-0017-role-assignment-scope-fk.test.ts`
- `apps/api/src/db/migrations/meta/0017_snapshot.json`
- `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.ts`
- `apps/api/src/features/companies/infrastructure/drizzle-company.gateway.test.ts`
- `apps/api/src/features/roles-management/domain/assignments.ts`
- `apps/api/src/features/roles-management/domain/permissions.ts`
- `apps/api/src/features/roles-management/domain/roles.ts`
- `apps/api/src/features/roles-management/application/current-context.ts`
- `apps/api/src/features/roles-management/application/compute-effective-permissions.ts`
- `apps/api/src/features/roles-management/application/scope-matcher.ts`
- `apps/api/src/features/roles-management/infrastructure/scope-node-id.ts`
- `apps/api/src/features/roles-management/infrastructure/drizzle-assignments.gateway.ts`
- `apps/api/src/features/roles-management/infrastructure/drizzle-roles.gateway.ts`
- `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.ts`
- `apps/api/src/features/roles-management/infrastructure/drizzle-scope-resolver.test.ts`
- `apps/api/src/shared/infrastructure/db/schema.ts`
- `openspec/changes/canonical-org-rbac-hierarchy/apply-progress.md`

## Files Changed in This PR-2 Closure Continuation
- `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.ts`
- `apps/api/src/features/identity/infrastructure/drizzle-auth.gateway.test.ts`
- `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts`
- `apps/api/src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts`
- `openspec/changes/canonical-org-rbac-hierarchy/apply-progress.md`

## Remaining Tasks
- [ ] 3.1 RED `migration-0018-session-active-scope.test.ts`
- [ ] 3.2 Author `0018_session_active_scope.sql`
- [ ] 3.3 `identity/domain/auth.ts`: `activeScope: ScopeRef | null`; rename gateway methods.
- [ ] 3.4 `resolve-auth-session.ts`: resolve `activeScope` lazily; thread ref.
- [ ] 3.5 `drizzle-auth.gateway.ts` + tests: new methods.
- [ ] 3.6 Rename `/auth/me/active-local`→`/auth/me/active-scope`; body `ScopeRef`; handler rename.
- [ ] 3.7 `apps/web/.../auth/domain/auth.ts`: `AuthSession.activeScope: ScopeRef | null`.
- [ ] 3.8 Web `auth/{infra,presentation}/*`: `switchActiveScope` posts `ScopeRef`; `Sucursales` preserved.
- [ ] 3.9 GREEN: api+web `auth/` + Playwright switcher; typecheck.
- [ ] 4.1 RED: scope-parent-conflict fixtures in areas/warehouses/POS use-case tests.
- [ ] 4.2 Add `ScopeParentConflictError` (`SCOPE_PARENT_CONFLICT`); map to 400.
- [ ] 4.3 `*.zod.ts` areas/warehouses/POS: XOR on `localId`/`divisionId` and `localId`/`areaId`.
- [ ] 4.4 Update create/update use cases to surface error.
- [ ] 4.5 Web forms: render error; disable save on conflict.
- [ ] 4.6 GREEN: tests; `test:coverage` ≥80%; `pnpm build` green.
