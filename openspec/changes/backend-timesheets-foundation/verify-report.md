```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:411489db050249137a6485f9e9377d609eec4d5abcffdfedf9a996d55e425c5a
verdict: fail
blockers: 1
critical_findings: 1
requirements: 5/5
scenarios: 10/10
test_command: pnpm --filter api test
test_exit_code: 0
test_output_hash: sha256:0ed7c6643cb79f253f10d98bb671412ef2edafd7f8a9cb767fdc145c22caf5d9
build_command: pnpm --filter api build
build_exit_code: 2
build_output_hash: sha256:5c8d1ab45a7e169a7be1d9c35a994baaee9ed38587188a291537cf12e7b4704f
```

## Verification Report

**Change**: backend-timesheets-foundation  
**Version**: hr-timesheets delta  
**Mode**: Strict TDD

### Canonical Verification Evidence

```text
focused_test_command=pnpm --filter api test
focused_test_exit_code=0
focused_test_output_hash=sha256:0ed7c6643cb79f253f10d98bb671412ef2edafd7f8a9cb767fdc145c22caf5d9
coverage_command=pnpm --filter api test:coverage
coverage_exit_code=0
coverage_output_hash=sha256:87a0f3dd42e6d75e679a62bc90e47ab391c066abffad1537c92ca027f3107385
lint_command=pnpm --filter api lint
lint_exit_code=0
lint_output_hash=sha256:5d34889c1e3b860978c69e5a6af0a5fb0b4079c8719c04e0a24d56302306dc05
typecheck_command=pnpm --filter api typecheck
typecheck_exit_code=2
typecheck_output_hash=sha256:5b309e224c669da951ab4eef41a2be0f96b3b757b87e7f582238cc21d3b79aee
build_command=pnpm --filter api build
build_exit_code=2
build_output_hash=sha256:5c8d1ab45a7e169a7be1d9c35a994baaee9ed38587188a291537cf12e7b4704f
requirements=5/5
scenarios=10/10
tasks=26/26
apply_progress_observation=1301
runtime_attempt_token=sha256:5810321dd0232d6e702f0107a53e3a42aca8eda47256173cb853f38725a58cdb
```

### Completeness

| Metric | Value |
|---|---:|
| Tasks total | 26 |
| Tasks complete | 26 |
| Tasks incomplete | 0 |
| Remediation tasks | R1, R2, and R3 complete |
| Full verification gate | Open; all implementation tasks are complete |

### Build & Tests Execution

**Build**: ❌ Exit 2; three known unrelated baseline TypeScript errors only.

```text
Command: pnpm --filter api build
Exit: 2
Hash: sha256:5c8d1ab45a7e169a7be1d9c35a994baaee9ed38587188a291537cf12e7b4704f
Errors: src/features/org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts:1003, 1227, 1421
Changed timesheet, create-app, and error-middleware files do not appear in build output.
```

**Tests**: ✅ 464 passed / 0 failed / 0 skipped.

```text
Command: pnpm --filter api test
Exit: 0
Hash: sha256:0ed7c6643cb79f253f10d98bb671412ef2edafd7f8a9cb767fdc145c22caf5d9
Result: 96 test files passed; 464 tests passed.
Relevant runtime evidence includes migration-0026 (4), Drizzle timesheets gateway (5), timesheets router (5), application lifecycle and entry tests, and error middleware (13).
```

**Coverage**: ✅ Exit 0; aggregate V8 coverage is 89.01% lines, 83.55% branches, and 97.43% functions; configured line threshold is 80%.

```text
Command: pnpm --filter api test:coverage
Exit: 0
Hash: sha256:87a0f3dd42e6d75e679a62bc90e47ab391c066abffad1537c92ca027f3107385
Result: 96 test files passed; 464 tests passed; aggregate lines 89.01%.
Changed-file coverage is unavailable because apps/api/vitest.config.ts includes only identity, companies, and admin paths; hr-timesheets and the changed app/middleware paths are excluded.
```

**Lint**: ✅ Exit 0; full API lint is clean, including the remediated changed timesheet files.

```text
Command: pnpm --filter api lint
Exit: 0
Hash: sha256:5d34889c1e3b860978c69e5a6af0a5fb0b4079c8719c04e0a24d56302306dc05
```

**Type checker**: ⚠️ Exit 2; unchanged baseline errors only.

```text
Command: pnpm --filter api typecheck
Exit: 2
Hash: sha256:5b309e224c669da951ab4eef41a2be0f96b3b757b87e7f582238cc21d3b79aee
Error files: identity/application/register.test.ts; items/presentation/item.route.test.ts; node-management/application/accept-node-management-invitation.test.ts; org-hierarchy/application/delete-area.test.ts; org-hierarchy/application/hierarchy-parent-invariants.test.ts; org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.test.ts; org-hierarchy/infrastructure/drizzle-org-hierarchy.gateway.ts.
No changed timesheet, create-app, or error-middleware file reports a type error.
```

### Spec Compliance Matrix

| Requirement | Scenario | Covering test / evidence | Result |
|---|---|---|---|
| Timesheet lifecycle and draft-only mutation | Rejected period is reopened for correction | `application/__tests__/reopen-period.test.ts` — rejected period returns to draft; gateway and router lifecycle paths also passed | ✅ COMPLIANT |
| Timesheet lifecycle and draft-only mutation | Locked period rejects mutation | `application/__tests__/patch-period.test.ts` plus locked entry add/update/remove tests; full suite passed | ✅ COMPLIANT |
| Submit snapshot and approval guards | Submit resolves policy automatically | `application/__tests__/submit-period.test.ts` matched/null policy cases plus atomic gateway test; router submit body is ignored | ✅ COMPLIANT |
| Submit snapshot and approval guards | Self-approval is denied | `application/__tests__/approve-period.test.ts` plus router 409 path | ✅ COMPLIANT |
| Entry validation and in-period enforcement | Entry inside the period is accepted | `application/__tests__/entries/add-entry.test.ts` valid entry case plus gateway mapping test | ✅ COMPLIANT |
| Entry validation and in-period enforcement | Entry outside the period is rejected | `application/__tests__/entries/add-entry.test.ts` out-of-range case plus router 400 path | ✅ COMPLIANT |
| Auth-scoped timesheet visibility | Direct-report period is visible | `application/__tests__/list-periods.test.ts` and router self/direct-report scope assertions | ✅ COMPLIANT |
| Auth-scoped timesheet visibility | Out-of-scope period is hidden | `application/__tests__/get-period.test.ts` and router 404 path | ✅ COMPLIANT |
| Permission seeds, migration proof, and scope boundary | Migration test proves DB contract | `src/db/migrations/__tests__/migration-0026-timesheets.test.ts`; 4 real-PostgreSQL tests passed for enums, pair checks, hour bounds, overlap, and tenant references | ✅ COMPLIANT |
| Permission seeds, migration proof, and scope boundary | Scope boundary permits backend only | Static changed-path review found backend/API, OpenSpec, and tests only; no frontend, schema, or migration change | ✅ COMPLIANT (static review) |

**Compliance summary**: 10/10 scenarios compliant. The scope-boundary scenario is an affected-artifact review by definition; runtime tests cover the backend behavior.

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|---|---|---|
| Lifecycle, reopen, draft-only mutation, and no period delete | ✅ Implemented | Domain guards and use cases enforce the lifecycle and draft-only mutation; no period-delete route or gateway operation exists. |
| Submit policy snapshot and body exclusion | ✅ Implemented | Submit route does not parse a body override; the gateway locks and reloads the period and active assignment before one submitted-state update with matched/null policy id. |
| Self-approval and rejection reason | ✅ Implemented | Domain guards reject same submitter/approver and blank reasons; middleware maps the errors and tests passed. |
| Entry hours and period date | ✅ Implemented | Zod and domain enforce positive hours through 24 and inclusive period dates; the gateway preserves dates and maps numeric hours. |
| Auth-scoped visibility | ✅ Implemented | Composition-root scope resolution is limited to self and direct reports; company-wide and node-descendant fallbacks are absent; out-of-scope reads map to not-found. |
| Gateway mapping, tenant scope, and DB error translation | ✅ Implemented | Composite tenant predicates, assignment joins, `23P01` overlap translation, and named `23505` entry-conflict translation passed real PostgreSQL tests. |
| Permissions, error mappings, router, and app wiring | ✅ Implemented | Four HR timesheet permission keys, 11 guarded endpoints, ten error mappings, and createApp wiring are covered by tests. |
| Scope boundary | ✅ Implemented | No frontend, schema, or migration path is part of the timesheet change. The `.atl/skill-registry.md` edit is pre-existing and excluded. |

### Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| State machine in application layer | ✅ Yes | Application use cases call domain transition and draft guards. |
| Submit resolves policy without request-body override | ✅ Yes | Submit body is ignored and policy resolution receives the locked row's current assignment scope. |
| Submit transaction with row lock | ⚠️ Mostly | Gateway uses `db.transaction`, `FOR UPDATE`, assignment reload, and one update. The default approval-policy adapter closes over the outer `db`, so same-transaction enlistment is not proven by source or tests. |
| Period dates remain strings and DB numeric hours map to number | ✅ Yes | Gateway preserves date strings and calls `Number(row.hours)`. |
| `23P01` and named entry `23505` translation | ✅ Yes | SQLSTATE and deterministic constraint names are checked and integration-tested. |
| Visibility only self/direct_reports | ✅ Yes | The resolver has no company or node-descendant fallback. |
| Timesheets gateway owns assignment lookup | ✅ Yes | Use cases depend only on the timesheet gateway port. |
| Vertical-slice Clean Architecture | ✅ Yes | Domain/application/infrastructure/presentation boundaries are preserved; controllers do not query Drizzle directly. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD Evidence reported | ✅ | `apply-progress.md` contains original S1/S2/S3 evidence plus R1/R2/R3 remediation evidence. |
| All implementation tasks have tests | ✅ | 26 ledger tasks are complete; R1 is artifact-only and R2/R3 include runtime evidence. |
| RED confirmed (tests exist) | ✅ | All 15 changed/created runtime test files named by apply-progress exist. |
| GREEN confirmed (tests pass) | ✅ | Current full execution passed 96 files and 464 tests, including all changed timesheet and middleware paths. |
| Triangulation adequate | ✅ | Behaviors use distinct happy, invalid, locked, tenant, conflict, and lifecycle cases across unit, integration, and API layers. |
| Safety net for modified files | ✅ | Apply evidence records focused safety nets; current full test and lint reruns are green. The unrelated `.atl/skill-registry.md` edit remains outside scope. |

**TDD Compliance**: 6/6 checks passed.

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|---|---:|---:|---|
| Unit | 35 | 12 | Vitest; domain and application use cases |
| Integration | 18 | 2 | Vitest; real PostgreSQL gateway and Supertest middleware |
| E2E/API | 5 | 1 | Vitest + Supertest + createApp |
| **Total** | **58** | **15** | All changed/created runtime test files executed in the passing full suite |

### Changed File Coverage

Coverage analysis for changed files is unavailable: `apps/api/vitest.config.ts` includes only identity, companies, and admin source paths, excluding hr-timesheets, create-app, and error middleware. The configured aggregate V8 result is 89.01% lines and is not presented as changed-file coverage.

### Assertion Quality

✅ All inspected assertions exercise production code and verify behavior. No tautologies, ghost loops, assertion-free tests, smoke-test-only tests, or unpaired empty-array assertions were found. Type-only checks are paired with value assertions or behavior checks; real PostgreSQL tests assert persisted mappings and translated errors.

### Quality Metrics

**Linter**: ✅ No errors; full API lint exit 0.  
**Type Checker**: ⚠️ Exit 2 across the known unrelated seven-file baseline only; no changed-slice errors.  
**Build**: ⚠️ Exit 2 across the known unrelated three-error org-hierarchy baseline only; no changed-slice errors.

### Issues Found

**CRITICAL**:

1. The authoritative build command exits 2, so native archive readiness cannot be certified. All three errors are the known unrelated `org-hierarchy` baseline; this does not indicate a changed timesheet-slice build failure.

**WARNING**:

1. The known seven-file typecheck baseline remains nonzero outside the changed slice.
2. Changed-file coverage is not measurable under the current V8 include list.
3. The default approval-policy adapter queries through the outer `db` from inside the submit transaction callback; transaction enlistment is not independently proven.
4. A pre-existing `.atl/skill-registry.md` working-tree modification remains outside the change and must stay excluded from any commit.

**SUGGESTION**:

1. Add hr-timesheets, create-app, and error-middleware paths to the coverage include list if changed-file coverage is required.
2. Add an application-level non-finite-hours test and guard so `NaN` cannot bypass the numeric bounds predicate.
3. Introduce a transaction-aware approval-policy lookup port or transaction executor and add a concurrency test proving policy lookup and snapshot update share one transaction.

### Verdict

**FAIL — BASELINE BUILD GATE** — all 26 tasks, 5 requirements, and 10 scenarios are complete; tests, coverage, and lint pass, and no changed-slice build/typecheck errors appear. The authoritative API build remains nonzero on unrelated baseline errors, which keeps the native verification/archive gate blocked.
